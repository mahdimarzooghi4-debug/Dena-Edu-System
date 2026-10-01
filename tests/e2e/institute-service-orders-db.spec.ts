import { randomUUID } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import { serializeSignedCookie } from "better-call";
import { expect, request, test, type APIRequestContext } from "@playwright/test";
import { getDb } from "../../src/db";
import {
  auditLogs, instituteServiceCatalog, instituteServiceOrders, memberships,
  session, user, verifiedEntities,
} from "../../src/db/schema";

test.describe.configure({ mode: "serial" });

test.describe("institute service order guardian consent", () => {
  const db = getDb();
  const users = {
    admin: randomUUID(), institute: randomUUID(), otherInstitute: randomUUID(),
    student: randomUUID(),
  };
  const tokens = {
    institute: randomUUID(), otherInstitute: randomUUID(), student: randomUUID(),
  };
  const instituteId = randomUUID();
  const otherInstituteId = randomUUID();
  const serviceId = randomUUID();
  const orderId = randomUUID();
  const consentPath = `/api/institute/service-orders/${orderId}/consent`;

  async function client(as?: keyof typeof tokens): Promise<APIRequestContext> {
    const cookie = as ? await serializeSignedCookie(
      "better-auth.session_token", tokens[as], process.env.BETTER_AUTH_SECRET!,
    ) : undefined;
    return request.newContext({ baseURL: "http://localhost:3000",
      extraHTTPHeaders: cookie ? { Cookie: cookie.split(";")[0] } : {} });
  }
  const post = (ctx: APIRequestContext, path: string, data: object) =>
    ctx.post(path, { data, headers: { Origin: "http://localhost:3000" } });

  test.beforeAll(async () => {
    await db.insert(user).values(Object.entries(users).map(([name, id]) => ({
      id, name, email: `${id}@service-consent.example.test`,
    })));
    await db.insert(verifiedEntities).values([
      { id: instituteId, role: "institute", name: "service consent institute",
        evidenceReference: "test/service-consent-institute", verifiedByUserId: users.admin },
      { id: otherInstituteId, role: "institute", name: "other service institute",
        evidenceReference: "test/other-service-consent-institute", verifiedByUserId: users.admin },
    ]);
    await db.insert(memberships).values([
      { userId: users.admin, role: "admin" },
      { userId: users.institute, role: "institute", instituteId },
      { userId: users.otherInstitute, role: "institute", instituteId: otherInstituteId },
      { userId: users.student, role: "student" },
    ]);
    const expiresAt = new Date(Date.now() + 3_600_000);
    await db.insert(session).values(Object.entries(tokens).map(([name, token]) => ({
      userId: users[name as keyof typeof tokens], token, expiresAt,
    })));
    await db.insert(instituteServiceCatalog).values({
      id: serviceId, instituteId, createdByUserId: users.institute,
      title: "مشاورهٔ آزمایشی", category: "consultation",
      description: "خدمت آزمایشی برای آزمون جریان رضایت سرپرست.",
      priceToman: 200_000, includedMinutes: null, validityDays: null,
      guardianConsentRequired: true, cancellationPolicy: "درخواست پرداخت‌نشده قابل لغو است.",
      status: "active",
    });
    await db.insert(instituteServiceOrders).values({
      id: orderId, idempotencyKey: randomUUID(), studentUserId: users.student,
      serviceId, instituteId, serviceTitleSnapshot: "مشاورهٔ آزمایشی",
      categorySnapshot: "consultation", priceToman: 200_000,
      grossRials: 2_000_000, denaShareRials: 200_000, instituteShareRials: 1_800_000,
      commissionBasisPoints: 1_000, includedMinutes: null, validityDays: null,
      guardianConsentRequired: true, status: "awaiting_guardian_consent",
    });
  });

  test.afterAll(async () => {
    await db.delete(auditLogs).where(and(
      eq(auditLogs.entityType, "SERVICE_ORDER"), eq(auditLogs.entityId, orderId),
    ));
    await db.delete(instituteServiceOrders).where(eq(instituteServiceOrders.id, orderId));
    await db.delete(instituteServiceCatalog).where(eq(instituteServiceCatalog.id, serviceId));
    await db.delete(session).where(inArray(session.userId, Object.values(users)));
    await db.delete(memberships).where(inArray(memberships.userId, Object.values(users)));
    await db.delete(verifiedEntities).where(inArray(
      verifiedEntities.id, [instituteId, otherInstituteId],
    ));
    await db.delete(user).where(inArray(user.id, Object.values(users)));
  });

  test("scopes confirmation to the responsible institute and records one attestation", async () => {
    const anonymous = await client();
    expect((await post(anonymous, consentPath, { consentConfirmed: true })).status()).toBe(401);
    await anonymous.dispose();

    const student = await client("student");
    expect((await post(student, consentPath, { consentConfirmed: true })).status()).toBe(404);
    await student.dispose();

    const institute = await client("institute");
    const inbox = await institute.get("/institute/service-orders");
    expect(inbox.status()).toBe(200);
    expect(await inbox.text()).toContain(
      "تأیید می‌کنم رضایت سرپرست برای همین درخواست خدمت اخذ شده است.",
    );
    expect((await institute.post(consentPath, {
      data: { consentConfirmed: true }, headers: { Origin: "https://attacker.invalid" },
    })).status()).toBe(403);
    expect((await post(institute, consentPath, { consentConfirmed: false })).status()).toBe(400);

    const otherInstitute = await client("otherInstitute");
    expect((await post(otherInstitute, consentPath, { consentConfirmed: true })).status()).toBe(404);
    await otherInstitute.dispose();

    const first = await post(institute, consentPath, { consentConfirmed: true });
    expect(first.status()).toBe(200);
    expect(await first.json()).toMatchObject({
      order: { id: orderId, status: "awaiting_payment", duplicate: false },
    });
    const replay = await post(institute, consentPath, { consentConfirmed: true });
    expect(await replay.json()).toMatchObject({
      order: { id: orderId, status: "awaiting_payment", duplicate: true },
    });

    const [order] = await db.select().from(instituteServiceOrders)
      .where(eq(instituteServiceOrders.id, orderId));
    expect(order?.status).toBe("awaiting_payment");
    expect(order?.paidAt).toBeNull();
    expect(order?.guardianConsentConfirmedAt).toBeInstanceOf(Date);
    expect(order?.guardianConsentConfirmedByUserId).toBe(users.institute);
    expect(await db.select().from(auditLogs).where(and(
      eq(auditLogs.action, "institute.service_order.guardian_consent_confirmed"),
      eq(auditLogs.entityId, orderId),
    ))).toHaveLength(1);
    const updatedInbox = await institute.get("/institute/service-orders");
    expect(await updatedInbox.text()).toContain("تأیید مؤسسه ثبت شده");

    const studentAfter = await client("student");
    const studentHistory = await studentAfter.get("/student/services/orders");
    expect(studentHistory.status()).toBe(200);
    expect(await studentHistory.text()).toContain(
      "تأیید مؤسسه دربارهٔ رضایت سرپرست ثبت شده است.",
    );
    expect(await studentHistory.text()).toContain("هیچ مبلغی دریافت نشده است.");
    await studentAfter.dispose();
    await institute.dispose();
  });
});
