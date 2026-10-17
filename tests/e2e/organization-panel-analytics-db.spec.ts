import { randomUUID } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import { serializeSignedCookie } from "better-call";
import { test, expect, request, type APIRequestContext } from "@playwright/test";
import { getDb } from "../../src/db";
import {
  auditLogs, memberships, organizationApiKeys, organizationStudents, rateLimit,
  session, user, verifiedEntities,
} from "../../src/db/schema";
import { getOrganizationPanelSnapshot } from "../../src/server/organization/analytics";
import { reserveOrganizationApiKeyRequest } from "../../src/server/organization/api-keys";
import { getOrganizationScopes } from "../../src/server/organization/scopes";

test.describe.configure({ mode: "serial" });
test.describe("organization reports use only active tenant scopes", () => {
  const db = getDb();
  const actorId = randomUUID();
  const organizationId = randomUUID();
  const secondOrganizationId = randomUUID();
  const otherOrganizationId = randomUUID();
  const verifiedStudentId = randomUUID();
  const pendingStudentId = randomUUID();
  const secondPendingStudentId = randomUUID();
  const otherStudentId = randomUUID();
  const rosterIds = [randomUUID(), randomUUID(), randomUUID(), randomUUID()];
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
      { id: secondPendingStudentId, name: "second pending fixture", email: secondPendingStudentId + "@example.test" },
      { id: otherStudentId, name: "other tenant fixture", email: otherStudentId + "@example.test" },
    ]);
    await db.insert(verifiedEntities).values([
      { id: organizationId, role: "organization", name: "سازمان آزمایشی مجاز", evidenceReference: "fixture-ref-1", verifiedByUserId: actorId },
      { id: secondOrganizationId, role: "organization", name: "سازمان دوم مجاز", evidenceReference: "fixture-ref-3", verifiedByUserId: actorId },
      { id: otherOrganizationId, role: "organization", name: "سازمان خارج از دسترس", evidenceReference: "fixture-ref-2", verifiedByUserId: actorId },
    ]);
    await db.insert(memberships).values([
      { userId: actorId, role: "organization", organizationId },
      { userId: actorId, role: "organization", organizationId: secondOrganizationId },
    ]);
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
      { ...baseStudent, id: rosterIds[2], organizationId: secondOrganizationId, userId: secondPendingStudentId, firstName: "second", lastName: "pending", nationalCodeHash: randomUUID(), nationalCodeLast4: "1004", source: "api" },
      { ...baseStudent, id: rosterIds[3], organizationId: otherOrganizationId, userId: otherStudentId, firstName: "outside", lastName: "fixture", nationalCodeHash: randomUUID(), nationalCodeLast4: "1003", source: "api" },
    ]);
  });

  test.afterAll(async () => {
    await db.delete(organizationStudents).where(inArray(organizationStudents.id, rosterIds));
    await db.delete(session).where(eq(session.token, token));
    await db.delete(memberships).where(eq(memberships.userId, actorId));
    await db.delete(verifiedEntities).where(inArray(
      verifiedEntities.id, [organizationId, secondOrganizationId, otherOrganizationId],
    ));
    await db.delete(user).where(inArray(user.id, [
      actorId, verifiedStudentId, pendingStudentId, secondPendingStudentId, otherStudentId,
    ]));
  });

  test("snapshot is aggregate-only and excludes another organization", async () => {
    const scopes = await getOrganizationScopes(actorId);
    expect(scopes.map((scope) => scope.id).sort()).toEqual([organizationId, secondOrganizationId].sort());
    const snapshot = await getOrganizationPanelSnapshot(scopes);
    expect(snapshot.totals).toEqual({
      students: 3, phoneVerified: 1, activationPending: 2,
    });
    expect(snapshot.organizations.find((row) => row.id === organizationId)).toEqual({
      id: organizationId, name: "سازمان آزمایشی مجاز", students: 2, phoneVerified: 1, activationPending: 1,
    });
    expect(snapshot.organizations.find((row) => row.id === secondOrganizationId)).toEqual({
      id: secondOrganizationId, name: "سازمان دوم مجاز", students: 1, phoneVerified: 0, activationPending: 1,
    });
    expect(snapshot.months).toHaveLength(6);
    expect(snapshot.months.reduce((sum, item) => sum + item.registrations, 0)).toBe(3);
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
    const pending = await organization.get(`/organization/students?activation=pending&organizationId=${secondOrganizationId}`);
    expect(pending.status()).toBe(200);
    const pendingHtml = await pending.text();
    expect(pendingHtml).toContain("فهرست فقط پرونده‌های در انتظار تأیید شماره را نشان می‌دهد");
    expect(pendingHtml).toContain("سازمان دوم مجاز");
    expect(pendingHtml).toContain(`value="${secondOrganizationId}" selected=""`);
    expect(pendingHtml).toContain(`href="/organization/students?organizationId=${secondOrganizationId}"`);
    expect(pendingHtml).toContain("second<!-- --> <!-- -->pending");
    expect(pendingHtml).not.toContain("pending<!-- --> <!-- -->fixture");
    expect(pendingHtml).not.toContain("verified fixture");

    const pageOneResponse = await organization.get("/api/organization/students?limit=2");
    expect(pageOneResponse.status()).toBe(200);
    const pageOne = await pageOneResponse.json();
    expect(pageOne.students).toHaveLength(2);
    expect(pageOne.pageSize).toBe(2);
    expect(typeof pageOne.nextCursor).toBe("string");
    const pageTwoResponse = await organization.get(
      `/api/organization/students?limit=2&cursor=${encodeURIComponent(pageOne.nextCursor)}`,
    );
    expect(pageTwoResponse.status()).toBe(200);
    const pageTwo = await pageTwoResponse.json();
    expect(pageTwo.students).toHaveLength(1);
    expect(pageTwo.nextCursor).toBeNull();
    expect(new Set([...pageOne.students, ...pageTwo.students].map((student: { id: string }) => student.id)).size).toBe(3);

    const scopedResponse = await organization.get(
      `/api/organization/students?organizationId=${secondOrganizationId}&activation=pending`,
    );
    expect(scopedResponse.status()).toBe(200);
    expect((await scopedResponse.json()).students.map((student: { id: string }) => student.id))
      .toEqual([rosterIds[2]]);
    expect((await organization.get(`/api/organization/students?organizationId=${otherOrganizationId}`)).status())
      .toBe(404);
    const searched = await organization.get("/api/organization/students?q=second");
    expect(searched.status()).toBe(200);
    expect((await searched.json()).students.map((student: { id: string }) => student.id))
      .toEqual([rosterIds[2]]);
    const wildcard = await organization.get("/api/organization/students?q=%25");
    expect(wildcard.status()).toBe(200);
    expect((await wildcard.json()).students).toEqual([]);
    const searchedPage = await organization.get(
      `/organization/students?organizationId=${secondOrganizationId}&q=second`,
    );
    expect(searchedPage.status()).toBe(200);
    expect(await searchedPage.text()).toContain("second<!-- --> <!-- -->pending");
    expect((await organization.get("/api/organization/students?limit=101")).status()).toBe(400);
    expect((await organization.get(`/api/organization/students?q=${"x".repeat(101)}`)).status()).toBe(400);
    expect((await organization.get("/api/organization/students?cursor=not-a-cursor")).status()).toBe(400);
    await organization.dispose();
  });

  test("organization selector reloads the server-scoped roster", async ({ page }) => {
    const setCookie = await serializeSignedCookie(
      "better-auth.session_token", token, process.env.BETTER_AUTH_SECRET!,
    );
    const cookiePair = setCookie.split(";")[0];
    const separator = cookiePair.indexOf("=");
    await page.context().addCookies([{
      name: cookiePair.slice(0, separator), value: cookiePair.slice(separator + 1),
      url: baseURL, httpOnly: true, sameSite: "Lax",
    }]);
    await page.goto(`${baseURL}/organization/students?organizationId=${organizationId}`);
    await expect(page.locator("tbody")).toContainText("verified");
    await page.getByLabel("سازمان فعال").selectOption(secondOrganizationId);
    await expect(page).toHaveURL(new RegExp(`organizationId=${secondOrganizationId}`));
    await expect(page.locator("tbody")).toContainText("second");
    await expect(page.locator("tbody")).not.toContainText("verified");
  });

  test("concurrent duplicate student creation returns one conflict", async () => {
    const organization = await client();
    const phone = () => `+989${randomUUID().replace(/[^0-9]/g, "").padEnd(9, "7").slice(0, 9)}`;
    const payload = (phoneNumber: string) => ({
      organizationId,
      student: {
        firstName: "هم‌زمان", lastName: "آزمایشی", nationalCode: "1234567891",
        birthDate: "2010-01-01", gender: "prefer_not_to_say", phoneNumber,
      },
      guardianConsentConfirmed: true,
    });
    let createdStudentId: string | undefined;

    try {
      const origin = new URL(process.env.BETTER_AUTH_URL!).origin;
      const responses = await Promise.all([
        organization.post("/api/organization/students", {
          headers: { Origin: origin }, data: payload(phone()),
        }),
        organization.post("/api/organization/students", {
          headers: { Origin: origin }, data: payload(phone()),
        }),
      ]);
      expect(responses.map((response) => response.status()).sort()).toEqual([201, 409]);
      const successfulResponse = responses.find((response) => response.status() === 201);
      expect(successfulResponse).toBeDefined();
      const result = await successfulResponse!.json();
      const studentId: string = result.student.id;
      createdStudentId = studentId;
      const [created] = await db.select({ id: organizationStudents.id, userId: organizationStudents.userId })
        .from(organizationStudents).where(eq(organizationStudents.id, studentId)).limit(1);
      expect(created).toBeDefined();
    } finally {
      if (createdStudentId) {
        const [created] = await db.select({ userId: organizationStudents.userId })
          .from(organizationStudents).where(eq(organizationStudents.id, createdStudentId)).limit(1);
        await db.delete(auditLogs).where(eq(auditLogs.entityId, createdStudentId));
        await db.delete(organizationStudents).where(eq(organizationStudents.id, createdStudentId));
        if (created) {
          await db.delete(memberships).where(eq(memberships.userId, created.userId));
          await db.delete(user).where(eq(user.id, created.userId));
        }
      }
      await organization.dispose();
    }
  });

  test("organization API keys are one-time, scoped, consent-gated, and revocable", async () => {
    const organization = await client();
    const origin = new URL(process.env.BETTER_AUTH_URL!).origin;
    const phoneNumber = `+989${randomUUID().replace(/[^0-9]/g, "").padEnd(9, "7").slice(0, 9)}`;
    let keyId: string | undefined;
    let rotatedKeyId: string | undefined;
    let secret: string | undefined;
    let rotatedSecret: string | undefined;
    let studentId: string | undefined;

    try {
      const createdKey = await organization.post("/api/organization/api-keys", {
        headers: { Origin: origin },
        data: { organizationId, label: "integration lifecycle" },
      });
      expect(createdKey.status()).toBe(201);
      expect(createdKey.headers()["cache-control"]).toContain("no-store");
      const keyResult = await createdKey.json();
      keyId = keyResult.key.id;
      secret = keyResult.key.secret;
      expect(secret).toMatch(/^dena_org_[A-Za-z0-9_-]{40,60}$/);

      const keyList = await organization.get("/api/organization/api-keys");
      expect(keyList.status()).toBe(200);
      const listed = await keyList.json();
      expect(listed.keys).toEqual(expect.arrayContaining([
        expect.objectContaining({ id: keyId, prefix: keyResult.key.prefix }),
      ]));
      expect(JSON.stringify(listed)).not.toContain(secret);

      const student = {
        firstName: "کلید", lastName: "سازمانی", nationalCode: "1234567891",
        birthDate: "2010-01-01", gender: "prefer_not_to_say", phoneNumber: phoneNumber,
      };
      const deniedConsent = await organization.post("/api/v1/organization/students", {
        headers: { Authorization: `Bearer ${secret}` }, data: student,
      });
      expect(deniedConsent.status()).toBe(400);

      const accepted = await organization.post("/api/v1/organization/students", {
        headers: { Authorization: `Bearer ${secret}` },
        data: { ...student, guardianConsentConfirmed: true },
      });
      expect(accepted.status()).toBe(201);
      studentId = (await accepted.json()).student.id;

      const rotated = await organization.post("/api/organization/api-keys", {
        headers: { Origin: origin },
        data: { organizationId, label: "rotated integration", rotateFromKeyId: keyId },
      });
      expect(rotated.status()).toBe(201);
      const rotatedResult = await rotated.json();
      rotatedKeyId = rotatedResult.key.id;
      rotatedSecret = rotatedResult.key.secret;
      expect(rotatedSecret).not.toBe(secret);

      const oldKeyRequest = await organization.post("/api/v1/organization/students", {
        headers: { Authorization: `Bearer ${secret}` },
        data: { ...student, guardianConsentConfirmed: true },
      });
      expect(oldKeyRequest.status()).toBe(401);
      const newKeyRequest = await organization.post("/api/v1/organization/students", {
        headers: { Authorization: `Bearer ${rotatedSecret}` },
        data: { ...student, guardianConsentConfirmed: true },
      });
      expect(newKeyRequest.status()).toBe(409);
      const concurrentReservations = await Promise.all(Array.from(
        { length: 59 }, () => reserveOrganizationApiKeyRequest(rotatedKeyId!),
      ));
      expect(concurrentReservations.every(Boolean)).toBe(true);
      const overLimit = await organization.post("/api/v1/organization/students", {
        headers: { Authorization: `Bearer ${rotatedSecret}` },
        data: { ...student, guardianConsentConfirmed: true },
      });
      expect(overLimit.status()).toBe(429);

      const revoked = await organization.delete(`/api/organization/api-keys/${rotatedKeyId}`, {
        headers: { Origin: origin },
      });
      expect(revoked.status()).toBe(200);
      const revokedKeyRequest = await organization.post("/api/v1/organization/students", {
        headers: { Authorization: `Bearer ${rotatedSecret}` },
        data: { ...student, guardianConsentConfirmed: true },
      });
      expect(revokedKeyRequest.status()).toBe(401);
    } finally {
      if (studentId) {
        const [created] = await db.select({ userId: organizationStudents.userId })
          .from(organizationStudents).where(eq(organizationStudents.id, studentId)).limit(1);
        await db.delete(auditLogs).where(eq(auditLogs.entityId, studentId));
        await db.delete(organizationStudents).where(eq(organizationStudents.id, studentId));
        if (created) {
          await db.delete(memberships).where(eq(memberships.userId, created.userId));
          await db.delete(user).where(eq(user.id, created.userId));
        }
      }
      const keyIds = [keyId, rotatedKeyId].filter((id): id is string => Boolean(id));
      if (keyIds.length) {
        await db.delete(auditLogs).where(inArray(auditLogs.entityId, keyIds));
        await db.delete(organizationApiKeys).where(inArray(organizationApiKeys.id, keyIds));
        await db.delete(rateLimit).where(inArray(
          rateLimit.key, keyIds.map((id) => `organization-api:${id}`),
        ));
      }
      await organization.dispose();
    }
  });

  test("organization CSV import enforces consent, scope, row validation, and partial results", async () => {
    const organization = await client();
    const origin = new URL(process.env.BETTER_AUTH_URL!).origin;
    const suffix = randomUUID().slice(0, 8);
    const firstName = `batch-${suffix}`;
    const secondName = `batch-new-${suffix}`;
    const phone = (seed: string) => `+989${[...seed.replace(/-/g, "")]
      .map((char) => Number.parseInt(char, 16) % 10).join("").slice(0, 9)}`;
    const nationalCode = (seed: string) => {
      const digits = seed.replace(/[^0-9]/g, "").padEnd(9, "3").slice(0, 9);
      const total = digits.split("").reduce((sum, digit, index) =>
        sum + Number(digit) * (10 - index), 0);
      const remainder = total % 11;
      return `${digits}${remainder < 2 ? remainder : 11 - remainder}`;
    };
    const first = {
      firstName, lastName: "ورود گروهی", nationalCode: nationalCode(randomUUID()),
      birthDate: "2010-01-01", gender: "prefer_not_to_say", phoneNumber: phone(randomUUID()),
    };
    const second = {
      firstName: secondName, lastName: "ورود گروهی", nationalCode: nationalCode(randomUUID()),
      birthDate: "2010-01-01", gender: "prefer_not_to_say", phoneNumber: phone(randomUUID()),
    };
    const csv = (...records: typeof first[]) => [
      "firstName,lastName,nationalCode,birthDate,gender,phoneNumber",
      ...records.map((record) => [
        record.firstName, record.lastName, record.nationalCode, record.birthDate,
        record.gender, record.phoneNumber,
      ].join(",")),
    ].join("\n");
    const upload = (contents: string, consent: boolean, scope = organizationId) =>
      organization.post("/api/organization/students/import", {
        headers: { Origin: origin },
        multipart: {
          file: { name: "students.csv", mimeType: "text/csv", buffer: Buffer.from(contents) },
          organizationId: scope,
          guardianConsentConfirmed: String(consent),
        },
      });

    try {
      expect((await upload(csv(first), false)).status()).toBe(400);
      expect((await upload(csv(first), true, otherOrganizationId)).status()).toBe(400);
      const duplicateFile = await upload(csv(first, first), true);
      expect(duplicateFile.status()).toBe(400);
      expect(await duplicateFile.json()).toMatchObject({ imported: 0, errors: [{ row: 3, error: "duplicate_in_file" }] });

      const firstImport = await upload(csv(first), true);
      expect(firstImport.status()).toBe(201);
      expect(await firstImport.json()).toMatchObject({ imported: 1, errors: [] });

      const partialImport = await upload(csv(first, second), true);
      expect(partialImport.status()).toBe(207);
      expect(await partialImport.json()).toMatchObject({
        imported: 1, errors: [{ row: 2, error: "already_exists" }],
      });
      const importedRows = await db.select({ id: organizationStudents.id, userId: organizationStudents.userId })
        .from(organizationStudents).where(and(
          eq(organizationStudents.organizationId, organizationId),
          inArray(organizationStudents.firstName, [firstName, secondName]),
        ));
      expect(importedRows).toHaveLength(2);
    } finally {
      const createdRows = await db.select({ id: organizationStudents.id, userId: organizationStudents.userId })
        .from(organizationStudents).where(and(
          eq(organizationStudents.organizationId, organizationId),
          inArray(organizationStudents.firstName, [firstName, secondName]),
        ));
      if (createdRows.length) {
        await db.delete(auditLogs).where(inArray(auditLogs.entityId, createdRows.map((row) => row.id)));
        await db.delete(organizationStudents).where(inArray(
          organizationStudents.id, createdRows.map((row) => row.id),
        ));
        const createdUserIds = createdRows.map((row) => row.userId);
        await db.delete(memberships).where(inArray(memberships.userId, createdUserIds));
        await db.delete(user).where(inArray(user.id, createdUserIds));
      }
      await organization.dispose();
    }
  });
});
