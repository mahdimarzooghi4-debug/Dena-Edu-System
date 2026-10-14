import { randomUUID } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import { serializeSignedCookie } from "better-call";
import { expect, request, test, type APIRequestContext } from "@playwright/test";
import { getDb } from "../../src/db";
import {
  auditLogs, financialEntries, financialJournals, instituteServiceCatalog,
  instituteServiceCalls, instituteServiceOrders, memberships, serviceTimeLedger,
  session, user, verifiedEntities,
} from "../../src/db/schema";
import { captureInstituteServiceOrderPayment } from "../../src/server/finance/service-order-payments";
import { endInstituteServiceCall, startInstituteServiceCall } from "../../src/server/institute/service-calls";

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
  const noConsentServiceId = randomUUID();
  const orderId = randomUUID();
  const orderIdempotencyKey = randomUUID();
  let concurrentlyCreatedOrderId: string | undefined;
  let createdServiceCallId: string | undefined;
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
      priceToman: 200_000, includedMinutes: 60, validityDays: 30,
      guardianConsentRequired: true, cancellationPolicy: "درخواست پرداخت‌نشده قابل لغو است.",
      status: "active",
    });
    await db.insert(instituteServiceCatalog).values({
      id: noConsentServiceId, instituteId, createdByUserId: users.institute,
      title: "خدمت آزمایشی بدون سهمیه", category: "support",
      description: "برای آزمون درخواست تکراری و لغو قبل از پرداخت.",
      priceToman: 50_000, includedMinutes: null, validityDays: null,
      guardianConsentRequired: false, cancellationPolicy: "درخواست پرداخت‌نشده قابل لغو است.",
      status: "active",
    });
    await db.insert(instituteServiceOrders).values({
      id: orderId, idempotencyKey: randomUUID(), studentUserId: users.student,
      serviceId, instituteId, serviceTitleSnapshot: "مشاورهٔ آزمایشی",
      categorySnapshot: "consultation", priceToman: 200_000,
      grossRials: 2_000_000, denaShareRials: 200_000, instituteShareRials: 1_800_000,
      commissionBasisPoints: 1_000, includedMinutes: 60, validityDays: 30,
      guardianConsentRequired: true, status: "awaiting_guardian_consent",
    });
  });

  test.afterAll(async () => {
    if (createdServiceCallId) {
      await db.delete(auditLogs).where(and(
        eq(auditLogs.entityType, "SERVICE_CALL"), eq(auditLogs.entityId, createdServiceCallId),
      ));
      await db.delete(instituteServiceCalls).where(eq(instituteServiceCalls.id, createdServiceCallId));
    }
    await db.delete(serviceTimeLedger).where(eq(serviceTimeLedger.serviceOrderId, orderId));
    await db.delete(auditLogs).where(and(
      eq(auditLogs.entityType, "SERVICE_ORDER"), eq(auditLogs.entityId, orderId),
    ));
    await db.delete(instituteServiceOrders).where(eq(instituteServiceOrders.id, orderId));
    if (concurrentlyCreatedOrderId) {
      await db.delete(auditLogs).where(and(
        eq(auditLogs.entityType, "SERVICE_ORDER"),
        eq(auditLogs.entityId, concurrentlyCreatedOrderId),
      ));
      await db.delete(instituteServiceOrders).where(
        eq(instituteServiceOrders.id, concurrentlyCreatedOrderId),
      );
    }
    await db.delete(instituteServiceCatalog).where(inArray(
      instituteServiceCatalog.id, [serviceId, noConsentServiceId],
    ));
    await db.delete(session).where(inArray(session.userId, Object.values(users)));
    await db.delete(memberships).where(inArray(memberships.userId, Object.values(users)));
    await db.delete(verifiedEntities).where(inArray(
      verifiedEntities.id, [instituteId, otherInstituteId],
    ));
    await db.delete(user).where(inArray(user.id, Object.values(users)));
  });

  test("scopes confirmation and aggregate summary to the responsible institute", async () => {
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
    const initialSummary = await (await institute.get("/api/institute/service-orders")).json();
    expect(initialSummary.summary).toEqual({
      total: 1,
      statuses: {
        awaiting_guardian_consent: 1,
        awaiting_payment: 0,
        paid: 0,
        cancelled: 0,
      },
    });
    expect((await institute.post(consentPath, {
      data: { consentConfirmed: true }, headers: { Origin: "https://attacker.invalid" },
    })).status()).toBe(403);
    expect((await post(institute, consentPath, { consentConfirmed: false })).status()).toBe(400);

    const otherInstitute = await client("otherInstitute");
    expect((await post(otherInstitute, consentPath, { consentConfirmed: true })).status()).toBe(404);
    const emptyInbox = await otherInstitute.get("/api/institute/service-orders");
    expect(emptyInbox.status()).toBe(200);
    expect((await emptyInbox.json()).summary).toEqual({
      total: 0,
      statuses: {
        awaiting_guardian_consent: 0,
        awaiting_payment: 0,
        paid: 0,
        cancelled: 0,
      },
    });
    await otherInstitute.dispose();

    await expect(captureInstituteServiceOrderPayment({
      orderId,
      gatewayEventId: `gateway-test-${randomUUID()}`,
      grossRials: 2_000_000,
    })).rejects.toMatchObject({ kind: "order_not_payable" });

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
    const updatedSummary = await (await institute.get("/api/institute/service-orders")).json();
    expect(updatedSummary.summary.statuses.awaiting_payment).toBe(1);
    expect(updatedSummary.summary.statuses.paid).toBe(0);

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

  test("captures a verified payment once with an atomic balanced journal", async () => {
    const gatewayEventId = `gateway-test-${randomUUID()}`;
    const captured = await captureInstituteServiceOrderPayment({
      orderId, gatewayEventId, grossRials: 2_000_000,
    });
    expect(captured).toEqual({ orderId, status: "paid", duplicate: false });

    const replay = await captureInstituteServiceOrderPayment({
      orderId, gatewayEventId, grossRials: 2_000_000,
    });
    expect(replay).toEqual({ orderId, status: "paid", duplicate: true });
    await expect(captureInstituteServiceOrderPayment({
      orderId, gatewayEventId: `gateway-test-${randomUUID()}`, grossRials: 2_000_000,
    })).rejects.toMatchObject({ kind: "event_reused" });
    await expect(captureInstituteServiceOrderPayment({
      orderId, gatewayEventId: `gateway-test-${randomUUID()}`, grossRials: 1_999_999,
    })).rejects.toMatchObject({ kind: "amount_mismatch" });

    const [order] = await db.select().from(instituteServiceOrders)
      .where(eq(instituteServiceOrders.id, orderId));
    expect(order?.status).toBe("paid");
    expect(order?.paidAt).toBeInstanceOf(Date);
    const [journal] = await db.select().from(financialJournals)
      .where(eq(financialJournals.eventKey, `service-payment:${gatewayEventId}`));
    expect(journal).toMatchObject({
      sourceId: orderId,
      revenueStream: "institute_service",
      eventType: "payment_captured",
    });
    const entries = await db.select().from(financialEntries)
      .where(eq(financialEntries.journalId, journal!.id));
    expect(entries).toHaveLength(3);
    expect(entries.reduce((sum, entry) => sum + entry.debitRials, 0)).toBe(2_000_000);
    expect(entries.reduce((sum, entry) => sum + entry.creditRials, 0)).toBe(2_000_000);
    const quotaGrants = await db.select().from(serviceTimeLedger)
      .where(eq(serviceTimeLedger.serviceOrderId, orderId));
    expect(quotaGrants).toHaveLength(1);
    expect(quotaGrants[0]).toMatchObject({
      eventKey: `service-quota-grant:${orderId}`, eventType: "grant", minutes: 60,
      serviceSessionId: null,
    });
    const student = await client("student");
    const studentPage = await student.get("/student/services/orders");
    expect(await studentPage.text()).toContain("ماندهٔ ثبت‌شده");
    expect(await studentPage.text()).toContain("۶۰ دقیقه");
    await student.dispose();
    const institute = await client("institute");
    const institutePage = await institute.get("/institute/service-orders");
    expect(await institutePage.text()).toContain("مصرف ثبت‌شده");
    expect(await institutePage.text()).toContain("۶۰ دقیقه");
    await institute.dispose();
  });

  test("scopes call scheduling to paid consented service quotas and audits its lifecycle", async () => {
    const scheduledAt = new Date(Date.now() + 60_000).toISOString();
    const idempotencyKey = randomUUID();
    const path = `/api/institute/service-orders/${orderId}/calls`;
    const anonymous = await client();
    expect((await post(anonymous, path, { scheduledAt, idempotencyKey })).status()).toBe(401);
    await anonymous.dispose();

    const student = await client("student");
    expect((await post(student, path, { scheduledAt, idempotencyKey })).status()).toBe(404);
    await student.dispose();

    const otherInstitute = await client("otherInstitute");
    expect((await post(otherInstitute, path, { scheduledAt, idempotencyKey })).status()).toBe(404);
    await otherInstitute.dispose();

    const institute = await client("institute");
    const created = await post(institute, path, { scheduledAt, idempotencyKey });
    expect(created.status()).toBe(201);
    const createdBody = await created.json();
    const serviceCallId = createdBody.call.id as string;
    createdServiceCallId = serviceCallId;
    expect(createdBody.call).toMatchObject({ status: "scheduled", duplicate: false });

    const replay = await post(institute, path, { scheduledAt, idempotencyKey });
    expect(replay.status()).toBe(200);
    expect(await replay.json()).toMatchObject({ call: {
      id: serviceCallId, status: "scheduled", duplicate: true,
    } });
    expect((await post(institute, path, {
      scheduledAt: new Date(Date.now() + 120_000).toISOString(), idempotencyKey,
    })).status()).toBe(409);
    expect((await post(institute, path, {
      scheduledAt, idempotencyKey: randomUUID(),
    })).status()).toBe(409);
    const earlyStart = await post(institute,
      `/api/institute/service-calls/${serviceCallId}`, { action: "start" });
    expect(earlyStart.status()).toBe(409);
    expect(await earlyStart.json()).toMatchObject({ error: "call_too_early" });

    const started = await startInstituteServiceCall(
      users.institute, serviceCallId, new Date(Date.parse(scheduledAt) + 1_000),
    );
    expect(started).toMatchObject({ status: "started", duplicate: false });
    expect(await startInstituteServiceCall(
      users.institute, serviceCallId, new Date(Date.parse(scheduledAt) + 2_000),
    )).toMatchObject({ status: "started", duplicate: true });
    expect(await endInstituteServiceCall(
      users.institute, serviceCallId, new Date(Date.parse(scheduledAt) + 3_000),
    )).toMatchObject({ status: "ended", duplicate: false });
    expect(await endInstituteServiceCall(
      users.institute, serviceCallId, new Date(Date.parse(scheduledAt) + 4_000),
    )).toMatchObject({ status: "ended", duplicate: true });
    expect(await db.select().from(auditLogs).where(and(
      eq(auditLogs.entityType, "SERVICE_CALL"), eq(auditLogs.entityId, serviceCallId),
    ))).toHaveLength(3);
    const studentHistory = await client("student");
    expect(await (await studentHistory.get("/student/services/orders")).text()).toContain("زمان جلسه");
    await studentHistory.dispose();
    expect(await (await institute.get("/institute/service-orders")).text()).toContain("جلسه‌های خدمت");
    await institute.dispose();
  });

  test("serializes concurrent idempotent requests and allows unpaid cancellation", async () => {
    const student = await client("student");
    const path = `/api/student/services/${noConsentServiceId}/orders`;
    const [first, retry] = await Promise.all([
      post(student, path, { idempotencyKey: orderIdempotencyKey }),
      post(student, path, { idempotencyKey: orderIdempotencyKey }),
    ]);
    expect([first.status(), retry.status()].sort()).toEqual([200, 201]);
    const firstBody = await first.json();
    const retryBody = await retry.json();
    expect(firstBody.order.id).toBe(retryBody.order.id);
    const createdOrderId: string = firstBody.order.id;
    concurrentlyCreatedOrderId = createdOrderId;
    expect([firstBody.order.duplicate, retryBody.order.duplicate].sort()).toEqual([false, true]);
    expect(firstBody.order.status).toBe("awaiting_payment");

    const cancelPath = `/api/student/services/orders/${createdOrderId}/cancel`;
    const cancelled = await post(student, cancelPath, {});
    expect(cancelled.status()).toBe(200);
    expect(await cancelled.json()).toMatchObject({
      order: { id: createdOrderId, status: "cancelled", duplicate: false },
    });
    const replayedCancel = await post(student, cancelPath, {});
    expect(await replayedCancel.json()).toMatchObject({
      order: { id: createdOrderId, status: "cancelled", duplicate: true },
    });
    const [storedOrder] = await db.select().from(instituteServiceOrders)
      .where(eq(instituteServiceOrders.id, createdOrderId));
    expect(storedOrder?.paidAt).toBeNull();
    expect(storedOrder?.status).toBe("cancelled");
    await student.dispose();
  });
});
