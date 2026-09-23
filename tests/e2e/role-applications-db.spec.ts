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
    expect((await anonymous.get("/api/organization/overview")).status()).toBe(401);
    expect((await anonymous.get("/api/benefactor/overview")).status()).toBe(401);
    const noSessionAdmin = await anonymous.get("/admin", { maxRedirects: 0 });
    expect(noSessionAdmin.status()).toBe(307);
    expect(noSessionAdmin.headers().location).toBe("/login");
    await anonymous.dispose();

    const applicant = await client("applicant");
    expect((await applicant.get("/api/admin/role-applications")).status()).toBe(403);
    expect((await applicant.get("/admin")).status()).toBe(404);
    expect((await applicant.get("/api/organization/overview")).status()).toBe(403);
    expect((await applicant.get("/organization")).status()).toBe(404);
    expect((await applicant.get("/api/benefactor/overview")).status()).toBe(403);
    expect((await applicant.get("/benefactor")).status()).toBe(404);
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
    const pendingHome = await admin.get("/admin");
    expect(pendingHome.status()).toBe(200);
    const pendingHtml = await pendingHome.text();
    expect(pendingHtml).toContain("نمای کلی درخواست‌های نقش");
    expect(pendingHtml).toContain("پژوهشگاه نمونه");
    expect(pendingHtml).toContain("مؤسسه");
    expect(pendingHtml).not.toContain("private-review/");
    expect(pendingHtml).not.toContain(ids.applicant);
    expect((await admin.get("/account")).status()).toBe(200);
    expect(await (await admin.get("/account")).text()).toContain('href="/admin"');

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
    const completedHome = await admin.get("/admin");
    expect(completedHome.status()).toBe(200);
    expect(await completedHome.text()).not.toContain("پژوهشگاه نمونه");
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

  test("organization home uses approved organization role, never other entity or evidence", async ({ page }) => {
    const applicant = await client("applicant");
    const reviewer = await client("reviewer");
    const outsider = await client("outsider");
    const submission = await submit(applicant, {
      role: "organization", proposedName: "سازمان آزمایشی پیشنهادی",
      statement: "درخواست بررسی قانونی نمایندگی سازمان برای مشاهده محدوده خود.",
    });
    expect(submission.status()).toBe(201);
    const applicationId = (await submission.json()).id as string;
    requestIds.push(applicationId);
    expect((await applicant.get("/api/organization/overview")).status()).toBe(403);
    expect((await applicant.get("/organization")).status()).toBe(404);

    const approval = await decide(reviewer, applicationId, {
      action: "approve", verifiedName: "سازمان آزمایشی تأییدشده",
      evidenceReference: "private-review/CI-organization-0001",
      reason: "مدارک نمایندگی سازمان به طور مستقل و محدود بررسی و ثبت شد.",
    });
    expect(approval.status()).toBe(200);
    const [member] = await db.select().from(memberships).where(and(
      eq(memberships.userId, ids.applicant),
      eq(memberships.role, "organization"),
    ));
    expect(member.organizationId).toMatch(/^[a-f\d-]{36}$/);
    const [scope] = await db.select().from(verifiedEntities)
      .where(eq(verifiedEntities.id, member.organizationId!));
    expect(scope.role).toBe("organization");
    expect(scope.name).toBe("سازمان آزمایشی تأییدشده");

    const outsiderScopeId = randomUUID();
    await db.insert(verifiedEntities).values({
      id: outsiderScopeId, role: "organization", name: "سازمان دیگر خصوصی",
      evidenceReference: "private-review/CI-other-organization-0002",
      verifiedByUserId: ids.reviewer,
    });
    await db.insert(memberships).values({
      userId: ids.outsider, role: "organization",
      organizationId: outsiderScopeId,
    });
    const listing = await applicant.get("/api/organization/overview");
    expect(listing.status()).toBe(200);
    expect(listing.headers()["cache-control"]).toContain("no-store");
    const data = await listing.json();
    expect(data.organizations).toHaveLength(1);
    expect(data.organizations[0]).toMatchObject({
      id: scope.id, name: "سازمان آزمایشی تأییدشده",
    });
    const apiText = JSON.stringify(data);
    expect(apiText).not.toContain("private-review/");
    expect(apiText).not.toContain("سازمان دیگر خصوصی");
    expect(apiText).not.toContain(ids.reviewer);
    const outsiderData = await (await outsider.get("/api/organization/overview")).json();
    expect(outsiderData.organizations).toHaveLength(1);
    expect(outsiderData.organizations[0].name).toBe("سازمان دیگر خصوصی");
    expect(JSON.stringify(outsiderData)).not.toContain("سازمان آزمایشی تأییدشده");
    expect((await reviewer.get("/api/organization/overview")).status()).toBe(403);
    expect((await reviewer.get("/organization")).status()).toBe(404);

    const organizationHome = await applicant.get("/organization");
    expect(organizationHome.status()).toBe(200);
    const html = await organizationHome.text();
    expect(html).toContain("سازمان آزمایشی تأییدشده");
    expect(html).not.toContain("سازمان دیگر خصوصی");
    expect(html).not.toContain("private-review/");
    expect(html).not.toContain("CI-organization-0001");
    expect(html).not.toContain("CI-other-organization-0002");
    const account = await applicant.get("/account");
    expect(await account.text()).toContain('href="/organization"');

    const instituteMembership = await db.select().from(memberships).where(and(
      eq(memberships.userId, ids.applicant),
      eq(memberships.role, "institute"),
    )).limit(1);
    await db.update(memberships).set({
      organizationId: instituteMembership[0].instituteId!,
    }).where(eq(memberships.id, member.id));
    expect((await applicant.get("/api/organization/overview")).status()).toBe(404);
    expect((await applicant.get("/organization")).status()).toBe(404);
    await db.update(memberships).set({
      organizationId: scope.id,
    }).where(eq(memberships.id, member.id));

    const signed = await serializeSignedCookie(
      "better-auth.session_token", token.applicant, process.env.BETTER_AUTH_SECRET!,
    );
    await page.context().addCookies([{
      name: "better-auth.session_token",
      value: signed.split(";")[0].split("=").slice(1).join("="),
      domain: "localhost", path: "/", httpOnly: true, secure: false, sameSite: "Lax",
    }]);
    await page.goto("http://localhost:3000/organization");
    await expect(page.getByRole("heading", {
      name: "سازمان‌های دارای دسترسی من",
    })).toBeVisible();
    await expect(page.getByRole("heading", {
      name: "سازمان آزمایشی تأییدشده",
    })).toBeVisible();
    await page.getByRole("link", {
      name: "وضعیت درخواست‌های نقش من",
    }).click();
    await expect(page).toHaveURL(/\/account\/role-applications$/);

    await db.update(memberships).set({ status: "suspended" })
      .where(eq(memberships.id, member.id));
    expect((await applicant.get("/api/organization/overview")).status()).toBe(403);
    expect((await applicant.get("/organization")).status()).toBe(404);
    await db.update(memberships).set({ status: "active" })
      .where(eq(memberships.id, member.id));
    expect((await applicant.get("/organization")).status()).toBe(200);
    await reviewer.dispose();
    await outsider.dispose();
    await applicant.dispose();
  });

  test("benefactor home reflects independently approved own identity only", async ({ page }) => {
    const applicant = await client("applicant");
    const reviewer = await client("reviewer");
    const outsider = await client("outsider");
    const submission = await submit(applicant, {
      role: "benefactor", proposedName: "حامی پیشنهادی آزمایشی",
      statement: "درخواست نمایندگی خیر برای مشاهده محدوده حمایتی خود پس از بررسی.",
    });
    expect(submission.status()).toBe(201);
    const applicationId = (await submission.json()).id as string;
    requestIds.push(applicationId);
    expect((await applicant.get("/api/benefactor/overview")).status()).toBe(403);
    expect((await applicant.get("/benefactor")).status()).toBe(404);

    const approval = await decide(reviewer, applicationId, {
      action: "approve", verifiedName: "حامی مستقل تأییدشده",
      evidenceReference: "private-review/CI-benefactor-0001",
      reason: "مدارک نمایندگی حامی مستقل و محرمانه بررسی و ثبت شد.",
    });
    expect(approval.status()).toBe(200);
    const [member] = await db.select().from(memberships).where(and(
      eq(memberships.userId, ids.applicant),
      eq(memberships.role, "benefactor"),
    )).limit(1);
    expect(member.benefactorId).toMatch(/^[a-f0-9-]{36}$/);
    const [scope] = await db.select().from(verifiedEntities)
      .where(eq(verifiedEntities.id, member.benefactorId!));
    expect(scope.role).toBe("benefactor");
    expect(scope.name).toBe("حامی مستقل تأییدشده");

    const outsiderScopeId = randomUUID();
    await db.insert(verifiedEntities).values({
      id: outsiderScopeId, role: "benefactor", name: "حامی دیگر خصوصی",
      evidenceReference: "private-review/CI-other-benefactor-0002",
      verifiedByUserId: ids.reviewer,
    });
    await db.insert(memberships).values({
      userId: ids.outsider, role: "benefactor",
      benefactorId: outsiderScopeId,
    });
    const listing = await applicant.get("/api/benefactor/overview");
    expect(listing.status()).toBe(200);
    expect(listing.headers()["cache-control"]).toContain("no-store");
    const data = await listing.json();
    expect(data.benefactors).toHaveLength(1);
    expect(data.benefactors[0]).toMatchObject({
      id: scope.id, name: "حامی مستقل تأییدشده",
    });
    const apiText = JSON.stringify(data);
    expect(apiText).not.toContain("private-review/");
    expect(apiText).not.toContain("حامی دیگر خصوصی");
    expect(apiText).not.toContain(ids.reviewer);
    const outsiderData = await (await outsider.get("/api/benefactor/overview")).json();
    expect(outsiderData.benefactors).toHaveLength(1);
    expect(outsiderData.benefactors[0].name).toBe("حامی دیگر خصوصی");
    expect(JSON.stringify(outsiderData)).not.toContain("حامی مستقل تأییدشده");
    expect((await reviewer.get("/api/benefactor/overview")).status()).toBe(403);
    expect((await reviewer.get("/benefactor")).status()).toBe(404);

    const home = await applicant.get("/benefactor");
    expect(home.status()).toBe(200);
    const html = await home.text();
    expect(html).toContain("حامی مستقل تأییدشده");
    expect(html).not.toContain("حامی دیگر خصوصی");
    expect(html).not.toContain("private-review/");
    expect(html).not.toContain("CI-benefactor-0001");
    expect(html).not.toContain("CI-other-benefactor-0002");
    expect(html).toContain("صندوق حمایت، کمک‌ها و رسیدها");
    expect(await (await applicant.get("/account")).text())
      .toContain('href="/benefactor"');

    const [organizationMembership] = await db.select().from(memberships).where(and(
      eq(memberships.userId, ids.applicant),
      eq(memberships.role, "organization"),
    )).limit(1);
    await db.update(memberships).set({
      benefactorId: organizationMembership.organizationId!,
    }).where(eq(memberships.id, member.id));
    expect((await applicant.get("/api/benefactor/overview")).status()).toBe(404);
    expect((await applicant.get("/benefactor")).status()).toBe(404);
    await db.update(memberships).set({
      benefactorId: scope.id,
    }).where(eq(memberships.id, member.id));

    const signed = await serializeSignedCookie(
      "better-auth.session_token", token.applicant, process.env.BETTER_AUTH_SECRET!,
    );
    await page.context().addCookies([{
      name: "better-auth.session_token",
      value: signed.split(";")[0].split("=").slice(1).join("="),
      domain: "localhost", path: "/", httpOnly: true, secure: false, sameSite: "Lax",
    }]);
    await page.goto("http://localhost:3000/benefactor");
    await expect(page.getByRole("heading", {
      name: "هویت‌های حمایتی دارای دسترسی من",
    })).toBeVisible();
    await expect(page.getByRole("heading", {
      name: "حامی مستقل تأییدشده",
    })).toBeVisible();
    await page.getByRole("link", {
      name: "وضعیت درخواست‌های نقش من",
    }).click();
    await expect(page).toHaveURL(/\/account\/role-applications$/);

    await db.update(memberships).set({ status: "suspended" })
      .where(eq(memberships.id, member.id));
    expect((await applicant.get("/api/benefactor/overview")).status()).toBe(403);
    expect((await applicant.get("/benefactor")).status()).toBe(404);
    await db.update(memberships).set({ status: "active" })
      .where(eq(memberships.id, member.id));
    expect((await applicant.get("/benefactor")).status()).toBe(200);
    await reviewer.dispose();
    await outsider.dispose();
    await applicant.dispose();
  });

  test("rejected role does not grant scope; no self-review even for admins", async ({ page }) => {
    const applicant = await client("applicant");
    const rejection = await submit(applicant, {
      role: "provider", proposedName: "ارائه‌دهنده آزمایشی",
      statement: "درخواست بررسی مستقل مدارک ارائه دهنده پیش از دریافت دسترسی.",
    });
    expect(rejection.status()).toBe(201);
    const rejectedId = (await rejection.json()).id;
    requestIds.push(rejectedId);

    const admin = await client("reviewer");
    // Exercise the *actual* guarded admin review page and clicked reject button.
    const signed = await serializeSignedCookie(
      "better-auth.session_token", token.reviewer, process.env.BETTER_AUTH_SECRET!,
    );
    await page.context().addCookies([{
      name: "better-auth.session_token",
      value: signed.split(";")[0].split("=").slice(1).join("="),
      domain: "localhost", path: "/", httpOnly: true, secure: false, sameSite: "Lax",
    }]);
    await page.goto("http://localhost:3000/admin");
    await expect(page.getByRole("heading", {
      name: "نمای کلی درخواست‌های نقش",
    })).toBeVisible();
    await expect(page.getByRole("heading", {
      name: "ارائه‌دهنده · ارائه‌دهنده آزمایشی",
    })).toBeVisible();
    await page.getByRole("link", { name: "صف بررسی درخواست‌های نقش" }).click();
    await expect(page).toHaveURL(/\/admin\/role-applications$/);
    await expect(page.getByRole("heading", { name: "درخواست‌های نقش سازمانی" })).toBeVisible();
    const entry = page.locator("li").filter({ hasText: "ارائه‌دهنده آزمایشی" });
    await expect(entry).toBeVisible();
    await entry.getByLabel("دلیل تصمیم").fill("مدرک لازم برای تایید ارائه‌دهنده ارائه نشده است.");
    const requestDone = page.waitForResponse((res) =>
      res.url().endsWith(`/api/admin/role-applications/${rejectedId}/decision`)
      && res.request().method() === "POST",
    );
    await entry.getByRole("button", { name: "رد درخواست با دلیل" }).click();
    expect((await requestDone).status()).toBe(200);
    await expect(page.getByRole("status")).toContainText("تصمیم و سوابق آن ثبت شد.");
    expect((await submit(applicant, {
      role: "provider", proposedName: "ارائه‌دهنده آزمایشی",
      statement: "درخواست دوم بدون بازگشایی رسمی پرونده تایید نمی شود.",
    })).status()).toBe(409);
    const [denied] = await db.select().from(roleApplications)
      .where(eq(roleApplications.id, rejectedId));
    expect(denied.assignedScopeId).toBeNull();
    const rejectedHome = await admin.get("/admin");
    expect(rejectedHome.status()).toBe(200);
    expect(await rejectedHome.text()).not.toContain("ارائه‌دهنده آزمایشی");

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
    const selfPendingHome = await admin.get("/admin");
    expect(selfPendingHome.status()).toBe(200);
    expect(await selfPendingHome.text()).toContain("حامی آزمایشی");

    const events = await db.select().from(roleApplicationEvents)
      .where(eq(roleApplicationEvents.applicationId, requestIds[0]));
    expect(events.map((item) => item.kind).sort()).toEqual(["approved", "submitted"]);
    await db.update(memberships).set({ status: "suspended" })
      .where(and(eq(memberships.userId, ids.reviewer),
        eq(memberships.role, "admin")));
    expect((await admin.get("/api/admin/role-applications")).status()).toBe(401);
    const suspendedHome = await admin.get("/admin", { maxRedirects: 0 });
    expect(suspendedHome.status()).toBe(307);
    expect(suspendedHome.headers().location).toBe("/login");
    await admin.dispose();
    await applicant.dispose();
  });
});
