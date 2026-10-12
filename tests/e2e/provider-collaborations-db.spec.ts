import { randomUUID } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import { serializeSignedCookie } from "better-call";
import { expect, request, test, type APIRequestContext } from "@playwright/test";
import { getDb } from "../../src/db";
import {
  auditLogs, memberships, providerInstituteCollaborationEvents,
  providerInstituteCollaborations, session, user, verifiedEntities,
} from "../../src/db/schema";

test.describe.configure({ mode: "serial" });

test.describe("provider collaboration withdrawal", () => {
  const db = getDb();
  const users = {
    admin: randomUUID(), provider: randomUUID(), providerMember: randomUUID(),
    institute: randomUUID(),
  };
  const tokens = {
    provider: randomUUID(), providerMember: randomUUID(), institute: randomUUID(),
  };
  const providerId = randomUUID();
  const instituteId = randomUUID();
  const requestId = randomUUID();
  let collaborationId = "";

  async function client(as?: keyof typeof tokens): Promise<APIRequestContext> {
    const cookie = as ? await serializeSignedCookie(
      "better-auth.session_token", tokens[as], process.env.BETTER_AUTH_SECRET!,
    ) : undefined;
    return request.newContext({ baseURL: "http://localhost:3000",
      extraHTTPHeaders: cookie ? { Cookie: cookie.split(";")[0] } : {} });
  }
  const post = (ctx: APIRequestContext, path: string, data: object) =>
    ctx.post(path, { data, headers: { Origin: "http://localhost:3000" } });
  const collaborationPath = (id: string) => `/api/provider/collaborations/${id}`;

  test.beforeAll(async () => {
    await db.insert(user).values(Object.entries(users).map(([name, id]) => ({
      id, name, email: `${id}@provider-collaboration.example.test`,
    })));
    await db.insert(verifiedEntities).values([
      { id: providerId, role: "provider", name: "withdrawal provider",
        evidenceReference: "test/collaboration-provider", verifiedByUserId: users.admin },
      { id: instituteId, role: "institute", name: "withdrawal institute",
        evidenceReference: "test/collaboration-institute", verifiedByUserId: users.admin },
    ]);
    await db.insert(memberships).values([
      { userId: users.admin, role: "admin" },
      { userId: users.provider, role: "provider", providerId },
      { userId: users.providerMember, role: "provider", providerId },
      { userId: users.institute, role: "institute", instituteId },
    ]);
    const expiresAt = new Date(Date.now() + 3_600_000);
    await db.insert(session).values(Object.entries(tokens).map(([name, token]) => ({
      userId: users[name as keyof typeof users], token, expiresAt,
    })));
  });

  test.afterAll(async () => {
    const collaborationIds = await db.select({ id: providerInstituteCollaborations.id })
      .from(providerInstituteCollaborations).where(eq(providerInstituteCollaborations.providerId, providerId));
    if (collaborationIds.length) {
      const ids = collaborationIds.map((item) => item.id);
      await db.delete(providerInstituteCollaborationEvents)
        .where(inArray(providerInstituteCollaborationEvents.collaborationId, ids));
      await db.delete(auditLogs).where(and(
        eq(auditLogs.entityType, "PROVIDER_COLLABORATION"), inArray(auditLogs.entityId, ids),
      ));
      await db.delete(providerInstituteCollaborations)
        .where(inArray(providerInstituteCollaborations.id, ids));
    }
    await db.delete(auditLogs).where(inArray(auditLogs.actorId, Object.values(users)));
    await db.delete(session).where(inArray(session.userId, Object.values(users)));
    await db.delete(memberships).where(inArray(memberships.userId, Object.values(users)));
    await db.delete(verifiedEntities).where(inArray(verifiedEntities.id, [providerId, instituteId]));
    await db.delete(user).where(inArray(user.id, Object.values(users)));
  });

  test("only the request owner can withdraw while institute review is pending", async () => {
    const anonymous = await client();
    expect((await anonymous.delete(collaborationPath(randomUUID()), {
      headers: { Origin: "http://localhost:3000" },
    })).status()).toBe(401);
    await anonymous.dispose();

    const provider = await client("provider");
    const created = await post(provider, "/api/provider/collaborations", {
      providerId, instituteId, clientRequestId: requestId,
    });
    expect(created.status()).toBe(201);
    collaborationId = (await created.json() as { id: string }).id;
    const path = collaborationPath(collaborationId);

    expect((await provider.delete(path, {
      headers: { Origin: "https://attacker.invalid" },
    })).status()).toBe(403);
    const member = await client("providerMember");
    expect((await member.delete(path, {
      headers: { Origin: "http://localhost:3000" },
    })).status()).toBe(403);
    await member.dispose();

    const withdrawn = await provider.delete(path, {
      headers: { Origin: "http://localhost:3000" },
    });
    expect(withdrawn.status()).toBe(200);
    expect(await withdrawn.json()).toMatchObject({ id: collaborationId, status: "withdrawn", duplicate: false });
    const replay = await provider.delete(path, {
      headers: { Origin: "http://localhost:3000" },
    });
    expect(await replay.json()).toMatchObject({ id: collaborationId, status: "withdrawn", duplicate: true });

    const institute = await client("institute");
    expect((await post(institute,
      `/api/institute/collaborations/${collaborationId}/decision`,
      { action: "approve", reason: "درخواست پس از لغو نباید پذیرفته شود" },
    )).status()).toBe(409);
    await institute.dispose();

    const [record] = await db.select().from(providerInstituteCollaborations)
      .where(eq(providerInstituteCollaborations.id, collaborationId));
    expect(record?.status).toBe("requested");
    expect(record?.withdrawnAt).toBeInstanceOf(Date);
    const events = await db.select().from(providerInstituteCollaborationEvents)
      .where(eq(providerInstituteCollaborationEvents.collaborationId, collaborationId));
    expect(events.map((event) => event.kind)).toEqual(["requested", "provider_withdrew"]);
    expect(await db.select().from(auditLogs).where(and(
      eq(auditLogs.action, "provider.collaboration.withdrawn"),
      eq(auditLogs.entityId, collaborationId),
    ))).toHaveLength(1);

    const retry = await (await provider.get("/api/provider/collaborations")).json() as {
      collaborations: Array<{ id: string; status: string }>;
    };
    expect(retry.collaborations.find((item) => item.id === collaborationId)?.status).toBe("withdrawn");
    const newRequest = await post(provider, "/api/provider/collaborations", {
      providerId, instituteId, clientRequestId: randomUUID(),
    });
    expect(newRequest.status()).toBe(201);
    await provider.dispose();
  });
});
