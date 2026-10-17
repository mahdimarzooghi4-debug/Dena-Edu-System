import { eq } from "drizzle-orm";
import { serializeSignedCookie } from "better-call";
import { expect, request, test, type APIRequestContext } from "@playwright/test";
import { getDb } from "../../src/db";
import { memberships, session, user } from "../../src/db/schema";

test.describe.configure({ mode: "serial" });

test("media operations aggregate is private and admin-scoped", async () => {
  const db = getDb();
  const adminId = crypto.randomUUID();
  const studentId = crypto.randomUUID();
  const adminToken = crypto.randomUUID();
  const studentToken = crypto.randomUUID();
  const future = new Date(Date.now() + 60 * 60 * 1000);
  const cookie = (token: string) => serializeSignedCookie(
    "better-auth.session_token", token, process.env.BETTER_AUTH_SECRET!,
  ).then((value) => value.split(";")[0]);
  async function client(token?: string): Promise<APIRequestContext> {
    return request.newContext({
      baseURL: "http://127.0.0.1:3000",
      extraHTTPHeaders: token ? { Cookie: await cookie(token) } : {},
    });
  }

  await db.insert(user).values([
    { id: adminId, name: "ops admin fixture", email: `${adminId}@example.test` },
    { id: studentId, name: "ops student fixture", email: `${studentId}@example.test` },
  ]);
  await db.insert(memberships).values([
    { userId: adminId, role: "admin" },
    { userId: studentId, role: "student" },
  ]);
  await db.insert(session).values([
    { userId: adminId, token: adminToken, expiresAt: future },
    { userId: studentId, token: studentToken, expiresAt: future },
  ]);

  try {
    const anonymous = await client();
    const denied = await anonymous.get("/api/admin/media-operations");
    expect(denied.status()).toBe(401);
    await anonymous.dispose();

    const student = await client(studentToken);
    const forbidden = await student.get("/api/admin/media-operations");
    expect(forbidden.status()).toBe(403);
    await student.dispose();

    const admin = await client(adminToken);
    const response = await admin.get("/api/admin/media-operations");
    expect(response.status()).toBe(200);
    expect(response.headers()["cache-control"]).toContain("no-store");
    const payload = await response.json();
    expect(Object.keys(payload).sort()).toEqual(["cleanup", "ingests", "processing"]);
    expect(Object.keys(payload.ingests).sort()).toEqual([
      "quarantined", "ready", "rejected", "reserved", "uploading",
    ]);
    expect(Object.keys(payload.processing).sort()).toEqual(["dead", "done", "leased", "queued"]);
    expect(Object.keys(payload.cleanup).sort()).toEqual(["dead", "done", "leased", "pending"]);
    expect(JSON.stringify(payload)).not.toMatch(/uploadId|lastError|sha256|title/i);
    for (const section of Object.values(payload as Record<string, Record<string, number>>)) {
      for (const total of Object.values(section)) expect(total).toEqual(expect.any(Number));
    }
    await admin.dispose();
  } finally {
    await db.delete(user).where(eq(user.id, adminId));
    await db.delete(user).where(eq(user.id, studentId));
  }
});
