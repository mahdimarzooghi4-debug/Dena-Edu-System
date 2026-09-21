import { createHash, randomUUID } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import { serializeSignedCookie } from "better-call";
import { expect, request, test, type APIRequestContext } from "@playwright/test";
import { getDb } from "../../src/db";
import {
  courses, mediaCleanupJobs, mediaIngests, mediaMultipartPlans, mediaProcessingJobs, memberships, privateMediaAssets, session,
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
  const uiCourseId = randomUUID();
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
      token = process.env.DENA_MEDIA_PROCESSOR_TOKEN!,
      leaseToken: string = randomUUID()) {
    return ctx.post(callbackPath(id), {
      data: { leaseToken }, headers: { Authorization: `Bearer ${token}` },
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

  async function corruptMock(uploadId: string) {
    const response = await fetch(
      `http://127.0.0.1:4318/__test__/corrupt/${uploadId}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.DENA_PRIVATE_MEDIA_ORIGIN_TOKEN}` },
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
    await db.insert(courses).values([
      { id: courseId, providerId, responsibleInstituteId: instituteId,
        title: "دوره آزمایشی ingest ایمن",
        createdByProviderUserId: users.provider, clientRequestId: randomUUID() },
      { id: uiCourseId, providerId, responsibleInstituteId: instituteId,
        title: "دوره تست فرم دریافت ویدئو",
        createdByProviderUserId: users.provider, clientRequestId: randomUUID() },
    ]);
    await db.insert(supervisionGrants).values([courseId, uiCourseId].map(
      (id) => ({
        courseId: id, providerId, instituteId,
        status: "approved" as const, requestedByProviderUserId: users.provider,
        approvedByInstituteUserId: users.institute, approvedAt: new Date(),
      }),
    ));
  });

  test.afterAll(async () => {
    await db.delete(studentEnrollments)
      .where(eq(studentEnrollments.courseId, courseId));
    await db.delete(privateMediaAssets)
      .where(inArray(privateMediaAssets.courseId, [courseId, uiCourseId]));
    await db.delete(mediaMultipartPlans).where(inArray(
      mediaMultipartPlans.courseId, [courseId, uiCourseId],
    ));
    await db.delete(mediaCleanupJobs).where(inArray(
      mediaCleanupJobs.uploadId,
      db.select({ id: mediaIngests.id }).from(mediaIngests)
        .where(inArray(mediaIngests.courseId, [courseId, uiCourseId])),
    ));
    await db.delete(mediaProcessingJobs).where(inArray(
      mediaProcessingJobs.uploadId,
      db.select({ id: mediaIngests.id }).from(mediaIngests)
        .where(inArray(mediaIngests.courseId, [courseId, uiCourseId])),
    ));
    await db.delete(mediaIngests)
      .where(inArray(mediaIngests.courseId, [courseId, uiCourseId]));
    await db.delete(supervisionGrants)
      .where(inArray(supervisionGrants.courseId, [courseId, uiCourseId]));
    await db.delete(courses).where(inArray(courses.id, [courseId, uiCourseId]));
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
    expect((await worker(provider, id)).status()).toBe(409);
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
    expect(await processMock(id, assetId)).toBe(404);
    expect((await upload(provider, id, fixture)).status()).toBe(202);
    expect((await upload(provider, id, fixture)).status()).toBe(409);
    const [uploaded] = await db.select().from(mediaIngests)
      .where(eq(mediaIngests.id, id));
    expect(uploaded.status).toBe("quarantined");
    expect(uploaded.uploadedAt).toBeInstanceOf(Date);
    expect((await db.select().from(privateMediaAssets)
      .where(eq(privateMediaAssets.courseId, courseId))).length).toBe(0);
    expect((await worker(provider, id, "bad-token")).status()).toBe(404);
    // No live lease: the real worker credential alone cannot publish.
    expect((await worker(provider, id)).status()).toBe(409);
    expect((await provider.post(callbackPath(id), {
      data: {}, headers: {
        Authorization: `Bearer ${process.env.DENA_MEDIA_PROCESSOR_TOKEN}`,
      },
    })).status()).toBe(400);
    await provider.dispose();
  });

  test("durable leases reject replay and retry with backoff", async () => {
    const [ingest] = await db.select().from(mediaIngests).where(and(
      eq(mediaIngests.courseId, courseId),
      eq(mediaIngests.expectedSha256, sha256),
    ));
    const [queued] = await db.select().from(mediaProcessingJobs)
      .where(eq(mediaProcessingJobs.uploadId, ingest.id));
    expect(queued.status).toBe("queued");
    expect(queued.attempts).toBe(0);
    const caller = await client();
    const claim = "/api/internal/media-jobs/claim";
    const fail = `/api/internal/media-jobs/${ingest.id}/fail`;
    expect((await caller.post(claim, { data: { limit: 1 } })).status()).toBe(404);
    const auth = { Authorization: `Bearer ${process.env.DENA_MEDIA_PROCESSOR_TOKEN}` };
    expect((await caller.post(claim, {
      data: { limit: 0 }, headers: auth,
    })).status()).toBe(400);
    const first = await caller.post(claim, {
      data: { limit: 1 }, headers: auth,
    });
    expect(first.status()).toBe(200);
    const jobs = (await first.json()).jobs;
    expect(jobs).toEqual([expect.objectContaining({
      uploadId: ingest.id, attempts: 1,
    })]);
    expect((await (await caller.post(claim, {
      data: { limit: 1 }, headers: auth,
    })).json()).jobs).toEqual([]);
    expect((await caller.post(fail, {
      data: { leaseToken: randomUUID(), reason: "temporary failure" },
      headers: auth,
    })).status()).toBe(409);
    const rescheduled = await caller.post(fail, {
      data: { leaseToken: jobs[0].leaseToken, reason: "temporary failure" },
      headers: auth,
    });
    expect(rescheduled.status()).toBe(200);
    expect((await rescheduled.json()).status).toBe("queued");
    const [retry] = await db.select().from(mediaProcessingJobs)
      .where(eq(mediaProcessingJobs.uploadId, ingest.id));
    expect(retry.attempts).toBe(1);
    expect(retry.nextAttemptAt.getTime()).toBeGreaterThan(Date.now());
    expect((await (await caller.post(claim, {
      data: { limit: 1 }, headers: auth,
    })).json()).jobs).toEqual([]);
    await db.update(mediaProcessingJobs).set({
      nextAttemptAt: new Date(Date.now() - 1000),
    }).where(eq(mediaProcessingJobs.uploadId, ingest.id));
    const second = (await (await caller.post(claim, {
      data: { limit: 1 }, headers: auth,
    })).json()).jobs;
    expect(second).toEqual([expect.objectContaining({
      uploadId: ingest.id, attempts: 2,
    })]);
    expect(second[0].leaseToken).not.toBe(jobs[0].leaseToken);
    expect((await caller.post(fail, {
      data: { leaseToken: jobs[0].leaseToken, reason: "stale lease" },
      headers: auth,
    })).status()).toBe(409);
    await caller.dispose();
  });

  test("only attested worker event creates ready asset and unlocks free publication", async () => {
    const [job] = await db.select().from(mediaIngests).where(and(
      eq(mediaIngests.courseId, courseId),
      eq(mediaIngests.expectedSha256, sha256),
    ));
    const workerClient = await client();
    const [queue] = await db.select().from(mediaProcessingJobs)
      .where(eq(mediaProcessingJobs.uploadId, job.id));
    expect(queue.status).toBe("leased");
    const currentLease = queue.leaseToken!;
    expect((await worker(workerClient, job.id, "x".repeat(32), currentLease)).status()).toBe(404);
    expect((await worker(workerClient, job.id, undefined, randomUUID())).status()).toBe(409);
    const readyBefore = await worker(workerClient, job.id, undefined, currentLease);
    expect(readyBefore.status()).toBe(503);
    expect((await db.select().from(privateMediaAssets)
      .where(eq(privateMediaAssets.courseId, courseId))).length).toBe(0);
    expect(await processMock(job.id, job.assetId)).toBe(200);
    // The source and processed output have DIFFERENT hashes/sizes in CI.
    const report = await (await fetch(
      `http://127.0.0.1:4318/inspection/${job.id}`, {
        headers: { Authorization: `Bearer ${process.env.DENA_PRIVATE_MEDIA_ORIGIN_TOKEN}` },
      },
    )).json();
    expect(report.sourceSha256).toBe(job.expectedSha256);
    expect(report.outputSha256).not.toBe(job.expectedSha256);
    expect(report.outputBytes).toBe(fixture.length + 4);
    expect(await corruptMock(job.id)).toBe(200);
    expect((await worker(workerClient, job.id, undefined, currentLease)).status()).toBe(409);
    expect((await db.select().from(privateMediaAssets)
      .where(eq(privateMediaAssets.courseId, courseId))).length).toBe(0);
    expect(await processMock(job.id, job.assetId)).toBe(200);
    await db.update(mediaProcessingJobs).set({
      leaseUntil: new Date(Date.now() - 1000),
    }).where(eq(mediaProcessingJobs.uploadId, job.id));
    expect((await worker(workerClient, job.id, undefined, currentLease)).status()).toBe(409);
    await db.update(mediaProcessingJobs).set({
      leaseUntil: new Date(Date.now() + 120_000),
    }).where(eq(mediaProcessingJobs.uploadId, job.id));
    const completed = await worker(workerClient, job.id, undefined, currentLease);
    expect(completed.status()).toBe(200);
    expect(await completed.json()).toEqual({ uploadId: job.id, status: "ready" });
    expect((await worker(workerClient, job.id, undefined, currentLease)).status()).toBe(200);
    const [finishedQueue] = await db.select().from(mediaProcessingJobs)
      .where(eq(mediaProcessingJobs.uploadId, job.id));
    expect(finishedQueue.status).toBe("done");
    expect(finishedQueue.leaseToken).toBeNull();
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

  test("provider browser form uploads only to quarantine and displays worker state", async ({ page }) => {
    const signed = await serializeSignedCookie(
      "better-auth.session_token", tokens.provider, process.env.BETTER_AUTH_SECRET!,
    );
    await page.context().addCookies([{
      name: "better-auth.session_token",
      value: signed.split(";")[0].split("=").slice(1).join("="),
      domain: "localhost", path: "/", httpOnly: true,
      secure: false, sameSite: "Lax",
    }]);
    await page.goto(`http://localhost:3000/provider/courses/${uiCourseId}/media`);
    await expect(page.getByRole("heading", {
      name: "دریافت آزمایشی ویدئو",
    })).toBeVisible();
    await page.getByLabel("عنوان ویدئو").fill("بخش کوچک تست مرورگر");
    await page.getByLabel("فایل MP4 آزمایشی (حداکثر ۸ مگابایت)")
      .setInputFiles({
        name: "sample.mp4", mimeType: "video/mp4", buffer: fixture,
      });
    const received = page.waitForResponse((res) =>
      res.url().includes(`/api/provider/courses/${uiCourseId}/media-ingest/`)
      && res.request().method() === "PUT",
    );
    await page.getByRole("button", { name: "انتقال امن به قرنطینه" }).click();
    expect((await received).status()).toBe(202);
    await expect(page.getByRole("status")).toContainText("قرنطینه");
    await expect(page.getByText("در قرنطینه؛ منتظر بررسی مستقل")).toBeVisible();
    const [job] = await db.select().from(mediaIngests).where(
      eq(mediaIngests.courseId, uiCourseId),
    );
    expect(job.status).toBe("quarantined");
    expect((await db.select().from(privateMediaAssets).where(
      eq(privateMediaAssets.courseId, uiCourseId),
    ))).toHaveLength(0);
  });

  test("cleanup is separately authorized, retries storage failures and never deletes ready assets", async () => {
    const uploader = await client("provider");
    const anonymous = await client();
    const endpoint = "/api/internal/media-cleanup/run";
    const auth = { Authorization: `Bearer ${process.env.DENA_MEDIA_CLEANUP_TOKEN}` };
    expect((await anonymous.post(endpoint, { data: { limit: 2 } })).status()).toBe(404);
    expect((await uploader.post(endpoint, {
      data: { limit: 2 }, headers: {
        Authorization: `Bearer ${process.env.DENA_MEDIA_PROCESSOR_TOKEN}`,
      },
    })).status()).toBe(404);
    expect((await anonymous.post(endpoint, {
      data: { limit: 11 }, headers: auth,
    })).status()).toBe(400);
    const uploadId = randomUUID(), old = new Date(Date.now() - 2 * 3_600_000);
    await db.insert(mediaIngests).values({
      id: uploadId, courseId: uiCourseId, providerId,
      createdByUserId: users.provider, requestId: randomUUID(),
      title: "failed quarantined test object", expectedBytes: fixture.length,
      expectedSha256: sha256, status: "rejected",
      rejectionReason: "invalid_media", createdAt: old, completedAt: old,
    });
    const storage = `http://127.0.0.1:4318/quarantine/${uploadId}`;
    const storageAuth = { Authorization:
      `Bearer ${process.env.DENA_PRIVATE_MEDIA_ORIGIN_TOKEN}` };
    expect((await fetch(storage, { method: "PUT", headers: {
      ...storageAuth, "Content-Type": "video/mp4", "X-Dena-Sha256": sha256,
    }, body: new Uint8Array(fixture) })).status).toBe(201);
    expect((await fetch(storage, { method: "HEAD", headers: storageAuth })).status).toBe(200);
    expect((await fetch(`http://127.0.0.1:4318/__test__/fail-delete/${uploadId}`, {
      method: "POST", headers: storageAuth,
    })).status).toBe(200);
    const run = () => anonymous.post(endpoint, { data: { limit: 10 }, headers: auth });
    const first = await run();
    expect(first.status()).toBe(200);
    expect((await first.json()).results).toContainEqual({
      uploadId, status: "pending",
    });
    const [retry] = await db.select().from(mediaCleanupJobs)
      .where(eq(mediaCleanupJobs.uploadId, uploadId));
    expect(retry.attempts).toBe(1);
    expect(retry.nextAttemptAt.getTime()).toBeGreaterThan(Date.now());
    expect((await fetch(storage, { method: "HEAD", headers: storageAuth })).status).toBe(200);
    const premature = await run();
    expect((await premature.json()).results).not.toContainEqual(
      expect.objectContaining({ uploadId }),
    );
    await db.update(mediaCleanupJobs).set({
      nextAttemptAt: new Date(Date.now() - 1000),
    }).where(eq(mediaCleanupJobs.uploadId, uploadId));
    const second = await run();
    expect((await second.json()).results).toContainEqual({
      uploadId, status: "done",
    });
    expect((await fetch(storage, { method: "HEAD", headers: storageAuth })).status).toBe(404);
    const [cleaned] = await db.select().from(mediaCleanupJobs)
      .where(eq(mediaCleanupJobs.uploadId, uploadId));
    expect(cleaned.attempts).toBe(2);
    expect(cleaned.completedAt).toBeInstanceOf(Date);
    expect((await (await run()).json()).results).toEqual([]);
    // A distinct ready asset survives reaper calls; only /quarantine is deleted.
    const [ready] = await db.select().from(privateMediaAssets)
      .where(eq(privateMediaAssets.courseId, courseId));
    expect(ready.status).toBe("ready");
    expect((await fetch(`http://127.0.0.1:4318/private/${ready.objectKey}`, {
      method: "HEAD", headers: storageAuth,
    })).status).toBe(200);
    await uploader.dispose();
    await anonymous.dispose();
  });

  test("durable multipart dry-run planning is scoped, idempotent and has NO upload grants", async () => {
    const endpoint = `/api/provider/courses/${uiCourseId}/multipart-plans`;
    const payload = {
      title: "ویدئوی حجیم آزمایشی بدون ارسال بایت",
      clientRequestId: randomUUID(),
      expectedBytes: 16 * 1024 * 1024 + 9,
      sha256,
    };
    const visitor = await client();
    const outsider = await client("outsider");
    const provider = await client("provider");
    const postPlan = (metadata: object, origin = "http://localhost:3000") =>
      provider.post(endpoint, { data: metadata, headers: { Origin: origin } });
    expect((await visitor.post(endpoint, {
      data: payload, headers: { Origin: "http://localhost:3000" },
    })).status()).toBe(401);
    expect((await outsider.post(endpoint, {
      data: payload, headers: { Origin: "http://localhost:3000" },
    })).status()).toBe(403);
    expect((await postPlan(payload, "https://evil.example")).status()).toBe(403);
    expect((await postPlan({ ...payload, uploadUrl: "https://evil.example" })).status()).toBe(400);
    expect((await postPlan({ ...payload, expectedBytes: 16 * 1024 * 1024 })).status()).toBe(400);
    expect((await postPlan({ ...payload, expectedBytes: 5 * 1024 ** 3 + 1 })).status()).toBe(400);
    const response = await postPlan(payload);
    expect(response.status()).toBe(201);
    expect(response.headers()["cache-control"]).toContain("no-store");
    const created = await response.json();
    expect(created).toMatchObject({
      status: "planned", replayed: false,
      plan: {
        key: `quarantine/${created.uploadId}`,
        ttlSeconds: 900,
        parts: [
          { partNumber: 1, bytes: 16 * 1024 * 1024 },
          { partNumber: 2, bytes: 9 },
        ],
      },
    });
    expect(created.uploadId).toMatch(/^[0-9a-f-]{36}$/);
    expect(Date.parse(created.expiresAt)).toBeGreaterThan(Date.now());
    const serialized = JSON.stringify(created);
    expect(serialized).not.toMatch(/presigned|signedUrl|uploadUrl|storageUploadId|bucket/i);
    expect((await postPlan(payload)).status()).toBe(200);
    const replay = await (await postPlan(payload)).json();
    expect(replay.uploadId).toBe(created.uploadId);
    expect(replay.expiresAt).toBe(created.expiresAt);
    expect((await postPlan({ ...payload, title: "تغییر غیرمجاز" })).status()).toBe(409);
    expect((await provider.post(
      `/api/provider/courses/${uiCourseId}/media-ingest`, {
        data: { ...body, clientRequestId: payload.clientRequestId },
        headers: { Origin: "http://localhost:3000" },
      },
    )).status()).toBe(409);
    const [stored] = await db.select().from(mediaMultipartPlans)
      .where(eq(mediaMultipartPlans.id, created.uploadId));
    expect(stored.expectedBytes).toBe(payload.expectedBytes);
    expect(stored.createdByUserId).toBe(users.provider);
    expect(stored.status).toBe("planned");
    expect((await db.select().from(privateMediaAssets)
      .where(eq(privateMediaAssets.courseId, uiCourseId))).length).toBe(0);

    await db.update(supervisionGrants).set({
      status: "revoked", approvedAt: null, approvedByInstituteUserId: null,
    }).where(eq(supervisionGrants.courseId, uiCourseId));
    expect((await postPlan(payload)).status()).toBe(404);
    await db.update(supervisionGrants).set({
      status: "approved", approvedAt: new Date(),
      approvedByInstituteUserId: users.institute,
    }).where(eq(supervisionGrants.courseId, uiCourseId));
    await db.update(memberships).set({ status: "suspended" }).where(and(
      eq(memberships.userId, users.institute),
      eq(memberships.role, "institute"),
    ));
    expect((await postPlan(payload)).status()).toBe(404);
    await db.update(memberships).set({ status: "active" }).where(and(
      eq(memberships.userId, users.institute),
      eq(memberships.role, "institute"),
    ));

    await db.update(mediaMultipartPlans).set({
      expiresAt: new Date(Date.now() - 1000),
    }).where(eq(mediaMultipartPlans.id, created.uploadId));
    const expired = await postPlan(payload);
    expect(expired.status()).toBe(200);
    expect(await expired.json()).toMatchObject({
      uploadId: created.uploadId, status: "expired", plan: null,
    });
    const fresh = await postPlan({ ...payload,
      clientRequestId: randomUUID(), expectedBytes: 5 * 1024 ** 3,
    });
    expect(fresh.status()).toBe(201);
    expect((await fresh.json()).plan.parts).toHaveLength(320);
    const [after] = await db.select().from(mediaMultipartPlans)
      .where(eq(mediaMultipartPlans.id, created.uploadId));
    expect(after.status).toBe("expired");
    expect((await postPlan(payload)).status()).toBe(200);
    await visitor.dispose();
    await outsider.dispose();
    await provider.dispose();
  });

  test("multipart listing/cancellation is scoped, idempotent and works after institute revocation", async () => {
    const provider = await client("provider");
    const outsider = await client("outsider");
    const root = `/api/provider/courses/${uiCourseId}/multipart-plans`;
    const metadata = {
      title: "طرح قابل لغو ویدئوی جدید",
      clientRequestId: randomUUID(),
      expectedBytes: 16 * 1024 * 1024 + 1,
      sha256,
    };
    const origin = { Origin: "http://localhost:3000" };
    expect((await outsider.get(root)).status()).toBe(403);
    const created = await provider.post(root, { data: metadata, headers: origin });
    expect(created.status()).toBe(201);
    const plan = await created.json();
    const cancel = `${root}/${plan.uploadId}/cancel`;
    const badCourse = `/api/provider/courses/${courseId}/multipart-plans/${plan.uploadId}/cancel`;
    expect((await provider.get(root)).status()).toBe(200);
    const listed = (await (await provider.get(root)).json()).plans;
    expect(listed).toContainEqual(expect.objectContaining({
      uploadId: plan.uploadId, status: "planned",
      expectedBytes: metadata.expectedBytes,
    }));
    expect(JSON.stringify(listed)).not.toMatch(/uploadUrl|signedUrl|storageUploadId|bucket/i);
    expect((await provider.post(cancel, {
      data: {}, headers: { Origin: "https://evil.example" },
    })).status()).toBe(403);
    expect((await provider.post(cancel, {
      data: { path: "/private/secret" }, headers: origin,
    })).status()).toBe(400);
    expect((await outsider.post(cancel, {
      data: {}, headers: origin,
    })).status()).toBe(403);
    expect((await provider.post(badCourse, {
      data: {}, headers: origin,
    })).status()).toBe(404);

    // Even after INSTITUTE revocation the owner must be able to cancel an
    // inert plan. A normal replay/create still needs active supervision.
    await db.update(supervisionGrants).set({
      status: "revoked", approvedAt: null, approvedByInstituteUserId: null,
    }).where(eq(supervisionGrants.courseId, uiCourseId));
    expect((await provider.post(root, {
      data: metadata, headers: origin,
    })).status()).toBe(404);
    const cancelled = await provider.post(cancel, {
      data: {}, headers: origin,
    });
    expect(cancelled.status()).toBe(200);
    expect(await cancelled.json()).toEqual({
      uploadId: plan.uploadId, status: "cancelled",
    });
    expect((await (await provider.post(cancel, {
      data: {}, headers: origin,
    })).json()).status).toBe("cancelled");
    expect((await (await provider.get(root)).json()).plans).toContainEqual(
      expect.objectContaining({
        uploadId: plan.uploadId, status: "cancelled",
      }),
    );
    const [saved] = await db.select().from(mediaMultipartPlans)
      .where(eq(mediaMultipartPlans.id, plan.uploadId));
    expect(saved.cancelledAt).toBeInstanceOf(Date);

    await db.update(supervisionGrants).set({
      status: "approved", approvedAt: new Date(),
      approvedByInstituteUserId: users.institute,
    }).where(eq(supervisionGrants.courseId, uiCourseId));
    const replay = await provider.post(root, {
      data: metadata, headers: origin,
    });
    expect(replay.status()).toBe(200);
    expect(await replay.json()).toMatchObject({
      uploadId: plan.uploadId, status: "cancelled",
      replayed: true, plan: null,
    });
    const newId = await provider.post(root, {
      data: { ...metadata, clientRequestId: randomUUID() },
      headers: origin,
    });
    expect(newId.status()).toBe(201);
    expect((await newId.json()).uploadId).not.toBe(plan.uploadId);
    const staleId = (await newId.json()).uploadId;
    await db.update(mediaMultipartPlans).set({
      expiresAt: new Date(Date.now() - 1000),
    }).where(eq(mediaMultipartPlans.id, staleId));
    const staleCancel = await provider.post(
      `${root}/${staleId}/cancel`, { data: {}, headers: origin },
    );
    expect(staleCancel.status()).toBe(200);
    expect((await staleCancel.json()).status).toBe("expired");
    const [expired] = await db.select().from(mediaMultipartPlans)
      .where(eq(mediaMultipartPlans.id, staleId));
    expect(expired.status).toBe("expired");
    expect(expired.cancelledAt).toBeNull();
    await provider.dispose();
    await outsider.dispose();
  });

});
