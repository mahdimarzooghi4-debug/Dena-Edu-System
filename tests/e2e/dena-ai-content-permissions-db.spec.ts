import { randomUUID } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { serializeSignedCookie } from "better-call";
import { expect, request, test, type APIRequestContext } from "@playwright/test";
import { getDb } from "../../src/db";
import {
  courses, coursePracticeQuestions, denaAiContentPermissionEvents, denaAiVideoTranscriptChunks,
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
    feedbackPeer1: randomUUID(), feedbackPeer2: randomUUID(),
    feedbackPeer3: randomUUID(), feedbackPeer4: randomUUID(),
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
      { userId: users.feedbackPeer1, role: "student" },
      { userId: users.feedbackPeer2, role: "student" },
      { userId: users.feedbackPeer3, role: "student" },
      { userId: users.feedbackPeer4, role: "student" },
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
    await db.insert(studentEnrollments).values(
      [users.feedbackPeer1, users.feedbackPeer2, users.feedbackPeer3, users.feedbackPeer4]
        .map((studentUserId) => ({
          studentUserId, courseId: educatorCourseId, status: "active" as const,
        })),
    );
  });

  test.afterAll(async () => {
    await db.delete(studentAiTutorVideoFeedback)
      .where(eq(studentAiTutorVideoFeedback.studentUserId, users.student));
    await db.delete(coursePracticeQuestions)
      .where(eq(coursePracticeQuestions.courseId, educatorCourseId));
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
      conceptId: "science.light.v1",
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
      assetId: assetIds.ready, conceptId: "science.light.v1", transcript,
    });
    expect(savedTranscript.status()).toBe(201);
    expect(await savedTranscript.json()).toMatchObject({
      saved: true, chunkCount: 1, sourceSha256: expect.stringMatching(/^[0-9a-f]{64}$/),
    });
    const transcriptStatus = await institute.get(transcriptPath);
    expect(transcriptStatus.status()).toBe(200);
    const transcriptStatusBody = await transcriptStatus.json() as {
      assets: Array<{ assetId: string; chunkCount: number; conceptId: string | null }>;
    };
    expect(transcriptStatusBody.assets).toContainEqual(expect.objectContaining({
      assetId: assetIds.ready, chunkCount: 1, conceptId: "science.light.v1",
      feedbackResponses: null, needsGuidanceResponses: null,
    }));
    expect(JSON.stringify(await transcriptStatus.json())).not.toContain(transcript);
    const transcriptAnswer = await post(student, "/api/student/ai-tutor", {
      courseId,
      message: "در آزمایشگاه چطور نور را با عدسی متمرکز کنیم؟",
      rememberTopic: true,
    });
    expect(transcriptAnswer.status()).toBe(200);
    const transcriptAnswerBody = await transcriptAnswer.json();
    expect(transcriptAnswerBody).toMatchObject({
      source: {
        id: assetIds.ready, title: "درس اول", kind: "video",
        conceptId: "science.light.v1",
      },
      topicRecorded: true,
      topicId: "science.light.v1",
      answer: expect.stringContaining("عدسی محدب"),
    });
    const savedTutorProfile = await student.get("/api/student/ai-tutor/profile");
    expect((await savedTutorProfile.json()).topics).toContainEqual(
      expect.objectContaining({ topicId: "science.light.v1", questionCount: 1, lessonFeedback: null }),
    );
    const missingConsent = await post(student, "/api/student/ai-tutor/profile", {
      topicId: "science.light.v1", lessonFeedback: "understood", consent: false,
    });
    expect(missingConsent.status()).toBe(400);
    const notStudentFeedback = await post(institute, "/api/student/ai-tutor/profile", {
      topicId: "science.light.v1", lessonFeedback: "understood", consent: true,
    });
    expect(notStudentFeedback.status()).toBe(404);
    const lessonFeedback = await post(student, "/api/student/ai-tutor/profile", {
      topicId: "science.light.v1", lessonFeedback: "needs_help", consent: true,
    });
    expect(lessonFeedback.status()).toBe(200);
    expect(await lessonFeedback.json()).toEqual({ saved: true });
    const updatedTutorProfile = await student.get("/api/student/ai-tutor/profile");
    expect((await updatedTutorProfile.json()).topics).toContainEqual(
      expect.objectContaining({ topicId: "science.light.v1", lessonFeedback: "needs_help" }),
    );
    const repeatedLessonFeedback = await post(student, "/api/student/ai-tutor/profile", {
      topicId: "science.light.v1", lessonFeedback: "needs_help", consent: true,
    });
    expect(repeatedLessonFeedback.status()).toBe(200);
    const repeatedFeedbackProfile = await student.get("/api/student/ai-tutor/profile");
    expect((await repeatedFeedbackProfile.json()).topics).toContainEqual(
      expect.objectContaining({
        topicId: "science.light.v1", lessonFeedback: "needs_help",
        practiceAttemptCount: 0, practiceCorrectCount: 0,
      }),
    );

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
    expect(afterRevocation.status()).toBe(200);
    const fallbackAnswer = await afterRevocation.json();
    expect(fallbackAnswer).toMatchObject({
      source: {
        id: "science.light.v1",
        title: "نور و عدسی",
        corpusVersion: "2026-10-12.3",
      },
      topicRecorded: false,
      answer: expect.stringContaining("عدسی محدب"),
    });
    expect(fallbackAnswer.source).not.toHaveProperty("kind");

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
      conceptId: "geography.climate.v1",
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
      assetId: assetIds.educatorReady, conceptId: "geography.climate.v1", transcript: educatorTranscript,
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
      rememberTopic: true,
    });
    expect(educatorAnswer.status()).toBe(200);
    const educatorAnswerBody = await educatorAnswer.json();
    expect(educatorAnswerBody).toMatchObject({
      source: { id: assetIds.educatorReady, title: "ویدئوی مدرس مستقل", kind: "video" },
      answer: expect.stringContaining("رطوبت"),
      topicRecorded: true,
      topicId: "geography.climate.v1",
    });
    const sciencePractice = await supervisedStudent.get(
      `/api/student/ai-tutor/practice?courseId=${courseId}&topicId=science.light.v1`,
    );
    expect(sciencePractice.status()).toBe(200);
    expect(await sciencePractice.json()).toMatchObject({
      topicId: "science.light.v1",
      topicTitle: "نور و عدسی",
    });
    const geographyPractice = await supervisedStudent.get(
      `/api/student/ai-tutor/practice?courseId=${educatorCourseId}&topicId=geography.climate.v1`,
    );
    expect(geographyPractice.status()).toBe(200);
    expect(await geographyPractice.json()).toMatchObject({
      topicId: "geography.climate.v1",
      topicTitle: "اقلیم و رطوبت",
    });
    expect((await supervisedStudent.get(
      `/api/student/ai-tutor/practice?courseId=${courseId}&topicId=math.percent.v1`,
    )).status()).toBe(404);
    const sciencePracticeQuestion = await sciencePractice.json();
    const recordedScienceResult = await post(supervisedStudent,
      "/api/student/ai-tutor/practice", {
        courseId, questionId: sciencePracticeQuestion.questionId,
        topicId: "science.light.v1", selectedOption: 1, rememberResult: true,
      });
    expect(await recordedScienceResult.json()).toMatchObject({
      correct: false, resultRecorded: true,
    });
    const savedPracticeTopics = (await (await supervisedStudent.get(
      "/api/student/ai-tutor/profile",
    )).json()).topics;
    expect(savedPracticeTopics).toContainEqual(expect.objectContaining({
      topicId: "science.light.v1", practiceAttemptCount: 1, practiceCorrectCount: 0,
      practiceNeedsGuidance: true,
    }));
    expect(savedPracticeTopics).toContainEqual(expect.objectContaining({
      topicId: "geography.climate.v1", practiceAttemptCount: 0,
    }));
    const geographyPracticeQuestion = await geographyPractice.json();
    const recordedGeographyResult = await post(supervisedStudent,
      "/api/student/ai-tutor/practice", {
        courseId: educatorCourseId, questionId: geographyPracticeQuestion.questionId,
        topicId: "geography.climate.v1", selectedOption: 1, rememberResult: true,
      });
    expect(await recordedGeographyResult.json()).toMatchObject({
      correct: false, resultRecorded: true,
    });
    const afterGeographyPractice = (await (await supervisedStudent.get(
      "/api/student/ai-tutor/profile",
    )).json()).topics;
    expect(afterGeographyPractice).toContainEqual(expect.objectContaining({
      topicId: "geography.climate.v1", practiceAttemptCount: 1, practiceCorrectCount: 0,
      practiceNeedsGuidance: true,
    }));
    const followupTranscript = "در درس جغرافیا بررسی رطوبت و اقلیم به شناخت تغییرات آب‌وهوا کمک می‌کند. مقایسهٔ رطوبت در چند منطقه، الگوی بارش را روشن می‌کند.";
    expect((await post(supervisedInstitute, educatorTranscriptPath, {
      assetId: assetIds.educatorFollowup, conceptId: "geography.climate.v1", transcript: followupTranscript,
    })).status()).toBe(201);
    const selectedAssetId = educatorAnswerBody.source.id as string;
    await db.insert(coursePracticeQuestions).values({
      courseId: educatorCourseId, learningConceptId: "geography.climate.v1",
      prompt: "کدام گزینه تفاوت وضع هوا و اقلیم را نشان می‌دهد؟",
      option0: "وضع هوا کوتاه‌مدت و اقلیم بلندمدت است",
      option1: "این دو همیشه یک معنی دارند",
      option2: "اقلیم فقط دمای امروز است",
      option3: "وضع هوا فقط دریاها را توصیف می‌کند",
      correctOption: 0, authoredByProviderUserId: users.provider,
      reviewStatus: "approved", reviewedByInstituteUserId: users.institute,
      reviewedAt: new Date(), reviewReason: "محتوا و کلید پاسخ بازبینی شد.",
    });
    const videoFeedback = await post(supervisedStudent,
      "/api/student/ai-tutor/video-feedback", {
        courseId: educatorCourseId, assetId: selectedAssetId,
        needsGuidance: true,
      });
    expect(videoFeedback.status()).toBe(200);
    expect(await videoFeedback.json()).toEqual({ saved: true });
    const earlyFeedbackStatus = await supervisedInstitute.get(educatorTranscriptPath);
    const earlyFeedbackAsset = (await earlyFeedbackStatus.json()).assets.find(
      (asset: { assetId: string }) => asset.assetId === selectedAssetId,
    );
    expect(earlyFeedbackAsset).toMatchObject({
      feedbackResponses: null, needsGuidanceResponses: null,
    });
    for (const peerName of [
      "feedbackPeer1", "feedbackPeer2", "feedbackPeer3", "feedbackPeer4",
    ] as const) {
      const peer = await client(peerName);
      const peerFeedback = await post(peer, "/api/student/ai-tutor/video-feedback", {
        courseId: educatorCourseId, assetId: selectedAssetId, needsGuidance: false,
      });
      expect(peerFeedback.status()).toBe(200);
      await peer.dispose();
    }
    const aggregatedFeedbackStatus = await supervisedInstitute.get(educatorTranscriptPath);
    const aggregatedFeedbackBody = await aggregatedFeedbackStatus.json();
    const aggregatedFeedbackAsset = aggregatedFeedbackBody.assets.find(
      (asset: { assetId: string }) => asset.assetId === selectedAssetId,
    );
    expect(aggregatedFeedbackAsset).toMatchObject({
      feedbackResponses: 5, needsGuidanceResponses: 1,
    });
    for (const peerId of [
      users.feedbackPeer1, users.feedbackPeer2, users.feedbackPeer3, users.feedbackPeer4,
    ]) expect(JSON.stringify(aggregatedFeedbackBody)).not.toContain(peerId);
    expect(JSON.stringify(aggregatedFeedbackBody)).not.toContain("studentUserId");
    const prioritizedAnswer = await post(supervisedStudent, "/api/student/ai-tutor", {
      courseId: educatorCourseId,
      message: "چطور رطوبت و اقلیم را در درس جغرافیا مقایسه کنم؟",
    });
    const prioritizedAnswerBody = await prioritizedAnswer.json();
    expect(prioritizedAnswerBody.source.id).toBe(selectedAssetId);
    expect(prioritizedAnswerBody.guidedHint).toContain("بازهٔ زمانی");
    expect(prioritizedAnswerBody.coursePractice).toMatchObject({
      courseId: educatorCourseId, learningConceptId: "geography.climate.v1",
      prompt: "کدام گزینه تفاوت وضع هوا و اقلیم را نشان می‌دهد؟",
    });
    expect(prioritizedAnswerBody.coursePractice).not.toHaveProperty("correctOption");
    const helpfulFeedback = await post(supervisedStudent,
      "/api/student/ai-tutor/video-feedback", {
        courseId: educatorCourseId, assetId: selectedAssetId,
        needsGuidance: false,
      });
    expect(helpfulFeedback.status()).toBe(200);
    const helpfulAnswer = await post(supervisedStudent, "/api/student/ai-tutor", {
      courseId: educatorCourseId,
      message: "در جغرافیا ارتباط رطوبت با اقلیم چیست؟",
    });
    expect((await helpfulAnswer.json()).source.id).toBe(selectedAssetId);
    const tutorProfile = await supervisedStudent.get("/api/student/ai-tutor/profile");
    expect((await tutorProfile.json()).helpfulConceptIds).toContain("geography.climate.v1");    expect(await db.select({ assetId: studentAiTutorVideoFeedback.assetId })
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

  test("student tutor UI answers from reviewed content and remembers only an opted-in topic", async ({ page }) => {
    const cookie = await serializeSignedCookie(
      "better-auth.session_token", tokens.student,
      process.env.BETTER_AUTH_SECRET!,
    );
    const cookiePair = cookie.split(";")[0];
    const cookieSeparator = cookiePair.indexOf("=");
    await page.context().addCookies([{
      name: cookiePair.slice(0, cookieSeparator),
      value: cookiePair.slice(cookieSeparator + 1),
      url: "http://localhost:3000",
      httpOnly: true,
      sameSite: "Lax",
    }]);

    await page.goto("http://localhost:3000/student/ai-tutor");
    await page.getByLabel("دوره").selectOption(courseId);
    await page.getByLabel("پرسشت").fill("معادلهٔ یک‌مجهولی را چطور حل کنم؟");
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "پرسیدن" }).click();

    const chat = page.locator('section[aria-labelledby="tutor-chat-title"]');
    await expect(chat).toContainText("مجهول را تنها بگذار");
    await expect(chat).toContainText("منبع: معادلهٔ یک‌مجهولی");
    await expect(chat).toContainText("موضوع در مسیر شخصی تو ثبت شد.");

    await page.reload();
    await expect(page.getByText("۱ پرسش")).toBeVisible();
    await page.getByLabel("پرسشت").fill("یک موضوع ناشناخته دربارهٔ سیاره‌ای ساختگی");
    await page.getByRole("button", { name: "پرسیدن" }).click();
    await expect(chat).toContainText("برای این پرسش هنوز محتوای آموزشی آماده ندارم.");

    await page.getByLabel("دوره").selectOption(educatorCourseId);
    await page.getByLabel("پرسشت").fill("چطور رطوبت و اقلیم را در درس جغرافیا مقایسه کنم؟");
    await page.getByRole("button", { name: "پرسیدن" }).click();
    await expect(chat).toContainText("بررسی رطوبت و اقلیم");
    await expect(chat).toContainText("منبع: ویدئوی مدرس مستقل");
    await page.getByRole("button", { name: "توضیح بیشتری لازم دارم" }).click();
    await expect(chat).toContainText("برای پاسخ‌های بعدی از این ویدئو راهنمای بیشتری می‌گیرم.");

    await page.reload();
    await expect(page.getByText("مباحثی که برایشان راهنمایی بیشتری خواستی:"))
      .toBeVisible();
    await expect(page.getByText("اقلیم و رطوبت")).toBeVisible();
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
