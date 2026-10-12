import { randomUUID } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { serializeSignedCookie } from "better-call";
import { expect, request, test, type APIRequestContext } from "@playwright/test";
import { getDb } from "../../src/db";
import {
  courses, denaAiContentPermissionEvents, denaAiVideoTranscriptChunks,
  educatorInstituteAffiliations, independentEducatorProfiles,
  memberships, privateMediaAssets, studentAiTutorVideoFeedback,
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
  const educatorCourseId = randomUUID();
  const educatorProfileId = randomUUID();
  const assetIds = {
    ready: randomUUID(), withdrawn: randomUUID(), providerOwned: randomUUID(),
    educatorReady: randomUUID(), educatorFollowup: randomUUID(),
  };
  const permissionPath = `/api/institute/courses/${courseId}/ai-permissions`;
  const studentSourcesPath = `/api/student/ai-tutor/sources?courseId=${courseId}`;
  const transcriptPath = `/api/institute/courses/${courseId}/ai-transcripts`;
  const educatorPermissionPath = `/api/institute/courses/${educatorCourseId}/ai-permissions`;
  const educatorTranscriptPath = `/api/institute/courses/${educatorCourseId}/ai-transcripts`;

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
    await db.insert(independentEducatorProfiles).values({
      id: educatorProfileId, userId: users.student, displayName: "مدرس مستقل آزمایشی",
    });
    await db.insert(educatorInstituteAffiliations).values({
      educatorProfileId, instituteId: instituteIds.own,
      requestedByUserId: users.student, clientRequestId: randomUUID(),
      displayNameSnapshot: "مدرس مستقل آزمایشی",
      statement: "برای همکاری آموزشی زیر نظر مؤسسه درخواست می‌دهم.",
      status: "approved", reviewedByUserId: users.institute,
      reviewedAt: new Date(), decisionReason: "همکاری آموزشی تأیید شد.",
    });
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
    await db.insert(courses).values({
      id: educatorCourseId,
      ownerType: "independent_educator",
      independentEducatorProfileId: educatorProfileId,
      responsibleInstituteId: instituteIds.own,
      title: "دورهٔ مدرس مستقل زیر نظر مؤسسه",
      publicationStatus: "published", publishedAt: new Date(),
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
    await db.insert(supervisionGrants).values({
      courseId: educatorCourseId,
      ownerType: "independent_educator",
      independentEducatorProfileId: educatorProfileId,
      instituteId: instituteIds.own,
      requestedByProviderUserId: users.student,
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
      { id: assetIds.educatorReady, courseId: educatorCourseId,
        title: "ویدئوی مدرس مستقل",
        objectKey: `${educatorCourseId}/${assetIds.educatorReady}.mp4` },
      { id: assetIds.educatorFollowup, courseId: educatorCourseId,
        title: "ادامهٔ درس جغرافیا",
        objectKey: `${educatorCourseId}/${assetIds.educatorFollowup}.mp4` },
    ]);
    await db.insert(studentEnrollments).values({
      studentUserId: users.student, courseId, status: "active",
    });
    await db.insert(studentEnrollments).values({
      studentUserId: users.student, courseId: educatorCourseId, status: "active",
    });
  });

  test.afterAll(async () => {
    await db.delete(studentAiTutorVideoFeedback)
      .where(eq(studentAiTutorVideoFeedback.studentUserId, users.student));
    await db.delete(denaAiVideoTranscriptChunks)
      .where(inArray(denaAiVideoTranscriptChunks.courseId, [courseId, providerCourseId, educatorCourseId]));
    await db.delete(denaAiContentPermissionEvents)
      .where(inArray(denaAiContentPermissionEvents.courseId, [courseId, providerCourseId, educatorCourseId]));
    await db.delete(studentEnrollments)
      .where(inArray(studentEnrollments.courseId, [courseId, educatorCourseId]));
    await db.delete(privateMediaAssets)
      .where(inArray(privateMediaAssets.id, Object.values(assetIds)));
    await db.delete(supervisionGrants)
      .where(inArray(supervisionGrants.courseId, [courseId, educatorCourseId]));
    await db.delete(courses)
      .where(inArray(courses.id, [courseId, providerCourseId, educatorCourseId]));
    await db.delete(educatorInstituteAffiliations)
      .where(eq(educatorInstituteAffiliations.educatorProfileId, educatorProfileId));
    await db.delete(independentEducatorProfiles)
      .where(eq(independentEducatorProfiles.id, educatorProfileId));
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
    const transcriptStatus = await institute.get(transcriptPath);
    expect(transcriptStatus.status()).toBe(200);
    const transcriptStatusBody = await transcriptStatus.json() as {
      assets: Array<{ assetId: string; chunkCount: number }>;
    };
    expect(transcriptStatusBody.assets).toContainEqual({
      assetId: assetIds.ready, chunkCount: 1,
    });
    expect(JSON.stringify(await transcriptStatus.json())).not.toContain(transcript);
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

    const supervisedInstitute = await client("institute");
    const supervisedStudent = await client("student");
    const supervisedPermissionList = await supervisedInstitute.get(educatorPermissionPath);
    expect(supervisedPermissionList.status()).toBe(200);
    expect((await supervisedPermissionList.json()).assets).toContainEqual(
      expect.objectContaining({
        assetId: assetIds.educatorReady, permissionDecision: null, mediaStatus: "ready",
      }),
    );
    const noTranscriptYet = await post(supervisedInstitute, educatorTranscriptPath, {
      assetId: assetIds.educatorReady,
      transcript: "در درس جغرافیا بررسی رطوبت و اقلیم به شناخت تغییرات آب‌وهوا کمک می‌کند. مقایسهٔ رطوبت در چند منطقه، الگوی بارش را روشن می‌کند.",
    });
    expect(noTranscriptYet.status()).toBe(404);
    const supervisedGrant = await post(supervisedInstitute, educatorPermissionPath, {
      decision: "granted", assetId: assetIds.educatorReady,
      requestId: randomUUID(), rightsReviewRef: "educator-video-rights-2026",
    });
    expect(supervisedGrant.status()).toBe(201);
    const educatorTranscript = "در درس جغرافیا بررسی رطوبت و اقلیم به شناخت تغییرات آب‌وهوا کمک می‌کند. مقایسهٔ رطوبت در چند منطقه، الگوی بارش را روشن می‌کند.";
    const savedEducatorTranscript = await post(supervisedInstitute, educatorTranscriptPath, {
      assetId: assetIds.educatorReady, transcript: educatorTranscript,
    });
    expect(savedEducatorTranscript.status()).toBe(201);
    const followupGrant = await post(supervisedInstitute, educatorPermissionPath, {
      decision: "granted", assetId: assetIds.educatorFollowup,
      requestId: randomUUID(), rightsReviewRef: "educator-video-rights-followup-2026",
    });
    expect(followupGrant.status()).toBe(201);
    const studentSources = await supervisedStudent.get(
      `/api/student/ai-tutor/sources?courseId=${educatorCourseId}`,
    );
    expect((await studentSources.json()).sources).toEqual(expect.arrayContaining([
      { assetId: assetIds.educatorReady, title: "ویدئوی مدرس مستقل" },
      { assetId: assetIds.educatorFollowup, title: "ادامهٔ درس جغرافیا" },
    ]));
    const educatorAnswer = await post(supervisedStudent, "/api/student/ai-tutor", {
      courseId: educatorCourseId,
      message: "چطور رطوبت و اقلیم را در درس جغرافیا مقایسه کنم؟",
    });
    expect(educatorAnswer.status()).toBe(200);
    const educatorAnswerBody = await educatorAnswer.json();
    expect(educatorAnswerBody).toMatchObject({
      source: { id: assetIds.educatorReady, title: "ویدئوی مدرس مستقل", kind: "video" },
      answer: expect.stringContaining("رطوبت"),
    });
    const followupTranscript = "در درس جغرافیا بررسی رطوبت و اقلیم به شناخت تغییرات آب‌وهوا کمک می‌کند. مقایسهٔ رطوبت در چند منطقه، الگوی بارش را روشن می‌کند.";
    expect((await post(supervisedInstitute, educatorTranscriptPath, {
      assetId: assetIds.educatorFollowup, transcript: followupTranscript,
    })).status()).toBe(201);
    const selectedAssetId = educatorAnswerBody.source.id as string;
    const videoFeedback = await post(supervisedStudent,
      "/api/student/ai-tutor/video-feedback", {
        courseId: educatorCourseId, assetId: selectedAssetId,
        needsGuidance: true,
      });
    expect(videoFeedback.status()).toBe(200);
    expect(await videoFeedback.json()).toEqual({ saved: true });
    const prioritizedAnswer = await post(supervisedStudent, "/api/student/ai-tutor", {
      courseId: educatorCourseId,
      message: "چطور رطوبت و اقلیم را در درس جغرافیا مقایسه کنم؟",
    });
    expect((await prioritizedAnswer.json()).source.id).toBe(selectedAssetId);
    expect(await db.select({ assetId: studentAiTutorVideoFeedback.assetId })
      .from(studentAiTutorVideoFeedback)
      .where(eq(studentAiTutorVideoFeedback.studentUserId, users.student)))
      .toEqual([{ assetId: selectedAssetId }]);
    const clearTutorProfile = await supervisedStudent.delete(
      "/api/student/ai-tutor/profile",
      { headers: { Origin: "http://localhost:3000" } },
    );
    expect(clearTutorProfile.status()).toBe(200);
    expect(await db.select({ assetId: studentAiTutorVideoFeedback.assetId })
      .from(studentAiTutorVideoFeedback)
      .where(eq(studentAiTutorVideoFeedback.studentUserId, users.student)))
      .toEqual([]);
    const otherInstituteForEducator = await client("otherInstitute");
    expect((await otherInstituteForEducator.get(educatorPermissionPath)).status()).toBe(404);
    await otherInstituteForEducator.dispose();
    await supervisedInstitute.dispose();
    await supervisedStudent.dispose();
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
