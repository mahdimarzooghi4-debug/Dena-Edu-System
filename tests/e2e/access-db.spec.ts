import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { serializeSignedCookie } from "better-call";
import { test, expect, request, type APIRequestContext } from "@playwright/test";
import { getDb } from "../../src/db";
import { courses, memberships, session, supervisionGrants, user } from "../../src/db/schema";

// These tests require a disposable PostgreSQL with migrations already applied.
// They deliberately seed sessions into the test DB: public registration/OTP remains disabled.
test.describe.configure({ mode: "serial" });
test.describe("DB-backed actor and supervised-course access", () => {
  const db = getDb();
  const provider = randomUUID();
  const institute = randomUUID();
  const outsider = randomUUID();
  const organization = randomUUID();
  const providerScope = randomUUID();
  const instituteScope = randomUUID();
  const otherProviderScope = randomUUID();
  const otherOrgScope = randomUUID();
  const courseId = randomUUID();
  const tokens = {
    provider: randomUUID(),
    institute: randomUUID(),
    outsider: randomUUID(),
    organization: randomUUID(),
    expired: randomUUID(),
  };
  const baseURL = "http://127.0.0.1:3000";
  // Better Auth rejects raw session tokens; use its cookie signer (better-call).
  const cookie = (token: string) => serializeSignedCookie(
    "better-auth.session_token", token, process.env.BETTER_AUTH_SECRET!,
  ).then((setCookie) => setCookie.split(";")[0]);

  async function client(token?: string): Promise<APIRequestContext> {
    return request.newContext({
      baseURL,
      extraHTTPHeaders: token ? { Cookie: await cookie(token) } : {},
    });
  }

  test.beforeAll(async () => {
    await db.insert(user).values([
      { id: provider, name: "provider fixture", email: `${provider}@example.test` },
      { id: institute, name: "institute fixture", email: `${institute}@example.test` },
      { id: outsider, name: "outsider fixture", email: `${outsider}@example.test` },
      { id: organization, name: "organization fixture", email: `${organization}@example.test` },
    ]);
    await db.insert(memberships).values([
      { userId: provider, role: "provider", providerId: providerScope },
      { userId: institute, role: "institute", instituteId: instituteScope },
      { userId: outsider, role: "provider", providerId: otherProviderScope },
      { userId: organization, role: "organization", organizationId: otherOrgScope },
    ]);
    const future = new Date(Date.now() + 60 * 60 * 1000);
    const past = new Date(Date.now() - 60 * 1000);
    await db.insert(session).values([
      { userId: provider, token: tokens.provider, expiresAt: future },
      { userId: institute, token: tokens.institute, expiresAt: future },
      { userId: outsider, token: tokens.outsider, expiresAt: future },
      { userId: organization, token: tokens.organization, expiresAt: future },
      { userId: provider, token: tokens.expired, expiresAt: past },
    ]);
    await db.insert(courses).values({
      id: courseId, title: "integration fixture course",
      providerId: providerScope, responsibleInstituteId: instituteScope,
    });
    await db.insert(supervisionGrants).values({
      courseId, providerId: providerScope, instituteId: instituteScope,
      status: "approved", approvedByInstituteUserId: institute,
      approvedAt: new Date(),
    });
  });

  test.afterAll(async () => {
    await db.delete(courses).where(eq(courses.id, courseId));
    for (const id of [provider, institute, outsider, organization]) {
      await db.delete(user).where(eq(user.id, id));
    }
  });

  test("no cookie, or client-supplied role, cannot authenticate", async () => {
    const anonymous = await client();
    const me = await anonymous.get("/api/access/me?role=admin", {
      headers: { "X-Dena-Role": "admin" },
    });
    expect(me.status()).toBe(401);
    expect(me.headers()["cache-control"]).toContain("no-store");
    const course = await anonymous.get(`/api/courses/${courseId}/authorization`);
    expect(course.status()).toBe(401);
    await anonymous.dispose();
  });

  test("a live session resolves only active scopes from PostgreSQL", async () => {
    const providerClient = await client(tokens.provider);
    const response = await providerClient.get("/api/access/me?role=admin");
    expect(response.status()).toBe(200);
    expect(response.headers()["cache-control"]).toContain("no-store");
    expect(await response.json()).toEqual({
      userId: provider, memberships: [{ role: "provider", providerId: providerScope }],
    });
    const allowed = await providerClient.get(`/api/courses/${courseId}/authorization`);
    expect(allowed.status()).toBe(200);
    expect(await allowed.json()).toEqual({ courseId, authorized: true });
    await providerClient.dispose();
  });

  test("institute of same course is allowed, other tenants and roles denied", async () => {
    const instituteClient = await client(tokens.institute);
    const instituteResult = await instituteClient.get(
      `/api/courses/${courseId}/authorization`,
    );
    expect(instituteResult.status()).toBe(200);
    await instituteClient.dispose();

    for (const token of [tokens.outsider, tokens.organization]) {
      const crossTenant = await client(token);
      const result = await crossTenant.get(
        `/api/courses/${courseId}/authorization?role=institute`,
      );
      expect(result.status()).toBe(404);
      expect(result.headers()["cache-control"]).toContain("no-store");
      await crossTenant.dispose();
    }
  });

  test("requested/revoked course approval removes authorization immediately", async () => {
    const providerClient = await client(tokens.provider);
    for (const status of ["requested", "revoked"] as const) {
      await db.update(supervisionGrants).set({
        status, approvedAt: null, approvedByInstituteUserId: null,
      }).where(eq(supervisionGrants.courseId, courseId));
      const response = await providerClient.get(
        `/api/courses/${courseId}/authorization`,
      );
      expect(response.status()).toBe(404);
    }
    await providerClient.dispose();
  });

  test("suspended membership is denied even with a valid session", async () => {
    await db.update(memberships).set({ status: "suspended" })
      .where(eq(memberships.userId, provider));
    const providerClient = await client(tokens.provider);
    expect((await providerClient.get("/api/access/me")).status()).toBe(401);
    await providerClient.dispose();
  });

  test("expired/deleted session is denied", async () => {
    const expiredClient = await client(tokens.expired);
    expect((await expiredClient.get("/api/access/me")).status()).toBe(401);
    await expiredClient.dispose();
    await db.delete(session).where(eq(session.token, tokens.provider));
    const deletedClient = await client(tokens.provider);
    expect((await deletedClient.get("/api/access/me")).status()).toBe(401);
    await deletedClient.dispose();
  });
});
