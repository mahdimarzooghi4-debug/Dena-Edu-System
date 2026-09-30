Warning: truncated output (original token count: 18510)
Total output lines: 1523

import { randomUUID } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import { serializeSignedCookie } from "better-call";
import { expect, request, test, type APIRequestContext } from "@playwright/test";
import { getDb } from "../../src/db";
import { getProviderDashboardCourses } from "../../src/server/provider/dashboard";
import {
  coursePracticeQuestions, courses, memberships, privateMediaAssets,
  session, studentEnrollments, studentPracticeAttempts,
  supervisionEvents, supervisionGrants, studentVideoCompletions,
  studentVideoNotes, user, verifiedEntities,
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
  const progressPath = (courseId: string, assetId: string) =>
    `${mediaPath(courseId, assetId)}/completion`;
  const notePath = (courseId: string, assetId: string) =>
    `${mediaPath(courseId, assetId)}/note`;
  const practicePath = (courseId: string) =>
    `/api/student/courses/${courseId}/practice`;
  const authorPath = (courseId: string) =>
    `/api/provider/courses/${courseId}/practice`;
  const institutePracticePath = (courseId: string) =>
    `/api/institute/courses/${courseId}/practice`;
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
    await db.delete(studentPracticeAttempts).where(inArray(
      studentPracticeAttempts.courseId, Object.values(ids),
    ));
    await db.delete(coursePracticeQuestions).where(inArray(
      coursePracticeQuestions.courseId, Object.values(ids),
    ));
    await db.delete(studentVideoNotes).where(inArray(
      studentVideoNotes.assetId, Object.values(videoIds),
    ));
    await db.delete(studentVideoCompletions).where(inArray(
      studentVideoCompletions.assetId, Object.values(videoIds),
    ));
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

  test("draft or merely requested courses never enter the free catalog", async ({ page }) => {
    const anonymous = await client();
    expect((await anonymous.get("/api/student/courses")).status()).toBe(401);
    expect((await anonymous.get("/api/student/progress")).status()).toBe(401);
    expect((await anonymous.get(practicePath(ids.live))).status()).toBe(401);
    expect((await post(anonymous, practicePath(ids.live), {
      selectedOption: 0,
    })).status()).toBe(401);
    expect((await post(anonymous, authorPath(ids.live), {
      prompt: "سؤال کوتاه آزمایشی", options: ["یک", "دو", "سه", "چهار"],
      correctOption: 0,
    })).status()).toBe(401);
    const noSessionProgress = await anonymous.get("/student/progress", {
      maxRedirects: 0,
    });
    expect(noSessionProgress.status()).toBe(307);
    expect(noSessionProgress.headers().location).toBe("/login");
    const anonymousHome = await anonymous.get("/student", { maxRedirects: 0 });
    expect(anonymousHome.status()).toBe(307);
    expect(anonymousHome.headers().location).toBe("/login");
    expect((await anonymous.get(listAssets(ids.live))).status()).toBe(401);
    expect((await anonymous.get(mediaPath(ids.live, videoIds.ready))).status()).toBe(401);
    expect((await post(anonymous, progressPath(ids.live, videoIds.ready), {})).status())
      .toBe(401);
    expect((await anonymous.put(notePath(ids.live, videoIds.ready), {
      data: { note: "private" },
      headers: { Origin: "http://localhost:3000" },
    })).status()).toBe(401);
    expect((await post(anonymous, enrollPath(ids.live), {})).status()).toBe(401);
    await anonymous.dispose();

    const provider = await client("provider");
    expect((await provider.get("/api/student/courses")).status()).toBe(403);
    expect((await provider.get("/student")).status()).toBe(404);
    expect((await provider.get("/student/progress")).status()).toBe(404);
    expect((await provider.get("/api/student/progress")).status()).toBe(403);
    expect((await provider.get(practicePath(ids.live))).status()).toBe(403);
    expect((await post(provider, enrollPath(ids.live), {})).status()).toBe(403);
    expect((await provider.get(mediaPath(ids.live, videoIds.ready))).status()).toBe(404);
    expect((await post(provider, progressPath(ids.live, videoIds.ready), {})).status())
      .toBe(403);
    expect((await provider.put(notePath(ids.live, videoIds.ready), {
      data: { note: "foreign" },
      headers: { Origin: "http://localhost:3000" },
    })).status()).toBe(403);
    expect((await post(provider, `/api/provider/courses/${ids.pending}/publication`,
      { action: "publish" })).status()).toBe(404);
    expect((await post(provider, `/api/provider/courses/${ids.draft}/publication`,
      { action: "publish" })).status()).toBe(404); // no ready video
    expect((await provider.post(
      `/api/provider/courses/${ids.live}/publication`, {
        data: { action: "publish" }, headers: { Origin: "https://attacker.invalid" },
      },
    …13510 tokens truncated…it student.put(notePath(ids.live, videoIds.ready), {
      data: { note: "پس از برداشتن ویدئو" },
      headers: { Origin: "http://localhost:3000" },
    })).status()).toBe(404);
    expect((await (await student.get("/api/student/progress")).json())
      .courses).toHaveLength(0);
    expect((await student.get(mediaPath(ids.live, videoIds.ready))).status()).toBe(404);
    expect((await post(student, progressPath(ids.live, videoIds.ready), {})).status())
      .toBe(404);
    expect(((await (await student.get("/api/student/courses")).json())
      .courses as Array<{ courseId: string }>).filter((row) =>
        (Object.values(ids) as string[]).includes(row.courseId))).toHaveLength(0);
    expect((await post(student, enrollPath(ids.live), {})).status()).toBe(404);
    await db.update(privateMediaAssets).set({ status: "ready" })
      .where(eq(privateMediaAssets.id, videoIds.ready));
    expect((await student.get(mediaPath(ids.live, videoIds.ready))).status()).toBe(200);
    expect((await (await student.get("/api/student/progress")).json())
      .displayedMarkedVideos).toBe(1);
    expect((await (await student.get(listAssets(ids.live))).json())
      .assets[0].note).toBe("یادداشت فقط در دوره مجاز");
    expect((await (await student.get(practicePath(ids.live))).json())
      .practice.attempt).toMatchObject({
        selectedOption: 1, correct: false,
      });

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
    expect((await student.get(`/api/student/courses/${ids.live}`)).status())
      .toBe(404);
    expect((await student.get(`/student/courses/${ids.live}`)).status())
      .toBe(404);
    expect((await student.get(listAssets(ids.live))).status()).toBe(404);
    expect((await student.get(practicePath(ids.live))).status()).toBe(404);
    expect((await post(student, practicePath(ids.live), {
      selectedOption: 2,
    })).status()).toBe(404);
    expect((await student.put(notePath(ids.live, videoIds.ready), {
      data: { note: "پس از لغو نظارت" },
      headers: { Origin: "http://localhost:3000" },
    })).status()).toBe(404);
    expect((await (await student.get("/api/student/progress")).json())
      .courses).toHaveLength(0);
    expect(await (await student.get("/student/progress")).text()).not.toContain(
      "دوره رایگان با محتوای خصوصی",
    );
    expect((await post(student, progressPath(ids.live, videoIds.ready), {})).status())
      .toBe(404);
    const revokedDashboard = await student.get("/student");
    expect(revokedDashboard.status()).toBe(200);
    expect(await revokedDashboard.text()).not.toContain(
      `/student/courses/${ids.live}/watch`,
    );
    expect(((await (await student.get("/api/student/courses")).json())
      .courses as Array<{ courseId: string }>).filter((row) =>
        (Object.values(ids) as string[]).includes(row.courseId))).toHaveLength(0);
    expect((await post(student, enrollPath(ids.live), {})).status()).toBe(404);
    await institute.dispose();
    await student.dispose();
  });
  test("student can erase own retained notes after revoked supervision and cancelled enrollment", async ({ page }) => {
    const apiPath = "/api/student/private-notes";
    const origin = { Origin: "http://localhost:3000" };
    const confirmation = { confirm: "DELETE_ALL_MY_VIDEO_NOTES" };
    const anonymous = await client();
    const provider = await client("provider");
    const student = await client("student");
    const other = await client("otherStudent");

    expect((await anonymous.get(apiPath)).status()).toBe(401);
    expect((await anonymous.delete(apiPath, {
      data: confirmation, headers: origin,
    })).status()).toBe(401);
    expect((await provider.get(apiPath)).status()).toBe(403);
    expect((await provider.delete(apiPath, {
      data: confirmation, headers: origin,
    })).status()).toBe(403);
    expect((await provider.get("/student/privacy")).status()).toBe(404);

    const ownCount = await student.get(apiPath);
    expect(ownCount.status()).toBe(200);
    expect(ownCount.headers()["cache-control"]).toContain("private");
    expect(await ownCount.json()).toEqual({ noteCount: 1 });
    expect((await other.get(apiPath)).status()).toBe(200);
    expect(await (await other.get(apiPath)).json()).toEqual({ noteCount: 1 });

    const privacyHtml = await (await student.get("/student/privacy")).text();
    expect(privacyHtml).toContain("مدیریت و پاک‌کردن یادداشت‌های ویدئویی");
    expect(privacyHtml).not.toContain("یادداشت فقط در دوره مجاز");
    expect(privacyHtml).not.toContain(videoIds.ready);
    expect(privacyHtml).not.toContain("یادداشت در زمان دسترسی");

    for (const data of [
      {}, { confirm: "DELETE_ALL_MY_VIDEO_NOTES", userId: users.otherStudent },
      { confirm: "no" },
    ]) {
      expect((await student.delete(apiPath, {
        data, headers: origin,
      })).status()).toBe(400);
    }
    expect((await student.delete(apiPath, {
      data: confirmation,
      headers: { Origin: "https://attacker.invalid" },
    })).status()).toBe(403);
    expect(await (await student.get(apiPath)).json()).toEqual({ noteCount: 1 });

    const cookie = await signed("student");
    await page.context().addCookies([{
      name: "better-auth.session_token",
      value: cookie.split("=").slice(1).join("="),
      domain: "localhost", path: "/", httpOnly: true, secure: false,
      sameSite: "Lax",
    }]);
    await page.goto("http://localhost:3000/student");
    await page.getByRole("link", { name: "مدیریت یادداشت‌های شخصی" }).click();
    await expect(page).toHaveURL(/\/student\/privacy$/);
    await expect(page.getByRole("heading", {
      name: "پاک‌کردن همهٔ یادداشت‌های شخصی",
    })).toBeVisible();
    const confirmButton = page.getByRole("button", {
      name: "حذف همه یادداشت‌ها",
    });
    const input = page.getByRole("textbox", {
      name: "برای تأیید، عبارت «حذف همه یادداشت‌ها» را دقیقاً وارد کن",
    });
    await expect(confirmButton).toBeDisabled();
    await input.fill("حذف یادداشت");
    await expect(confirmButton).toBeDisabled();
    await input.fill("حذف همه یادداشت‌ها");
    await expect(confirmButton).toBeEnabled();
    const deletedResponse = page.waitForResponse((response) =>
      response.url().endsWith(apiPath) &&
      response.request().method() === "DELETE",
    );
    await confirmButton.click();
    const deleted = await deletedResponse;
    expect(deleted.status()).toBe(200);
    expect(await deleted.json()).toEqual({ deleted: 1, noteCount: 0 });
    await expect(page.getByText(
      "یادداشت ویدئویی ذخیره‌شده‌ای برای پاک‌کردن باقی نمانده است.",
    )).toBeVisible();
    await page.reload();
    await expect(page.getByText(
      "یادداشت ویدئویی ذخیره‌شده‌ای برای پاک‌کردن باقی نمانده است.",
    )).toBeVisible();

    expect(await (await student.get(apiPath)).json()).toEqual({ noteCount: 0 });
    expect(await (await other.get(apiPath)).json()).toEqual({ noteCount: 1 });
    expect((await db.select().from(studentVideoNotes).where(
      eq(studentVideoNotes.studentUserId, users.student),
    ))).toHaveLength(0);
    expect((await db.select().from(studentVideoNotes).where(
      eq(studentVideoNotes.studentUserId, users.otherStudent),
    ))).toHaveLength(1);
    const [marker] = await db.select().from(studentVideoCompletions)
      .where(and(
        eq(studentVideoCompletions.studentUserId, users.student),
        eq(studentVideoCompletions.assetId, videoIds.ready),
      ));
    expect(marker).toBeDefined();

    const replay = await other.delete(apiPath, {
      data: confirmation, headers: origin,
    });
    expect(replay.status()).toBe(200);
    expect(await replay.json()).toEqual({ deleted: 1, noteCount: 0 });
    const duplicate = await other.delete(apiPath, {
      data: confirmation, headers: origin,
    });
    expect(duplicate.status()).toBe(200);
    expect(await duplicate.json()).toEqual({ deleted: 0, noteCount: 0 });
    expect((await db.select().from(studentVideoNotes).where(
      inArray(studentVideoNotes.studentUserId, [
        users.student, users.otherStudent,
      ]),
    ))).toHaveLength(0);

    await anonymous.dispose();
    await provider.dispose();
    await student.dispose();
    await other.dispose();
  });

});
