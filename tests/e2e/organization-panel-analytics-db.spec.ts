import { randomUUID } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { serializeSignedCookie } from "better-call";
import { test, expect, request, type APIRequestContext } from "@playwright/test";
import { getDb } from "../../src/db";
import {
  memberships, organizationStudents, session, user, verifiedEntities,
} from "../../src/db/schema";
import { getOrganizationPanelSnapshot } from "../../src/server/organization/analytics";
import { getOrganizationScopes } from "../../src/server/organization/scopes";

test.describe.configure({ mode: "serial" });
test.describe("organization reports use only active tenant scopes", () => {
  const db = getDb();
  const actorId = randomUUID();
  const organizationId = randomUUID();
  const otherOrganizationId = randomUUID();
  const verifiedStudentId = randomUUID();
  const pendingStudentId = randomUUID();
  const otherStudentId = randomUUID();
  const rosterIds = [randomUUID(), randomUUID(), randomUUID()];
  const token = randomUUID();
  const baseURL = "http://127.0.0.1:3000";

  async function cookie() {
    const setCookie = await serializeSignedCookie(
      "better-auth.session_token", token, process.env.BETTER_AUTH_SECRET!,
    );
    return setCookie.split(";")[0];
  }

  async function client(): Promise<APIRequestContext> {
    return request.newContext({ baseURL, extraHTTPHeaders: { Cookie: await cookie() } });
  }

  test.beforeAll(async () => {
    await db.insert(user).values([
      { id: actorId, name: "organization analytics fixture", email: actorId + "@example.test" },
      { id: verifiedStudentId, name: "verified fixture", email: verifiedStudentId + "@example.test", phoneNumberVerified: true },
      { id: pendingStudentId, name: "pending fixture", email: pendingStudentId + "@example.test" },
      { id: otherStudentId, name: "other tenant fixture", email: otherStudentId + "@example.test" },
    ]);
    await db.insert(verifiedEntities).values([
      { id: organizationId, role: "organization", name: "سازمان آزمایشی مجاز", evidenceReference: "fixture-ref-1", verifiedByUserId: actorId },
      { id: otherOrganizationId, role: "organization", name: "سازمان خارج از دسترس", evidenceReference: "fixture-ref-2", verifiedByUserId: actorId },
    ]);
    await db.insert(memberships).values({ userId: actorId, role: "organization", organizationId });
    await db.insert(session).values({
      userId: actorId, token, expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    });
    const createdAt = new Date();
    const baseStudent = {
      nationalCodeCiphertext: "fixture-encrypted", birthDate: "2010-01-01",
      gender: "prefer_not_to_say", createdByUserId: actorId,
      guardianConsentConfirmedAt: createdAt,
      guardianConsentConfirmedByUserId: actorId, source: "manual" as const, createdAt,
    };
    await db.insert(organizationStudents).values([
      { ...baseStudent, id: rosterIds[0], organizationId, userId: verifiedStudentId, firstName: "verified", lastName: "fixture", nationalCodeHash: randomUUID(), nationalCodeLast4: "1001" },
      { ...baseStudent, id: rosterIds[1], organizationId, userId: pendingStudentId, firstName: "pending", lastName: "fixture", nationalCodeHash: randomUUID(), nationalCodeLast4: "1002", source: "bulk" },
      { ...baseStudent, id: rosterIds[2], organizationId: otherOrganizationId, userId: otherStudentId, firstName: "outside", lastName: "fixture", nationalCodeHash: randomUUID(), nationalCodeLast4: "1003", source: "api" },
    ]);
  });

  test.afterAll(async () => {
    await db.delete(organizationStudents).where(inArray(organizationStudents.id, rosterIds));
    await db.delete(session).where(eq(session.token, token));
    await db.delete(memberships).where(eq(memberships.userId, actorId));
    await db.delete(verifiedEntities).where(inArray(
      verifiedEntities.id, [organizationId, otherOrganizationId],
    ));
    await db.delete(user).where(inArray(user.id, [
      actorId, verifiedStudentId, pendingStudentId, otherStudentId,
    ]));
  });

  test("snapshot is aggregate-only and excludes another organization", async () => {
    const scopes = await getOrganizationScopes(actorId);
    expect(scopes.map((scope) => scope.id)).toEqual([organizationId]);
    const snapshot = await getOrganizationPanelSnapshot(scopes);
    expect(snapshot.totals).toEqual({
      students: 2, phoneVerified: 1, activationPending: 1,
    });
    expect(snapshot.organizations).toEqual([{
      id: organizationId, name: "سازمان آزمایشی مجاز",
      students: 2, phoneVerified: 1, activationPending: 1,
    }]);
    expect(snapshot.months).toHaveLength(6);
    expect(snapshot.months.reduce((sum, item) => sum + item.registrations, 0)).toBe(2);
    expect(JSON.stringify(snapshot)).not.toContain("nationalCode");
    expect(JSON.stringify(snapshot)).not.toContain("verified fixture");
  });

  test("organization pages require the signed organization session", async () => {
    const organization = await client();
    for (const path of [
      "/organization/reports", "/organization/growth", "/organization/notifications",
    ]) {
      const response = await organization.get(path);
      expect(response.status()).toBe(200);
      expect(response.headers()["cache-control"]).toContain("no-store");
    }
    const pending = await organization.get("/organization/students?activation=pending");
    expect(pending.status()).toBe(200);
    const pendingHtml = await pending.text();
    expect(pendingHtml).toContain("فهرست فقط پرونده‌های در انتظار تأیید شماره را نشان می‌دهد");
    expect(pendingHtml).toContain("pending fixture");
    expect(pendingHtml).not.toContain("verified fixture");
    await organization.dispose();
  });
});
