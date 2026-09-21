import { randomUUID } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import { serializeSignedCookie } from "better-call";
import { expect, request, test, type APIRequestContext } from "@playwright/test";
import { getDb } from "../../src/db";
import {
  courses, memberships, privateMediaAssets, session, studentEnrollments,
  supervisionEvents, supervisionGrants, user, verifiedEntities,
} from "../../src/db/schema";

test.describe.configure({ mode: "serial" });

test.describe("free enrollment and private video access must stay course-scoped", () => {
  const db = getDb();
  const users = {
    admin: randomUUID(), provider: randomUUID(), institute: randomUUID(),
    student: randomUUID(), otherStudent: randomUUID(), stranger: randomUUID(),
  };
  const tokens = Object.fromEntries(
    Object.keys(users).map((name) => [name, randomUUID()]),
  ) as Record<keyof typeof users, string>;
  const providerId = randomUUID();
  const instituteId = randomUUID();
  const ids = { live: randomUUID(), pending: randomUUID(), draft: randomUUID() };
  const videoIds = {
    ready: randomUUID(), withdrawn: randomUUID(), pending: randomUUID(),
  };
  const mediaPath = (courseId: string, assetId: string) =>
    `/api/student/courses/${courseId}/media/${assetId}`;
  const listAssets = (courseId: string) =>
    `/api/student/courses/${courseId}/assets`;
  const enrollPath = (courseId: string) =>
    `/api/student/courses/${courseId}/enroll`;
  const decisionPath = (courseId: string) =>
    `/api/institute/supervision/${courseId}/decision`;

  async function signed(as: keyof typeof users): Promise<string> {
    const text = await serializeSignedCookie(
      "better-auth.session_token", tokens[as], process.env.BETTER_AUTH_SECRET!,
    );
    return text.split(";")[0];
  }
  async function client(as?: keyof typeof users): Promise<APIRequestContext> {
    return request.newContext({
      baseURL: "http://localhost:3000",
      extraHTTPHeaders: as ? { Cookie: await signed(as) } : {},
    });
  }
  const post = (ctx: APIRequestContext, path: string, data: object) =>
    ctx.post(path, { data, headers: { Origin: "http://localhost:3000" } });

  test.beforeAll(async () => {
    await db.insert(user).values(Object.entries(users).map(([name, id]) => ({
      id, name, email: `${id}@example.test`,
    })));
    await db.insert(verifiedEntities).values([
      { id: providerId, role: "provider", name: "verified provider",
        evidenceReference: "test/provider", verifiedByUserId: users.admin },
      { id: instituteId, role: "institute", name: "verified institute",
        evidenceReference: "test/institute", verifiedByUserId: users.admin },
    ]);
    await db.insert(memberships).values([
      { userId: users.admin, role: "admin" },
      { userId: users.provider, role: "provider", providerId },
      { userId: users.institute, role: "institute", instituteId },
      { userId: users.student, role: "student" },
      { userId: users.otherStudent, role: "student" },
    ]);
    const expiresAt = new Date(Date.now() + 3_600_000);
    await db.insert(session).values(
      Object.entries(tokens).map(([name, token]) => ({
        userId: users[name as keyof typeof users], token, expiresAt,
      })),
    );
    await db.insert(courses).values([
      { id: ids.live, providerId, responsibleInstituteId: instituteId,
        title: "دوره رایگان با محتوای خصوصی", createdByProviderUserId: users.provider,
        clientRequestId: randomUUID() },
      { id: ids.pending, providerId, responsibleInstituteId: instituteId,
        title: "دوره بدون تایید مؤسسه", createdByProviderUserId: users.provider,
        clientRequestId: randomUUID() },
      { id: ids.draft, providerId, responsibleInstituteId: instituteId,
        title: "دوره تاییدشده اما منتشرنشده", createdByProviderUserId: users.provider,
        clientRequestId: randomUUID() },
    ]);
    await db.insert(supervisionGrants).values([
      ...[ids.live, ids.draft].map((courseId) => ({
        courseId, providerId, instituteId, status: "approved" as const,
        requestedByProviderUserId: users.provider,
        approvedByInstituteUserId: users.institute, approvedAt: new Date(),
      })),
      { courseId: ids.pending, providerId, instituteId, status: "requested",
        requestedByProviderUserId: users.provider },
    ]);
    await db.insert(privateMediaAssets).values([
      { id: videoIds.ready, courseId: ids.live, title: "بخش اول دوره",
        objectKey: `${ids.live}/${videoIds.ready}.mp4` },
      { id: videoIds.withdrawn, courseId: ids.live, title: "ویدئوی حذف‌شده",
        status: "withdrawn",
        objectKey: `${ids.live}/${videoIds.withdrawn}.mp4` },
      { id: videoIds.pending, courseId: ids.pending, title: "بخش محرمانه",
        objectKey: `${ids.pending}/${videoIds.pending}.mp4` },
    ]);
  });

  test.afterAll(async () => {
    await db.delete(privateMediaAssets).where(
      inArray(privateMediaAssets.courseId, Object.values(ids)));
    await db.delete(studentEnrollments).where(
      inArray(studentEnrollments.courseId, Object.values(ids)));
    await db.delete(supervisionEvents).where(
      inArray(supervisionEvents.courseId, Object.values(ids)));
    await db.delete(supervisionGrants).where(
      inArray(supervisionGrants.courseId, Object.values(ids)));
    await db.delete(courses).where(inArray(courses.id, Object.values(ids)));
    await db.delete(memberships).where(
      inArray(memberships.userId, Object.values(users)));
    await db.delete(verifiedEntities).where(
      inArray(verifiedEntities.id, [providerId, instituteId]));
    await db.delete(user).where(inArray(user.id, Object.values(users)));
  });

  test("draft or merely requested courses never enter the free catalog", async () => {
    const anonymous = await client();
    expect((await anonymous.get("/api/student/courses")).status()).toBe(401);
    expect((await anonymous.get(listAssets(ids.live))).status()).toBe(401);
    expect((await anonymous.get(mediaPath(ids.live, videoIds.ready))).status()).toBe(401);
    expect((await post(anonymous, enrollPath(ids.live), {})).status()).toBe(401);
    await anonymous.dispose();

    const provider = await client("provider");
    expect((await provider.get("/api/student/courses")).status()).toBe(403);
    expect((await post(provider, enrollPath(ids.live), {})).status()).toBe(403);
    expect((await provider.get(mediaPath(ids.live, videoIds.ready))).status()).toBe(404);
    expect((await post(provider, `/api/provider/courses/${ids.pending}/publication`,
      { action: "publish" })).status()).toBe(404);
    expect((await provider.post(
      `/api/provider/courses/${ids.live}/publication`, {
        data: { action: "publish" }, headers: { Origin: "https://attacker.invalid" },
      },
    )).status()).toBe(403);
    expect((await post(provider, `/api/provider/courses/${ids.live}/publication`,
      { action: "publish", status: "approved" })).status()).toBe(400);
    const first = await post(provider,
      `/api/provider/courses/${ids.live}/publication`, { action: "publish" });
    expect(first.status()).toBe(200);
    expect(await first.json()).toEqual({
      courseId: ids.live, publicationStatus: "published", replayed: false,
    });
    const retry = await post(provider,
      `/api/provider/courses/${ids.live}/publication`, { action: "publish" });
    expect((await retry.json()).replayed).toBe(true);
    await provider.dispose();

    const student = await client("student");
    const listing = await student.get("/api/student/courses");
    expect(listing.headers()["cache-control"]).toContain("no-store");
    expect((await listing.json()).courses).toEqual([
      { courseId: ids.live, title: "دوره رایگان با محتوای خصوصی",
        providerId, responsibleInstituteId: instituteId,
        enrolled: false, free: true },
    ]);
    expect((await student.get(listAssets(ids.live))).status()).toBe(404);
    expect((await student.get(mediaPath(ids.live, videoIds.ready))).status()).toBe(404);
    expect((await post(student, enrollPath(ids.pending), {})).status()).toBe(404);
    expect((await post(student, enrollPath(ids.draft), {})).status()).toBe(404);
    await student.dispose();
  });

  test("one free enrollment unlocks metadata and proxy bytes but never shares origin keys", async () => {
    const student = await client("student");
    expect((await post(student, enrollPath(ids.live), {
      role: "admin",
    })).status()).toBe(400);
    expect((await student.post(enrollPath(ids.live), {
      data: {}, headers: { Origin: "https://attacker.invalid" },
    })).status()).toBe(403);
    const first = await post(student, enrollPath(ids.live), {});
    expect(first.status()).toBe(201);
    expect(await first.json()).toEqual({
      courseId: ids.live, enrolled: true, replayed: false, free: true,
    });
    const retry = await post(student, enrollPath(ids.live), {});
    expect(retry.status()).toBe(200);
    expect((await retry.json()).replayed).toBe(true);
    const existing = await db.select().from(studentEnrollments).where(and(
      eq(studentEnrollments.courseId, ids.live),
      eq(studentEnrollments.studentUserId, users.student),
    ));
    expect(existing).toHaveLength(1);
    const manifest = await student.get(listAssets(ids.live));
    expect(manifest.status()).toBe(200);
    const manifestText = await manifest.text();
    expect(manifestText).not.toContain("objectKey");
    expect(manifestText).not.toContain("private/");
    expect(manifestText).not.toContain(videoIds.withdrawn);
    expect(manifestText).toContain(videoIds.ready);
    expect((await student.get(listAssets(ids.pending))).status()).toBe(404);
    expect((await student.get(mediaPath(ids.live, videoIds.withdrawn))).status()).toBe(404);
    expect((await student.get(mediaPath(ids.pending, videoIds.pending))).status()).toBe(404);
    expect((await student.get(mediaPath(ids.live, videoIds.pending))).status()).toBe(404);
    expect((await student.get(mediaPath(ids.live, randomUUID()))).status()).toBe(404);

    const full = await student.get(mediaPath(ids.live, videoIds.ready));
    expect(full.status()).toBe(200);
    expect(full.headers()["content-type"]).toContain("video/mp4");
    expect(full.headers()["cache-control"]).toContain("no-store");
    expect(full.headers()["cross-origin-resource-policy"]).toBe("same-origin");
    expect(full.headers()["set-cookie"]).toBeUndefined();
    expect(full.headers()["location"]).toBeUndefined();
    expect((await full.body()).length).toBeGreaterThan(0);
    const partial = await student.get(mediaPath(ids.live, videoIds.ready), {
      headers: { Range: "bytes=0-3" },
    });
    expect(partial.status()).toBe(206);
    expect(partial.headers()["content-range"]).toMatch(/^bytes 0-3\/\d+$/);
    expect((await partial.body()).length).toBe(4);
    expect((await student.get(mediaPath(ids.live, videoIds.ready), {
      headers: { Range: "bytes=0-3,6-8" },
    })).status()).toBe(416);
    expect((await student.head(mediaPath(ids.live, videoIds.ready))).status()).toBe(405);

    // Storage never accepts direct/browser requests without server-only Bearer.
    const direct = await fetch(
      `http://127.0.0.1:4318/private/${ids.live}/${videoIds.ready}.mp4`,
    );
    expect(direct.status).toBe(401);
    const other = await client("otherStudent");
    expect((await other.get(mediaPath(ids.live, videoIds.ready))).status()).toBe(404);
    expect((await other.get(listAssets(ids.live))).status()).toBe(404);
    await other.dispose();
    await student.dispose();
  });

  test("real student UI enrolls, displays private URL and cancellation closes access", async ({ page }) => {
    const cookie = await signed("otherStudent");
    await page.context().addCookies([{
      name: "better-auth.session_token",
      value: cookie.split("=").slice(1).join("="),
      domain: "localhost", path: "/", httpOnly: true, secure: false,
      sameSite: "Lax",
    }]);
    await page.goto("http://localhost:3000/student/courses");
    await expect(page.getByRole("heading", {
      name: "دوره‌های رایگان منتشرشده",
    })).toBeVisible();
    await expect(page.getByText("دوره رایگان با محتوای خصوصی")).toBeVisible();
    const enrolling = page.waitForResponse((response) =>
      response.url().endsWith(enrollPath(ids.live)) &&
      response.request().method() === "POST",
    );
    await page.getByRole("button", { name: "ثبت‌نام رایگان" }).click();
    expect((await enrolling).status()).toBe(201);
    await page.getByRole("link", { name: "مشاهده محتوای دوره" }).click();
    await expect(page).toHaveURL(new RegExp(`/student/courses/${ids.live}/watch$`));
    const player = page.locator("video");
    await expect(player).toHaveCount(1);
    await expect(player).toHaveAttribute("src",
      mediaPath(ids.live, videoIds.ready));
    const other = await client("otherStudent");
    expect((await other.get(mediaPath(ids.live, videoIds.ready), {
      headers: { Range: "bytes=0-3" },
    })).status()).toBe(206);
    expect((await post(other,
      `/api/student/courses/${ids.live}/cancel`, {})).status()).toBe(200);
    expect((await other.get(mediaPath(ids.live, videoIds.ready))).status()).toBe(404);
    expect((await other.get(listAssets(ids.live))).status()).toBe(404);
    expect((await post(other, enrollPath(ids.live), {})).status()).toBe(409);
    await page.reload();
    await expect(page).toHaveURL(/\/404|\/student\/courses/);
    await other.dispose();
  });

  test("a suspended student or revoked institute supervision blocks already enrolled video", async () => {
    const student = await client("student");
    await db.update(memberships).set({ status: "suspended" })
      .where(and(eq(memberships.userId, users.student),
        eq(memberships.role, "student")));
    expect((await student.get(mediaPath(ids.live, videoIds.ready))).status()).toBe(401);
    expect((await student.get(listAssets(ids.live))).status()).toBe(401);
    expect((await post(student, enrollPath(ids.live), {})).status()).toBe(401);
    await db.update(memberships).set({ status: "active" })
      .where(and(eq(memberships.userId, users.student),
        eq(memberships.role, "student")));
    expect((await student.get(mediaPath(ids.live, videoIds.ready))).status()).toBe(200);

    // Supervision remains invalid when its *actual institute approver* or
    // course provider loses the associated active membership.
    await db.update(memberships).set({ status: "suspended" })
      .where(and(eq(memberships.userId, users.institute),
        eq(memberships.role, "institute")));
    expect((await student.get(mediaPath(ids.live, videoIds.ready))).status()).toBe(404);
    await db.update(memberships).set({ status: "active" })
      .where(and(eq(memberships.userId, users.institute),
        eq(memberships.role, "institute")));
    await db.update(memberships).set({ status: "suspended" })
      .where(and(eq(memberships.userId, users.provider),
        eq(memberships.role, "provider")));
    expect((await student.get(mediaPath(ids.live, videoIds.ready))).status()).toBe(404);
    await db.update(memberships).set({ status: "active" })
      .where(and(eq(memberships.userId, users.provider),
        eq(memberships.role, "provider")));
    expect((await student.get(mediaPath(ids.live, videoIds.ready))).status()).toBe(200);

    const institute = await client("institute");
    const revoked = await post(institute, decisionPath(ids.live), {
      action: "revoke",
      reason: "نظارت مؤسسه بر دوره پایان یافت و دسترسی محتوای آن باید قطع شود.",
    });
    expect(revoked.status()).toBe(200);
    expect((await student.get(mediaPath(ids.live, videoIds.ready))).status()).toBe(404);
    expect((await student.get(listAssets(ids.live))).status()).toBe(404);
    expect((await (await student.get("/api/student/courses")).json()).courses)
      .toHaveLength(0);
    expect((await post(student, enrollPath(ids.live), {})).status()).toBe(404);
    await institute.dispose();
    await student.dispose();
  });
});
