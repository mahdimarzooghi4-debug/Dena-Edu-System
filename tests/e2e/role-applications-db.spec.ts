import { randomUUID } from "node:crypto";
import { inArray, eq, and } from "drizzle-orm";
import { serializeSignedCookie } from "better-call";
import { expect, request, test, type APIRequestContext } from "@playwright/test";
import { getDb } from "../../src/db";
import {
  courses, memberships, roleApplicationEvents, roleApplications, session,
  user, verifiedEntities,
} from "../../src/db/schema";

test.describe.configure({ mode: "serial" });

test.describe("reviewed role requests, scoped grants and audit on PostgreSQL", () => {
  const db = getDb();
  const ids = { applicant: randomUUID(), reviewer: randomUUID(), outsider: randomUUID() };
  const token = {
    applicant: randomUUID(), reviewer: randomUUID(), outsider: randomUUID(),
  };
  const proposed = { role: "institute", proposedName: "پژوهشگاه نمونه", statement:
    "درخواست بررسی دسترسی موسسه با مدارک قابل ارزیابی توسط مسئول سامانه." };
  const requestIds: string[] = [];
  const tenantCourseId = randomUUID();

  async function client(as?: keyof typeof token): Promise<APIRequestContext> {
    const signed = as ? await serializeSignedCookie(
      "better-auth.session_token", token[as], process.env.BETTER_AUTH_SECRET!,
    ) : undefined;
    return request.newContext({
      baseURL: "http://localhost:3000",
      extraHTTPHeaders: signed ? { Cookie: signed.split(";")[0] } : {},
    });
  }
  const submit = (ctx: APIRequestContext, body: object) => ctx.post(
    "/api/access/role-applications", {
      data: body, headers: { Origin: "http://localhost:3000" },
    },
  );
  const decide = (ctx: APIRequestContext, id: string, body: object) => ctx.post(
    `/api/admin/role-applications/${id}/decision`, {
      data: body, headers: { Origin: "http://localhost:3000" },
    },
  );

  test.beforeAll(async () => {
    const expiresAt = new Date(Date.now() + 3_600_000);
    await db.insert(user).values([
      { id: ids.applicant, name: "applicant", email: `${ids.applicant}@example.test`,
        phoneNumber: "+989" + ids.applicant.replaceAll("-", "").slice(0, 9)
          .replace(/[a-f]/g, "1"), phoneNumberVerified: true },
      { id: ids.reviewer, name: "reviewer", email: `${ids.reviewer}@example.test`,
        phoneNumber: "+989" + ids.reviewer.replaceAll("-", "").slice(0, 9)
          .replace(/[a-f]/g, "2"), phoneNumberVerified: true },
      { id: ids.outsider, name: "outsider", email: `${ids.outsider}@example.test`,
        phoneNumber: "+989" + ids.outsider.replaceAll("-", "").slice(0, 9)
          .replace(/[a-f]/g, "3"), phoneNumberVerified: true },
    ]);
    await db.insert(session).values(Object.keys(token).map((key) => ({
      userId: ids[key as keyof typeof ids],
      token: token[key as keyof typeof token], expiresAt,
    })));
    await db.insert(memberships).values([
      { userId: ids.applicant, role: "student" },
      { userId: ids.outsider, role: "student" },
      // CI bootstrap fixture ONLY; no user-facing /admin signup path exists.
      { userId: ids.reviewer, role: "admin" },
    ]);
  });

  test.afterAll(async () => {
    await db.delete(courses).where(eq(courses.id, tenantCourseId));
    if (requestIds.length) {
      await db.delete(roleApplicationEvents)
        .where(inArray(roleApplicationEvents.applicationId, requestIds));
      await db.delete(roleApplications)
        .where(inArray(roleApplications.id, requestIds));
    }
    await db.delete(memberships).where(inArray(
      memberships.userId, Object.values(ids),
    ));
    await db.delete(verifiedEntities)
      .where(eq(verifiedEntities.verifiedByUserId, ids.reviewer));
    await db.delete(user).where(inArray(user.id, Object.values(ids)));
  });

  test("anonymous and student cannot review; applicant cannot select admin or scope", async () => {
    const anonymous = await client();
    expect((await anonymous.get("/api/admin/role-applications")).status()).toBe(401);
    expect((await anonymous.get("/api/access/role-applications")).status()).toBe(401);
    await anonymous.dispose();

    const applicant = await client("applicant");
    expect((await applicant.get("/api/admin/role-applications")).status()).toBe(403);
    expect((await submit(applicant, { ...proposed, role: "admin" })).status()).toBe(400);
    expect((await submit(applicant, { ...proposed, instituteId: randomUUID() })).status()).toBe(400);
    expect((await submit(applicant, { ...proposed, role: "student" })).status()).toBe(400);
    expect((await applicant.post("/api/access/role-applications", {
      data: proposed, headers: { Origin: "https://attacker.invalid" },
    })).status()).toBe(403);
    expect((await applicant.get("/api/access/me")).status()).toBe(200);
    await applicant.dispose();
  });

  test("verified owner submits one pending application; no immediate new role", async () => {
    const applicant = await client("applicant");
    const result = await submit(applicant, proposed);
    expect(result.status()).toBe(201);
    expect(result.headers()["cache-control"]).toContain("no-store");
    const body = await result.json();
    requestIds.push(body.id);
    expect(body.status).toBe("pending");
    expect((await submit(applicant, proposed)).status()).toBe(409);

    const own = await applicant.get("/api/access/role-applications");
    expect(own.status()).toBe(200);
    const list = (await own.json()).applications;
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ id: body.id, role: "institute", status: "pending" });
    expect(JSON.stringify(list)).not.toContain("evidenceReference");
    expect((await applicant.get("/api/access/me")).status()).toBe(200);
    expect((await (await applicant.get("/api/access/me")).json()).memberships)
      .toEqual([{ role: "student" }]);
    const outsider = await client("outsider");
    expect((await (await outsider.get("/api/access/role-applications")).json())
      .applications).toHaveLength(0);
    await outsider.dispose();
    await applicant.dispose();
  });

  test("reviewer must record separate evidence and verified entity; privilege is scoped", async () => {
    const admin = await client("reviewer");
    const [id] = requestIds;
    const queue = await admin.get("/api/admin/role-applications");
    expect(queue.status()).toBe(200);
    expect((await queue.json()).pending).toEqual([
      expect.objectContaining({ id, userId: ids.applicant, role: "institute" }),
    ]);

    expect((await decide(admin, id, { action: "approve",
      reason: "بررسی اولیه انجام شد اما مرجع مدارک هنوز درج نشده است.",
    })).status()).toBe(400);
    const response = await decide(admin, id, {
      action: "approve", verifiedName: "مؤسسه تأییدشده آزمایشی",
      evidenceReference: "private-review/CI-entity-0001",
      reason: "هویت حقوقی و مدارک موسسه در مخزن محدود ارزیابی و ثبت شد.",
    });
    expect(response.status()).toBe(200);
    expect(await response.json()).toMatchObject({
      id, role: "institute", status: "approved",
    });
    expect((await decide(admin, id, {
      action: "reject", reason: "امکان اعمال تصمیم دوم بر درخواست نهایی وجود ندارد.",
    })).status()).toBe(409);
    const member = await db.select().from(memberships)
      .where(and(eq(memberships.userId, ids.applicant),
        eq(memberships.role, "institute")));
    expect(member).toHaveLength(1);
    expect(member[0].instituteId).toMatch(/^[a-f\d-]{36}$/);
    const [scope] = await db.select().from(verifiedEntities)
      .where(eq(verifiedEntities.id, member[0].instituteId!));
    expect(scope.role).toBe("institute");
    expect(scope.verifiedByUserId).toBe(ids.reviewer);
    expect(scope.name).toBe("مؤسسه تأییدشده آزمایشی");

    const applicant = await client("applicant");
    const owned = await applicant.get("/api/access/me");
    expect((await owned.json()).memberships).toContainEqual({
      role: "institute", instituteId: scope.id,
    });
    expect(JSON.stringify(await (await applicant.get("/api/access/role-applications"))
      .json())).not.toContain("private-review/");
    await applicant.dispose();
    await admin.dispose();
  });

  test("rejected role does not grant scope; no self-review even for admins", async () => {
    const applicant = await client("applicant");
    const rejection = await submit(applicant, {
      role: "provider", proposedName: "ارائه‌دهنده آزمایشی",
      statement: "درخواست بررسی مستقل مدارک ارائه دهنده پیش از دریافت دسترسی.",
    });
    expect(rejection.status()).toBe(201);
    const rejectedId = (await rejection.json()).id;
    requestIds.push(rejectedId);

    const admin = await client("reviewer");
    expect((await decide(admin, rejectedId, {
      action: "reject", reason: "مدرک لازم برای تایید ارائه‌دهنده ارائه نشده است.",
    })).status()).toBe(200);
    expect((await submit(applicant, {
      role: "provider", proposedName: "ارائه‌دهنده آزمایشی",
      statement: "درخواست دوم بدون بازگشایی رسمی پرونده تایید نمی شود.",
    })).status()).toBe(409);
    const [denied] = await db.select().from(roleApplications)
      .where(eq(roleApplications.id, rejectedId));
    expect(denied.assignedScopeId).toBeNull();

    const self = await submit(admin, {
      role: "benefactor", proposedName: "حامی آزمایشی",
      statement: "حساب بازبین نباید درخواست مربوط به خودش را تایید کند.",
    });
    expect(self.status()).toBe(201);
    const selfId = (await self.json()).id;
    requestIds.push(selfId);
    expect((await decide(admin, selfId, {
      action: "approve", verifiedName: "حامی آزمایشی",
      evidenceReference: "private-review/CI-self-0001",
      reason: "بررسی درخواست خود بازبین به صورت مستقل لازم است.",
    })).status()).toBe(403);

    const events = await db.select().from(roleApplicationEvents)
      .where(eq(roleApplicationEvents.applicationId, requestIds[0]));
    expect(events.map((item) => item.kind).sort()).toEqual(["approved", "submitted"]);
    await db.update(memberships).set({ status: "suspended" })
      .where(and(eq(memberships.userId, ids.reviewer),
        eq(memberships.role, "admin")));
    expect((await admin.get("/api/admin/role-applications")).status()).toBe(401);
    await admin.dispose();
    await applicant.dispose();
  });
});
