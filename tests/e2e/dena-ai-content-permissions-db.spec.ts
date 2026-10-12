import { randomUUID } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { serializeSignedCookie } from "better-call";
import { expect, request, test, type APIRequestContext } from "@playwright/test";
import { getDb } from "../../src/db";
import {
  courses, denaAiContentPermissionEvents, denaAiVideoTranscriptChunks,
  memberships, privateMediaAssets,
  session, studentEnrollments, supervisionGrants, user, verifiedEntities,
} from "../../src/db/schema";

test.describe.configure({ mode: "serial" });

test.describe("Dena AI video permission authorization and revocation", () => {
  const db = getDb();
  const users = {
    admin: randomUUID(), institute: randomUUID(), otherInstitute: randomUUID(),
    provider: randomUUID(), student: randomUUID(), stranger: randomUUID(),
  };
  const tokens = Object.fromEntries(
    Object.keys(users).map((name) => [name, randomUUID()]),
  ) as Record<keyof typeof users, string>;
  const instituteIds = { own: randomUUID(), other: randomUUID(), provider: randomUUID() };
  const courseId = randomUUID();
  const providerCourseId = randomUUID();
  const assetIds = {
    ready: randomUUID(), withdrawn: randomUUID(), providerOwned: randomUUID(),
  };
  const permissionPath = `/api/institute/courses/${courseId}/ai-permissions`;
  const studentSourcesPath = `/api/student/ai-tutor/sources?courseId=${courseId}`;
  const transcriptPath = `/api/institute/courses/${courseId}/ai-transcripts`;

  async function client(as?: keyof typeof users): Promise<APIRequestContext> {
    const cookie = as ? await serializeSignedCookie(
      "better-auth.session_token", tokens[as], process.env.BETTER_AUTH_SECRET!,
    ) : undefined;
    return request.newContext({
      baseURL: "http://localhost:3000",
      extraHTTPHeaders: cookie ? { Cookie: cookie.split(";")[0] } : {},
    });
  }
  const post = (ctx: APIRequestContext, path: string, data: object) =>
    ctx.post(path, { data, headers: { Origin: "http://localhost:3000" } });

  test.beforeAll(async () => {
    await db.insert(user).values(Object.entries(users).map(([name, id]) => ({
      id, name, email: `${id}@example.test`,
    })));
    await db.insert(verifiedEntities).values([
      { id: instituteIds.own, role: "institute", name: "institute A",
        evidenceReference: "test/institute-a", verifiedByUserId: users.admin },
      { id: instituteIds.other, role: "institute", name: "institute B",
        evidenceReference: "test/institute-b", verifiedByUserId: users.admin },
      { id: instituteIds.provider, role: "provider", name: "verified provider",
        evidenceReference: "test/provider", verifiedByUserId: users.admin },
    ]);
    await db.insert(memberships).values([
      { userId: users.admin, role: "admin" },
      { userId: users.institute, role: "institute", instituteId: instituteIds.own },
      { userId: users.otherInstitute, role: "institute", instituteId: instituteIds.other },
      { userId: users.provider, role: "provider", providerId: instituteIds.provider },
      { userId: users.student, role: "student" },
    ]);
    const expiresAt = new Date(Date.now() + 3_600_000);
    await db.insert(session).values(Object.entries(tokens).map(([name, token]) => ({
      userId: users[name as keyof typeof users], token, expiresAt,
    })));
    await db.insert(courses).values({
      id: courseId,
      ownerType: "institute",
      responsibleInstituteId: instituteIds.own,
      title: "دورهٔ آزمایشی معلم هوشمند",
      publicationStatus: "published",
      publishedAt: new Date(),
      clientRequestId: randomUUID(),
    });
    await db.insert(courses).values({
      id: providerCourseId,
      ownerType: "verified_provider",
      providerId: instituteIds.provider,
      responsibleInstituteId: instituteIds.own,
      title: "دورهٔ متعلق به تولیدکننده",
      clientRequestId: randomUUID(),
    });
    await db.insert(supervisionGrants).values({
      courseId,
      ownerType: "institute",
      instituteId: instituteIds.own,
      status: "approved",
      approvedByInstituteUserId: users.institute,
      approvedAt: new Date(),
    });
    await db.insert(privateMediaAssets).values([
      { id: assetIds.ready, courseId, title: "درس اول",
        objectKey: `${courseId}/${assetIds.ready}.mp4` },
      { id: assetIds.withdrawn, courseId, title: "درس لغوشده",
        status: "withdrawn",
        objectKey: `${courseId}/${assetIds.withdrawn}.mp4` },
      { id: assetIds.providerOwned, courseId: providerCourseId,
        title: "ویدئوی تولیدکننده",
        objectKey: `${providerCourseId}/${assetIds.providerOwned}.mp4` },
    ]);
    await db.insert(studentEnrollments).values({
      studentUserId: users.student, courseId, status: "active",
    });
  });

  test.afterAll(async () => {
    await db.delete(denaAiVideoTranscriptChunks)
      .where(inArray(denaAiVideoTranscriptChunks.courseId, [courseId, providerCourseId]));
    await db.delete(denaAiContentPermissionEvents)
      .where(inArray(denaAiContentPermissionEvents.courseId, [courseId, providerCourseId]));
    await db.delete(studentEnrollments)
      .where(eq(studentEnrollments.courseId, courseId));
    await db.delete(privateMediaAssets)
      .where(inArray(privateMediaAssets.id, Object.values(assetIds)));
    await db.delete(supervisionGrants).where(eq(supervisionGrants.courseId, courseId));
    await db.delete(courses)
      .where(inArray(courses.id, [courseId, providerCourseId]));
    await db.delete(memberships).where(inArray(memberships.userId, Object.values(users)));
    await db.delete(verifiedEntities)
      .where(inArray(verifiedEntities.id, Object.values(instituteIds)));
    await db.delete(user).where(inArray(user.id, Object.values(users)));
  });

  test("default-deny, scoped grant, replay safety and immediate student revocation", async () => {
    const anonymous = await client();
    expect((await anonymous.get(permissionPath)).status()).toBe(401);
    expect((await anonymous.get(studentSourcesPath)).status()).toBe(401);
    await anonymous.dispose();

    const institute = await client("institute");
    const listed = await institute.get(permissionPath);
    expect(listed.status()).toBe(200);
    expect(listed.headers()["cache-control"]).toContain("no-store");
    const initial = await listed.json();
    expect(initial.assets).toEqual(expect.arrayContaining([
      expect.objectContaining({
        assetId: assetIds.ready, permissionDecision: null, mediaStatus: "ready",
      }),
    ]));
    expect(JSON.stringify(initial)).not.toContain("objectKey");

    const student = await client("student");
    const emptySources = await student.get(studentSourcesPath);
    expect(emptySources.status()).toBe(200);
    expect((await emptySources.json()).sources).toEqual([]);
    const transcriptBeforeGrant = await post(institute, transcriptPath, {
      assetId: assetIds.ready,
      transcript: "در آزمایشگاه نور را با عدسی محدب روی پرده متمرکز می‌کنیم. فاصله کانونی عدسی به شکل و جنس آن بستگی دارد. با جابه‌جایی پرده می‌توان تصویر واضح را پیدا کرد.",
    });
    expect(transcriptBeforeGrant.status()).toBe(404);

    const badOrigin = await institute.post(permissionPath, {
      data: { decision: "granted", assetId: assetIds.ready, requestId: randomUUID(),
        rightsReviewRef: "review-2026-01" },
      headers: { Origin: "https://attacker.invalid" },
    });
    expect(badOrigin.status()).toBe(403);
    const missingReference = await post(institute, permissionPath, {
      decision: "granted", assetId: assetIds.ready, requestId: randomUUID(),
    });
    expect(missingReference.status()).toBe(400);

    const requestId = randomUUID();
    const grant = {
      decision: "granted",
      assetId: assetIds.ready,
      requestId,
      rightsReviewRef: "review-record-2026-01",
    };
    const granted = await post(institute, permissionPath, grant);
    expect(granted.status()).toBe(201);
    expect(await granted.json()).toEqual({ ok: true, replayed: false });
    const replay = await post(institute, permissionPath, grant);
    expect(replay.status()).toBe(200);
    expect(await replay.json()).toEqual({ ok: true, replayed: true });
    expect((await post(institute, permissionPath, {
      ...grant, rightsReviewRef: "different-review-record",
    })).status()).toBe(409);

    const sourcesAfterGrant = await student.get(studentSourcesPath);
    expect((await sourcesAfterGrant.json()).sources).toEqual([
      { assetId: assetIds.ready, title: "درس اول" },
    ]);
    expect(JSON.stringify(await sourcesAfterGrant.json())).not.toContain("objectKey");
    expect(JSON.stringify(await sourcesAfterGrant.json())).not.toContain("review-record");

    const transcript = "در آزمایشگاه نور را با عدسی محدب روی پرده متمرکز می‌کنیم. فاصله کانونی عدسی به شکل و جنس آن بستگی دارد. با جابه‌جایی پرده می‌توان تصویر واضح را پیدا کرد.";
    const savedTranscript = await post(institute, transcriptPath, {
      assetId: assetIds.ready, transcript,
    });
    expect(savedTranscript.status()).toBe(201);
    expect(await savedTranscript.json()).toMatchObject({
      saved: true, chunkCount: 1, sourceSha256: expect.stringMatching(/^[0-9a-f]{64}$/),
    });
    const transcriptAnswer = await post(student, "/api/student/ai-tutor", {
      courseId,
      message: "در آزمایشگاه چطور نور را با عدسی متمرکز کنیم؟",
      rememberTopic: true,
    });
    expect(transcriptAnswer.status()).toBe(200);
    expect(await transcriptAnswer.json()).toMatchObject({
      source: { id: assetIds.ready, title: "درس اول" },
      topicRecorded: false,
      answer: expect.stringContaining("عدسی محدب"),
    });

    const otherInstitute = await client("otherInstitute");
    expect((await otherInstitute.get(permissionPath)).status()).toBe(404);
    expect((await post(otherInstitute, permissionPath, {
      ...grant, requestId: randomUUID(),
    })).status()).toBe(404);
    await otherInstitute.dispose();

    const revoke = await post(institute, permissionPath, {
      decision: "revoked", assetId: assetIds.ready, requestId: randomUUID(),
      reason: "مجوز بازبینی پس گرفته شد",
    });
    expect(revoke.status()).toBe(201);
    expect((await (await student.get(studentSourcesPath)).json()).sources).toEqual([]);
    const retainedTranscript = await db.select({ id: denaAiVideoTranscriptChunks.id })
      .from(denaAiVideoTranscriptChunks)
      .where(eq(denaAiVideoTranscriptChunks.assetId, assetIds.ready));
    expect(retainedTranscript).toEqual([]);
    const afterRevocation = await post(student, "/api/student/ai-tutor", {
      courseId, message: "در آزمایشگاه چطور نور را با عدسی متمرکز کنیم؟",
    });
    expect(afterRevocation.status()).toBe(422);

    const institutePage = await institute.get(`/institute/courses/${courseId}`);
    expect(institutePage.status()).toBe(200);
    const html = await institutePage.text();
    expect(html).toContain("مجوز استفاده از ویدئو برای معلم هوشمند");
    expect(html).toContain("ارجاع ثبت‌شده به پروندهٔ بازبینی");
    await institute.dispose();
    await student.dispose();
  });

  test("withdrawn videos cannot be granted and provider-owned videos stay blocked", async () => {
    const institute = await client("institute");
    expect((await post(institute, permissionPath, {
      decision: "granted", assetId: assetIds.withdrawn, requestId: randomUUID(),
      rightsReviewRef: "review-record-2026-02",
    })).status()).toBe(404);
    expect((await post(institute,
      `/api/institute/courses/${providerCourseId}/ai-permissions`, {
        decision: "granted", assetId: assetIds.providerOwned, requestId: randomUUID(),
        rightsReviewRef: "review-provider-owned-2026",
      })).status()).toBe(404);
    const admin = await client("admin");
    expect((await admin.get(permissionPath)).status()).toBe(404);
    await institute.dispose();
    await admin.dispose();
  });
});
