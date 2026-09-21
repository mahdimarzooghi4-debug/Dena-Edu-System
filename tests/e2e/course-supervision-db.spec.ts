import { randomUUID } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import { serializeSignedCookie } from "better-call";
import { expect, request, test, type APIRequestContext } from "@playwright/test";
import { getDb } from "../../src/db";
import {
  courses, memberships, session, supervisionEvents, supervisionGrants,
  user, verifiedEntities,
} from "../../src/db/schema";

test.describe.configure({ mode: "serial" });

test.describe("course-scoped provider requests and independent institute decisions", () => {
  const db = getDb();
  const users = {
    admin: randomUUID(), provider: randomUUID(), institute: randomUUID(),
    otherProvider: randomUUID(), otherInstitute: randomUUID(), dual: randomUUID(),
  };
  const tokens = {
    provider: randomUUID(), institute: randomUUID(), otherProvider: randomUUID(),
    otherInstitute: randomUUID(), dual: randomUUID(), admin: randomUUID(),
  };
  const scopes = {
    provider: randomUUID(), institute: randomUUID(),
    otherProvider: randomUUID(), otherInstitute: randomUUID(),
  };
  const requestId = randomUUID();
  const requestIdB = randomUUID();
  const courseIds: string[] = [];
  const requestBody = {
    providerId: scopes.provider,
    responsibleInstituteId: scopes.institute,
    title: "دوره آزمایشی نظارت مستقل دنا",
    clientRequestId: requestId,
  };

  async function client(as?: keyof typeof tokens): Promise<APIRequestContext> {
    const cookie = as ? await serializeSignedCookie(
      "better-auth.session_token", tokens[as], process.env.BETTER_AUTH_SECRET!,
    ) : undefined;
    return request.newContext({
      baseURL: "http://localhost:3000",
      extraHTTPHeaders: cookie ? { Cookie: cookie.split(";")[0] } : {},
    });
  }
  const create = (ctx: APIRequestContext, body: object) =>
    ctx.post("/api/provider/courses", {
      data: body, headers: { Origin: "http://localhost:3000" },
    });
  const decide = (ctx: APIRequestContext, courseId: string, body: object) =>
    ctx.post(`/api/institute/supervision/${courseId}/decision`, {
      data: body, headers: { Origin: "http://localhost:3000" },
    });
  const authorized = (ctx: APIRequestContext, courseId: string) =>
    ctx.get(`/api/courses/${courseId}/authorization`);

  test.beforeAll(async () => {
    const expiresAt = new Date(Date.now() + 3_600_000);
    await db.insert(user).values(Object.entries(users).map(([name, id]) => ({
      id, name, email: `${id}@example.test`,
    })));
    await db.insert(verifiedEntities).values([
      { id: scopes.provider, role: "provider", name: "provider A",
        evidenceReference: "integration/provider-a", verifiedByUserId: users.admin },
      { id: scopes.institute, role: "institute", name: "institute A",
        evidenceReference: "integration/institute-a", verifiedByUserId: users.admin },
      { id: scopes.otherProvider, role: "provider", name: "provider B",
        evidenceReference: "integration/provider-b", verifiedByUserId: users.admin },
      { id: scopes.otherInstitute, role: "institute", name: "institute B",
        evidenceReference: "integration/institute-b", verifiedByUserId: users.admin },
    ]);
    await db.insert(memberships).values([
      { userId: users.admin, role: "admin" },
      { userId: users.provider, role: "provider", providerId: scopes.provider },
      { userId: users.institute, role: "institute", instituteId: scopes.institute },
      { userId: users.otherProvider, role: "provider", providerId: scopes.otherProvider },
      { userId: users.otherInstitute, role: "institute", instituteId: scopes.otherInstitute },
      { userId: users.dual, role: "provider", providerId: scopes.provider },
      { userId: users.dual, role: "institute", instituteId: scopes.institute },
    ]);
    await db.insert(session).values(
      Object.entries(tokens).map(([name, token]) => ({
        userId: users[name as keyof typeof users], token, expiresAt,
      })),
    );
  });

  test.afterAll(async () => {
    if (courseIds.length) {
      await db.delete(supervisionEvents).where(
        inArray(supervisionEvents.courseId, courseIds));
      await db.delete(supervisionGrants).where(
        inArray(supervisionGrants.courseId, courseIds));
      await db.delete(courses).where(inArray(courses.id, courseIds));
    }
    await db.delete(memberships).where(
      inArray(memberships.userId, Object.values(users)));
    await db.delete(verifiedEntities).where(
      inArray(verifiedEntities.id, Object.values(scopes)));
    await db.delete(user).where(inArray(user.id, Object.values(users)));
  });

  test("only active, verified provider scopes can request an independent institute", async () => {
    const anonymous = await client();
    expect((await anonymous.get("/api/provider/courses")).status()).toBe(401);
    expect((await anonymous.get("/api/institute/supervision")).status()).toBe(401);
    await anonymous.dispose();

    const provider = await client("provider");
    expect((await provider.get("/api/institute/supervision")).status()).toBe(403);
    expect((await create(provider, {
      ...requestBody, providerId: scopes.otherProvider,
    })).status()).toBe(403);
    expect((await create(provider, {
      ...requestBody, responsibleInstituteId: randomUUID(),
    })).status()).toBe(404);
    expect((await create(provider, {
      ...requestBody, status: "approved",
    })).status()).toBe(400);
    expect((await provider.post("/api/provider/courses", {
      data: requestBody, headers: { Origin: "https://attacker.invalid" },
    })).status()).toBe(403);

    const admin = await client("admin");
    expect((await create(admin, requestBody)).status()).toBe(403);
    expect((await admin.get("/api/institute/supervision")).status()).toBe(403);
    await admin.dispose();
    await provider.dispose();
  });

  test("provider creates two distinct pending courses; retry cannot duplicate or change terms", async () => {
    const provider = await client("provider");
    const first = await create(provider, requestBody);
    expect(first.status()).toBe(201);
    expect(first.headers()["cache-control"]).toContain("no-store");
    const a = await first.json();
    courseIds.push(a.courseId);
    expect(a).toMatchObject({ status: "requested", replayed: false });

    const replay = await create(provider, requestBody);
    expect(replay.status()).toBe(200);
    expect(await replay.json()).toEqual({
      courseId: a.courseId, status: "requested", replayed: true,
    });
    expect((await create(provider, {
      ...requestBody, title: "تغییر نام دوره با کلید تکراری",
    })).status()).toBe(409);

    const second = await create(provider, {
      ...requestBody, clientRequestId: requestIdB,
      title: "دوره دوم برای اطمینان از تفکیک مجوز",
    });
    expect(second.status()).toBe(201);
    courseIds.push((await second.json()).courseId);

    const owned = await provider.get("/api/provider/courses");
    expect(owned.status()).toBe(200);
    expect((await owned.json()).courses.map((row: { courseId: string }) => row.courseId))
      .toEqual(expect.arrayContaining(courseIds));
    expect((await authorized(provider, courseIds[0])).status()).toBe(404);
    expect((await authorized(provider, courseIds[1])).status()).toBe(404);

    const otherProvider = await client("otherProvider");
    expect((await (await otherProvider.get("/api/provider/courses")).json()).courses)
      .toHaveLength(0);
    expect((await authorized(otherProvider, courseIds[0])).status()).toBe(404);
    await otherProvider.dispose();

    const institute = await client("institute");
    const queue = await institute.get("/api/institute/supervision");
    expect(queue.status()).toBe(200);
    const listed = (await queue.json()).courses;
    expect(listed).toHaveLength(2);
    expect(listed.every((row: { supervisionStatus: string }) =>
      row.supervisionStatus === "requested")).toBe(true);
    expect((await authorized(institute, courseIds[0])).status()).toBe(404);
    const otherInstitute = await client("otherInstitute");
    expect((await (await otherInstitute.get("/api/institute/supervision")).json())
      .courses).toHaveLength(0);
    await institute.dispose();
    await otherInstitute.dispose();
    await provider.dispose();
  });

  test("only independent representative of responsible institute may approve same course", async () => {
    const [a, b] = courseIds;
    const institute = await client("institute");
    const stranger = await client("otherInstitute");
    const provider = await client("provider");
    const dual = await client("dual");

    const approve = {
      action: "approve",
      reason: "محتوا و برنامه نظارت همین دوره توسط مؤسسه بررسی و تأیید شده است.",
    };
    expect((await decide(stranger, a, approve)).status()).toBe(404);
    expect((await decide(provider, a, approve)).status()).toBe(403);
    expect((await decide(dual, a, approve)).status()).toBe(403);
    expect((await decide(institute, a, {
      ...approve, providerId: scopes.otherProvider,
    })).status()).toBe(400);
    expect((await decide(institute, a, {
      action: "approve", reason: "short",
    })).status()).toBe(400);
    expect((await institute.post(
      `/api/institute/supervision/${a}/decision`, {
        data: approve, headers: { Origin: "https://attacker.invalid" },
      },
    )).status()).toBe(403);
    const success = await decide(institute, a, approve);
    expect(success.status()).toBe(200);
    expect(await success.json()).toEqual({
      courseId: a, status: "approved", decision: "approved",
    });
    expect((await decide(institute, a, approve)).status()).toBe(409);
    const [grant] = await db.select().from(supervisionGrants)
      .where(eq(supervisionGrants.courseId, a));
    expect(grant.approvedByInstituteUserId).toBe(users.institute);
    expect(grant.approvedAt).toBeInstanceOf(Date);
    expect((await authorized(provider, a)).status()).toBe(200);
    expect((await authorized(institute, a)).status()).toBe(200);
    expect((await authorized(provider, b)).status()).toBe(404);
    expect((await authorized(stranger, a)).status()).toBe(404);
    expect((await authorized(dual, a)).status()).toBe(200); // dual has provider membership; NO decision rights

    const events = await db.select().from(supervisionEvents)
      .where(eq(supervisionEvents.courseId, a));
    expect(events.map((row) => row.kind).sort()).toEqual(["approved", "requested"]);
    expect(events.find((row) => row.kind === "approved")?.actorUserId)
      .toBe(users.institute);

    // DB rejects forged grant scope even from a direct privileged DB writer.
    await expect(db.update(supervisionGrants)
      .set({ instituteId: scopes.otherInstitute })
      .where(eq(supervisionGrants.courseId, a))).rejects.toThrow();

    await dual.dispose();
    await provider.dispose();
    await stranger.dispose();
    await institute.dispose();
  });

  test("institute revokes an approval and rejects unapproved course independently", async () => {
    const [a, b] = courseIds;
    const institute = await client("institute");
    const provider = await client("provider");
    const revoke = {
      action: "revoke", reason: "شرایط نظارت مؤسسه برای این دوره دیگر برقرار نیست.",
    };
    const revoked = await decide(institute, a, revoke);
    expect(revoked.status()).toBe(200);
    expect(await revoked.json()).toEqual({
      courseId: a, status: "revoked", decision: "revoked",
    });
    expect((await authorized(provider, a)).status()).toBe(404);
    expect((await authorized(institute, a)).status()).toBe(404);
    expect((await decide(institute, a, {
      action: "approve", reason: "تأیید مجدد بدون درخواست تازه ممنوع است.",
    })).status()).toBe(409);

    const rejected = await decide(institute, b, revoke);
    expect(rejected.status()).toBe(200);
    expect(await rejected.json()).toEqual({
      courseId: b, status: "revoked", decision: "rejected",
    });
    expect((await authorized(provider, b)).status()).toBe(404);
    expect((await decide(institute, b, revoke)).status()).toBe(409);
    const decisions = await db.select().from(supervisionEvents)
      .where(inArray(supervisionEvents.courseId, [a, b]));
    expect(decisions.map((row) => row.kind).sort()).toEqual([
      "approved", "rejected", "requested", "requested", "revoked",
    ]);

    await db.update(memberships).set({ status: "suspended" })
      .where(and(
        eq(memberships.userId, users.institute),
        eq(memberships.role, "institute"),
      ));
    expect((await institute.get("/api/institute/supervision")).status()).toBe(401);
    expect((await decide(institute, a, revoke)).status()).toBe(401);
    expect((await create(provider, {
      ...requestBody, clientRequestId: randomUUID(),
    })).status()).toBe(404);
    await provider.dispose();
    await institute.dispose();
  });
});
