import { createHash, randomUUID } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import { serializeSignedCookie } from "better-call";
import { expect, request, test, type APIRequestContext } from "@playwright/test";
import { getDb } from "../../src/db";
import {
  courses, mediaIngests, memberships, privateMediaAssets, session,
  studentEnrollments, supervisionGrants, user, verifiedEntities,
} from "../../src/db/schema";

test.describe.configure({ mode: "serial" });

test.describe("pilot quarantine ingest and independent worker attestation", () => {
  const db = getDb();
  const users = {
    admin: randomUUID(), provider: randomUUID(),
    institute: randomUUID(), student: randomUUID(), outsider: randomUUID(),
  };
  const tokens = Object.fromEntries(Object.keys(users).map((name) =>
    [name, randomUUID()])) as Record<keyof typeof users, string>;
  const providerId = randomUUID(), instituteId = randomUUID();
  const courseId = randomUUID();
  const fixture = Buffer.from(
    "00000018667479706d7034326d70343269736f6d00000000", "hex",
  );
  const sha256 = createHash("sha256").update(fixture).digest("hex");
  const body = {
    title: "بخش مقدماتی نظارت‌شده",
    clientRequestId: randomUUID(),
    expectedBytes: fixture.length,
    sha256,
  };
  const path = `/api/provider/courses/${courseId}/media-ingest`;
  const uploadPath = (id: string) => `${path}/${id}`;
  const callbackPath = (id: string) => `/api/internal/media-ingest/${id}/complete`;

  async function client(as?: keyof typeof users): Promise<APIRequestContext> {
    const cookie = as ? await serializeSignedCookie(
      "better-auth.session_token", tokens[as],
      process.env.BETTER_AUTH_SECRET!,
    ) : undefined;
    return request.newContext({
      baseURL: "http://localhost:3000",
      extraHTTPHeaders: cookie ? { Cookie: cookie.split(";")[0] } : {},
    });
  }
  function post(ctx: APIRequestContext, data: object) {
    return ctx.post(path, {
      data, headers: { Origin: "http://localhost:3000" },
    });
  }
  function upload(ctx: APIRequestContext, id: string, data: Buffer,
      extra: Record<string, string> = {}) {
    return ctx.put(uploadPath(id), {
      data, headers: {
        Origin: "http://localhost:3000",
        "Content-Type": "video/mp4",
        ...extra,
      },
    });
  }
  async function worker(ctx: APIRequestContext, id: string,
      token = process.env.DENA_MEDIA_PROCESSOR_TOKEN!) {
    return ctx.post(callbackPath(id), {
      data: {}, headers: { Authorization: `Bearer ${token}` },
    });
  }
  async function processMock(uploadId: string, assetId: string) {
    const response = await fetch(
      `http://127.0.0.1:4318/__test__/process/${uploadId}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.DENA_PRIVATE_MEDIA_ORIGIN_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ courseId, assetId }),
      },
    );
    return response.status;
  }

  test.beforeAll(async () => {
    await db.insert(user).values(Object.entries(users).map(([name, id]) => ({
      id, name, email: `${id}@example.test`,
    })));
    await db.insert(verifiedEntities).values([
      { id: providerId, role: "provider", name: "test provider",
        evidenceReference: "ci/provider-verify", verifiedByUserId: users.admin },
      { id: instituteId, role: "institute", name: "test institute",
        evidenceReference: "ci/institute-verify", verifiedByUserId: users.admin },
    ]);
    await db.insert(memberships).values([
      { userId: users.provider, role: "provider", providerId },
      { userId: users.institute, role: "institute", instituteId },
      { userId: users.student, role: "student" },
      { userId: users.admin, role: "admin" },
      { userId: users.outsider, role: "student" },
    ]);
    await db.insert(session).values(Object.entries(tokens).map(([name, token]) => ({
      userId: users[name as keyof typeof users],
      token, expiresAt: new Date(Date.now() + 3_600_000),
    })));
    await db.insert(courses).values({
      id: courseId, providerId, responsibleInstituteId: instituteId,
      title: "دوره آزمایشی ingest ایمن",
      createdByProviderUserId: users.provider, clientRequestId: randomUUID(),
    });
    await db.insert(supervisionGrants).values({
      courseId, providerId, instituteId,
      status: "approved", requestedByProviderUserId: users.provider,
      approvedByInstituteUserId: users.institute, approvedAt: new Date(),
    });
  });

  test.afterAll(async () => {
    await db.delete(studentEnrollments)
      .where(eq(studentEnrollments.courseId, courseId));
    await db.delete(privateMediaAssets)
      .where(eq(privateMediaAssets.courseId, courseId));
    await db.delete(mediaIngests)
      .where(eq(mediaIngests.courseId, courseId));
    await db.delete(supervisionGrants)
      .where(eq(supervisionGrants.courseId, courseId));
    await db.delete(courses).where(eq(courses.id, courseId));
    await db.delete(memberships)
      .where(inArray(memberships.userId, Object.values(users)));
    await db.delete(verifiedEntities)
      .where(inArray(verifiedEntities.id, [providerId, instituteId]));
    await db.delete(user).where(inArray(user.id, Object.values(users)));
  });

  test("only active scoped provider may reserve; no arbitrary path, claim or replay change", async () => {
    const anonymous = await client();
    expect((await post(anonymous, body)).status()).toBe(401);
    expect((await worker(anonymous, randomUUID())).status()).toBe(404);
    await anonymous.dispose();
    const outsider = await client("outsider");
    expect((await post(outsider, body)).status()).toBe(403);
    expect((await outsider.get(path)).status()).toBe(404);
    await outsider.dispose();

    const provider = await client("provider");
    expect((await provider.post(path, {
      data: body, headers: { Origin: "https://evil.test" },
    })).status()).toBe(403);
    expect((await post(provider, {
      ...body, status: "ready",
    })).status()).toBe(400);
    expect((await post(provider, {
      ...body, objectKey: "https://evil.test/video",
    })).status()).toBe(400);
    expect((await post(provider, {
      ...body, expectedBytes: 100_000_000,
    })).status()).toBe(400);

    const first = await post(provider, body);
    expect(first.status()).toBe(201);
    expect(first.headers()["cache-control"]).toContain("no-store");
    const reserved = await first.json();
    expect(reserved).toMatchObject({ status: "reserved", replayed: false });
    expect(reserved.uploadId).toMatch(/^[a-f0-9-]{36}$/);
    expect(reserved.assetId).toMatch(/^[a-f0-9-]{36}$/);
    const replay = await post(provider, body);
    expect(replay.status()).toBe(200);
    expect(await replay.json()).toMatchObject({
      uploadId: reserved.uploadId, assetId: reserved.assetId,
      status: "reserved", replayed: true,
    });
    expect((await post(provider, { ...body, title: "عنوان متفاوت" })).status())
      .toBe(409);
    expect((await (await provider.get(path)).json()).uploads)
      .toEqual([expect.objectContaining({
        uploadId: reserved.uploadId, status: "reserved",
      })]);
    await provider.dispose();
  });

  test("upload checks current institute/provider, digest and quarantine state", async () => {
    const provider = await client("provider");
    const [{ id, assetId }] = await db.select({
      id: mediaIngests.id, assetId: mediaIngests.assetId,
    }).from(mediaIngests).where(eq(mediaIngests.courseId, courseId));
    expect((await worker(provider, id)).status()).toBe(404);
    const outsider = await client("outsider");
    expect((await upload(outsider, id, fixture)).status()).toBe(403);
    await outsider.dispose();

    await db.update(memberships).set({ status: "suspended" })
      .where(and(eq(memberships.userId, users.provider),
        eq(memberships.role, "provider")));
    expect((await upload(provider, id, fixture)).status()).toBe(401);
    await db.update(memberships).set({ status: "active" })
      .where(and(eq(memberships.userId, users.provider),
        eq(memberships.role, "provider")));
    await db.update(supervisionGrants).set({
      status: "revoked", approvedAt: null, approvedByInstituteUserId: null,
    }).where(eq(supervisionGrants.courseId, courseId));
    expect((await upload(provider, id, fixture)).status()).toBe(404);
    await db.update(supervisionGrants).set({
      status: "approved", approvedAt: new Date(),
      approvedByInstituteUserId: users.institute,
    }).where(eq(supervisionGrants.courseId, courseId));

    const wrong = await post(provider, {
      ...body, clientRequestId: randomUUID(), sha256: "0".repeat(64),
    });
    expect(wrong.status()).toBe(201);
    const wrongId = (await wrong.json()).uploadId;
    expect((await upload(provider, wrongId, fixture)).status()).toBe(400);
    const [failed] = await db.select().from(mediaIngests)
      .where(eq(mediaIngests.id, wrongId));
    expect(failed.status).toBe("rejected");
    expect((await upload(provider, wrongId, fixture)).status()).toBe(409);
    expect((await processMock(id, assetId)).toBe(404);
    expect((await upload(provider, id, fixture)).status()).toBe(202);
    expect((await upload(provider, id, fixture)).status()).toBe(409);
    const [uploaded] = await db.select().from(mediaIngests)
      .where(eq(mediaIngests.id, id));
    expect(uploaded.status).toBe("quarantined");
    expect(uploaded.uploadedAt).toBeInstanceOf(Date);
    expect((await db.select().from(privateMediaAssets)
      .where(eq(privateMediaAssets.courseId, courseId))).length).toBe(0);
    expect((await worker(provider, id, "bad-token")).status()).toBe(404);
    // Even the real internal token cannot trust a caller claiming ready:
    expect((await worker(provider, id)).status()).toBe(404); // no token available to browser user
    await provider.dispose();
  });

  test("only attested worker event creates ready asset and unlocks free publication", async () => {
    const [job] = await db.select().from(mediaIngests).where(and(
      eq(mediaIngests.courseId, courseId),
      eq(mediaIngests.expectedSha256, sha256),
    ));
    const workerClient = await client();
    expect((await worker(workerClient, job.id, "x".repeat(32))).status()).toBe(404);
    const readyBefore = await worker(workerClient, job.id);
    expect(readyBefore.status()).toBe(503);
    expect((await db.select().from(privateMediaAssets)
      .where(eq(privateMediaAssets.courseId, courseId))).length).toBe(0);
    expect(await processMock(job.id, job.assetId)).toBe(200);
    const completed = await worker(workerClient, job.id);
    expect(completed.status()).toBe(200);
    expect(await completed.json()).toEqual({ uploadId: job.id, status: "ready" });
    expect((await worker(workerClient, job.id)).status()).toBe(200);
    const [asset] = await db.select().from(privateMediaAssets).where(and(
      eq(privateMediaAssets.id, job.assetId),
      eq(privateMediaAssets.courseId, courseId),
    ));
    expect(asset).toMatchObject({
      status: "ready", objectKey: `${courseId}/${job.assetId}.mp4`,
      title: body.title,
    });
    expect((await db.select().from(privateMediaAssets)
      .where(eq(privateMediaAssets.courseId, courseId))).length).toBe(1);

    const provider = await client("provider");
    const publication = await provider.post(
      `/api/provider/courses/${courseId}/publication`, {
        data: { action: "publish" },
        headers: { Origin: "http://localhost:3000" },
      },
    );
    expect(publication.status()).toBe(200);
    expect((await publication.json()).publicationStatus).toBe("published");
    expect((await post(provider, {
      ...body, clientRequestId: randomUUID(),
    })).status()).toBe(404);
    const student = await client("student");
    const catalog = await student.get("/api/student/courses");
    expect((await catalog.json()).courses).toContainEqual(
      expect.objectContaining({ courseId, free: true, enrolled: false }));
    expect((await student.get(
      `/api/student/courses/${courseId}/media/${asset.id}`)).status()).toBe(404);
    const enrolled = await student.post(
      `/api/student/courses/${courseId}/enroll`, {
        data: {}, headers: { Origin: "http://localhost:3000" },
      },
    );
    expect(enrolled.status()).toBe(201);
    const media = await student.get(
      `/api/student/courses/${courseId}/media/${asset.id}`, {
        headers: { Range: "bytes=0-3" },
      },
    );
    expect(media.status()).toBe(206);
    expect((await media.body()).equals(fixture.subarray(0, 4))).toBe(true);
    await student.dispose();
    await provider.dispose();
    await workerClient.dispose();
  });
});
