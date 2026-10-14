import { randomUUID } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import { serializeSignedCookie } from "better-call";
import { expect, request, test, type APIRequestContext } from "@playwright/test";
import { getDb } from "../../src/db";
import {
  assessmentExamAttempts, assessmentExams, assessmentQuestionBanks, auditLogs,
  courseLearningAssessmentQuestions, courseLearningAssessments,
  coursePracticeQuestions, courses,
  educatorInstituteAffiliations, independentEducatorProfiles,
  memberships, privateMediaAssets, session, studentEnrollments,
  studentLearningAssessmentAttempts,
  studentLearningAssessmentAttemptQuestions,
  studentLearningAssessmentLessonReviews, supervisionGrants, user,
  verifiedEntities,
} from "../../src/db/schema";

test.describe.configure({ mode: "serial" });

test.describe("student learning assessment lifecycle", () => {
  const db = getDb();
  const users = { admin: randomUUID(), provider: randomUUID(), institute: randomUUID(),
    student: randomUUID(), other: randomUUID() };
  const tokens = {
    student: randomUUID(), other: randomUUID(), institute: randomUUID(),
    provider: randomUUID(),
  };
  const providerId = randomUUID();
  const instituteId = randomUUID();
  const courseId = randomUUID();
  const assessmentId = randomUUID();
  const pendingAssessmentId = randomUUID();
  const pendingQuestionId = randomUUID();
  const assetIds = [randomUUID(), randomUUID(), randomUUID()];
  const questions = [randomUUID(), randomUUID(), randomUUID()];
  const denaBankId = "00000000-0000-0000-0000-000000000002";
  const instituteBankId = randomUUID();
  const denaExamId = randomUUID();
  const instituteExamId = randomUUID();
  const denaOwnerId = "00000000-0000-0000-0000-000000000001";

  async function client(as: keyof typeof tokens): Promise<APIRequestContext> {
    const cookie = await serializeSignedCookie(
      "better-auth.session_token", tokens[as], process.env.BETTER_AUTH_SECRET!,
    );
    return request.newContext({ baseURL: "http://localhost:3000",
      extraHTTPHeaders: { Cookie: cookie.split(";")[0] } });
  }
  const post = (ctx: APIRequestContext, path: string, data: object) =>
    ctx.post(path, { data, headers: { Origin: "http://localhost:3000" } });
  const listPath = `/api/student/courses/${courseId}/assessments`;
  const basePath = `${listPath}/${assessmentId}`;

  test.beforeAll(async () => {
    await db.insert(user).values(Object.entries(users).map(([name, id]) => ({
      id, name, email: `${id}@assessment.example.test`,
    })));
    await db.insert(verifiedEntities).values([
      { id: providerId, role: "provider", name: "assessment provider",
        evidenceReference: "test/assessment-provider", verifiedByUserId: users.admin },
      { id: instituteId, role: "institute", name: "assessment institute",
        evidenceReference: "test/assessment-institute", verifiedByUserId: users.admin },
    ]);
    await db.insert(memberships).values([
      { userId: users.admin, role: "admin" },
      { userId: users.provider, role: "provider", providerId },
      { userId: users.institute, role: "institute", instituteId },
      { userId: users.student, role: "student" },
      { userId: users.other, role: "student" },
    ]);
    const expiresAt = new Date(Date.now() + 3_600_000);
    await db.insert(session).values([
      { userId: users.student, token: tokens.student, expiresAt },
      { userId: users.other, token: tokens.other, expiresAt },
      { userId: users.institute, token: tokens.institute, expiresAt },
      { userId: users.provider, token: tokens.provider, expiresAt },
    ]);
    await db.insert(courses).values({
      id: courseId, providerId, responsibleInstituteId: instituteId,
      publicationStatus: "published", title: "دوره ارزیابی یادگیری",
      createdByProviderUserId: users.provider, clientRequestId: randomUUID(),
    });
    await db.insert(supervisionGrants).values({
      courseId, providerId, instituteId, status: "approved",
      requestedByProviderUserId: users.provider,
      approvedByInstituteUserId: users.institute, approvedAt: new Date(),
    });
    await db.insert(assessmentQuestionBanks).values({
      id: instituteBankId, ownerType: "institute", ownerId: instituteId,
    });
    const examStartsAt = new Date(Date.now() - 60_000);
    const examEndsAt = new Date(Date.now() + 3_600_000);
    await db.insert(assessmentExams).values([
      { id: denaExamId, examType: "dena_coordinated",
        ownerType: "dena", ownerId: denaOwnerId, bankId: denaBankId,
        courseId: null, title: "آزمون هماهنگ دنا", instructions: "آزمون آزمایشی",
        startsAt: examStartsAt, endsAt: examEndsAt, durationMinutes: 30,
        attemptLimit: 1, status: "published", createdByUserId: users.admin },
      { id: instituteExamId, examType: "institute_planned",
        ownerType: "institute", ownerId: instituteId, bankId: instituteBankId,
        courseId, title: "آزمون مؤسسه", instructions: "آزمون آزمایشی",
        startsAt: examStartsAt, endsAt: examEndsAt, durationMinutes: 30,
        attemptLimit: 1, status: "published", createdByUserId: users.admin },
    ]);
    await db.insert(privateMediaAssets).values(assetIds.map((id, index) => ({
      id, courseId, title: `درس ${index + 1}`, objectKey: `${courseId}/${id}.mp4`,
    })));
    await db.insert(studentEnrollments).values({
      studentUserId: users.student, courseId, status: "active",
    });
    await db.insert(courseLearningAssessments).values({
      id: assessmentId, courseId, title: "ارزیابی فصل",
      instructions: "به پرسش‌ها پاسخ دهید.", questionCount: 2,
      requiredCorrectCount: 2, authoredByProviderUserId: users.provider,
      reviewStatus: "approved", reviewedByInstituteUserId: users.institute,
      reviewedAt: new Date(), reviewReason: "متن و کلیدها بررسی شدند.",
    });
    await db.insert(courseLearningAssessmentQuestions).values(questions.map((id, index) => ({
      id, assessmentId, courseId, lessonAssetId: assetIds[index],
      prompt: `کدام گزینه پاسخ درست پرسش ${index + 1} است؟`,
      option0: "پاسخ درست", option1: "گزینه دوم", option2: "گزینه سوم",
      option3: "گزینه چهارم", correctOption: 0,
    })));
    await db.insert(courseLearningAssessments).values({
      id: pendingAssessmentId, courseId, title: "ارزیابی منتظر بازبینی",
      instructions: "این ارزیابی هنوز در انتظار بازبینی است.", questionCount: 1,
      requiredCorrectCount: 1, authoredByProviderUserId: users.provider,
    });
    await db.insert(courseLearningAssessmentQuestions).values({
      id: pendingQuestionId, assessmentId: pendingAssessmentId, courseId,
      lessonAssetId: assetIds[0], prompt: "پرسش خصوصی ارزیابی در انتظار بازبینی چیست؟",
      option0: "پاسخ یک", option1: "پاسخ دو", option2: "پاسخ سه",
      option3: "پاسخ چهار", correctOption: 0,
    });
    await db.insert(coursePracticeQuestions).values({
      courseId, prompt: "پرسش تمرینی در انتظار بازبینی برای آزمون؟",
      option0: "گزینه یک", option1: "گزینه دو", option2: "گزینه سه",
      option3: "گزینه چهار", correctOption: 0,
      authoredByProviderUserId: users.provider,
    });
  });

  test.afterAll(async () => {
    await db.delete(assessmentExamAttempts).where(inArray(
      assessmentExamAttempts.examId, [denaExamId, instituteExamId],
    ));
    await db.delete(assessmentExams).where(inArray(assessmentExams.id,
      [denaExamId, instituteExamId]));
    await db.delete(assessmentQuestionBanks)
      .where(eq(assessmentQuestionBanks.id, instituteBankId));
    await db.delete(studentLearningAssessmentLessonReviews)
      .where(eq(studentLearningAssessmentLessonReviews.assessmentId, assessmentId));
    await db.delete(studentLearningAssessmentAttemptQuestions)
      .where(eq(studentLearningAssessmentAttemptQuestions.assessmentId, assessmentId));
    await db.delete(studentLearningAssessmentAttempts)
      .where(eq(studentLearningAssessmentAttempts.assessmentId, assessmentId));
    await db.delete(courseLearningAssessmentQuestions)
      .where(inArray(courseLearningAssessmentQuestions.assessmentId,
        [assessmentId, pendingAssessmentId]));
    await db.delete(courseLearningAssessments)
      .where(inArray(courseLearningAssessments.id, [assessmentId, pendingAssessmentId]));
    await db.delete(coursePracticeQuestions)
      .where(eq(coursePracticeQuestions.courseId, courseId));
    await db.delete(studentEnrollments).where(eq(studentEnrollments.courseId, courseId));
    await db.delete(privateMediaAssets).where(eq(privateMediaAssets.courseId, courseId));
    await db.delete(supervisionGrants).where(eq(supervisionGrants.courseId, courseId));
    await db.delete(courses).where(eq(courses.id, courseId));
    await db.delete(session).where(inArray(session.userId, Object.values(users)));
    await db.delete(memberships).where(inArray(memberships.userId, Object.values(users)));
    await db.delete(verifiedEntities).where(inArray(verifiedEntities.id, [providerId, instituteId]));
    await db.delete(user).where(inArray(user.id, Object.values(users)));
  });

  test("AI tutor enforces student access, blocks both exam types, and uses its starter corpus", async () => {
    const student = await client("student");
    const otherStudent = await client("other");
    const institute = await client("institute");
    const anonymous = await request.newContext({ baseURL: "http://localhost:3000" });

    const noOrigin = await student.post("/api/student/ai-tutor", {
      data: { courseId, message: "این مفهوم را توضیح بده." },
      headers: { Origin: "https://attacker.example" },
    });
    expect(noOrigin.status()).toBe(403);
    const unauthenticated = await anonymous.post("/api/student/ai-tutor", {
      data: { courseId, message: "این مفهوم را توضیح بده." },
      headers: { Origin: "http://localhost:3000" },
    });
    expect(unauthenticated.status()).toBe(401);
    const wrongRole = await post(institute, "/api/student/ai-tutor", {
      courseId, message: "این مفهوم را توضیح بده.",
    });
    expect(wrongRole.status()).toBe(404);
    const invalidPayload = await post(student, "/api/student/ai-tutor", {
      courseId, message: "", unexpected: true,
    });
    expect(invalidPayload.status()).toBe(400);
    const noCourseEntitlement = await post(otherStudent, "/api/student/ai-tutor", {
      courseId, message: "این مفهوم را توضیح بده.",
    });
    expect(noCourseEntitlement.status()).toBe(404);

    for (const examId of [denaExamId, instituteExamId]) {
      const attemptId = randomUUID();
      const now = new Date();
      await db.insert(assessmentExamAttempts).values({
        id: attemptId, examId, studentUserId: users.student, attemptNumber: 1,
        status: "in_progress", questionCount: 1,
        startedAt: now, deadlineAt: new Date(now.getTime() + 1_800_000),
      });
      const blocked = await post(student, "/api/student/ai-tutor", {
        courseId, message: "این مفهوم را توضیح بده.",
      });
      expect(blocked.status()).toBe(403);
      expect(await blocked.json()).toMatchObject({ code: "ACTIVE_EXAM" });
      expect(blocked.headers()["cache-control"]).toContain("no-store");
      const practiceDuringExam = await student.get(
        "/api/student/ai-tutor/practice?courseId=" + courseId,
      );
      expect(practiceDuringExam.status()).toBe(403);
      await db.delete(assessmentExamAttempts)
        .where(eq(assessmentExamAttempts.id, attemptId));
    }

    const noProfilePractice = await student.get(
      "/api/student/ai-tutor/practice?courseId=" + courseId,
    );
    expect(noProfilePractice.status()).toBe(404);

    const supported = await post(student, "/api/student/ai-tutor", {
      courseId, message: "معادلهٔ یک‌مجهولی را چطور حل کنم؟",
      rememberTopic: true,
    });
    expect(supported.status()).toBe(200);
    expect(await supported.json()).toMatchObject({
      source: { id: "math.linear-equation.v1", corpusVersion: expect.any(String) },
      topicRecorded: true,
    });
    expect(supported.headers()["cache-control"]).toContain("no-store");

    const ownProfile = await student.get("/api/student/ai-tutor/profile");
    expect(ownProfile.status()).toBe(200);
    expect(await ownProfile.json()).toMatchObject({
      topics: [{ topicId: "math.linear-equation.v1", questionCount: 1 }],
    });
    const otherProfile = await otherStudent.get("/api/student/ai-tutor/profile");
    expect(await otherProfile.json()).toMatchObject({ topics: [] });
    const practiceResponse = await student.get(
      "/api/student/ai-tutor/practice?courseId=" + courseId,
    );
    expect(practiceResponse.status()).toBe(200);
    const practiceQuestion = await practiceResponse.json();
    expect(practiceQuestion).toMatchObject({
      questionId: "practice.linear-equation.v1",
      topicTitle: "معادلهٔ یک‌مجهولی",
      options: expect.any(Array),
    });
    expect(practiceQuestion).not.toHaveProperty("correctOption");
    const correctPractice = await post(student, "/api/student/ai-tutor/practice", {
      courseId, questionId: practiceQuestion.questionId, selectedOption: 1,
      rememberResult: true,
    });
    expect(correctPractice.status()).toBe(200);
    expect(await correctPractice.json()).toMatchObject({
      correct: true, explanation: expect.stringContaining("x = ۴"), resultRecorded: true,
    });
    const wrongPractice = await post(student, "/api/student/ai-tutor/practice", {
      courseId, questionId: practiceQuestion.questionId, selectedOption: 0,
      rememberResult: true,
    });
    expect(await wrongPractice.json()).toMatchObject({ correct: false, resultRecorded: true });
    const profileWithResults = await (await student.get("/api/student/ai-tutor/profile")).json();
    expect(profileWithResults).toMatchObject({ topics: [{
      topicId: "math.linear-equation.v1", practiceAttemptCount: 2, practiceCorrectCount: 1,
      practiceNeedsGuidance: true,
    }] });
    const nextPractice = await (await student.get(
      "/api/student/ai-tutor/practice?courseId=" + courseId,
    )).json();
    expect(nextPractice.guidedHint).toEqual(expect.any(String));
    const unrecordedPractice = await post(student, "/api/student/ai-tutor/practice", {
      courseId, questionId: practiceQuestion.questionId, selectedOption: 1,
      rememberResult: false,
    });
    expect(await unrecordedPractice.json()).toMatchObject({ correct: true, resultRecorded: false });
    const profileWithoutThirdResult = await (await student.get("/api/student/ai-tutor/profile")).json();
    expect(profileWithoutThirdResult).toMatchObject({ topics: [{
      topicId: "math.linear-equation.v1", practiceAttemptCount: 2, practiceCorrectCount: 1,
      practiceNeedsGuidance: true,
    }] });
    const savedCorrectPractice = await post(student, "/api/student/ai-tutor/practice", {
      courseId, questionId: practiceQuestion.questionId, selectedOption: 1,
      rememberResult: true,
    });
    expect(await savedCorrectPractice.json()).toMatchObject({
      correct: true, resultRecorded: true,
    });
    const recoveredPractice = await (await student.get(
      "/api/student/ai-tutor/practice?courseId=" + courseId,
    )).json();
    expect(recoveredPractice.guidedHint).toBeNull();
    const recoveredProfile = await (await student.get("/api/student/ai-tutor/profile")).json();
    expect(recoveredProfile).toMatchObject({ topics: [{
      topicId: "math.linear-equation.v1", practiceAttemptCount: 3, practiceCorrectCount: 2,
      practiceNeedsGuidance: false,
    }] });
    const cleared = await student.delete("/api/student/ai-tutor/profile", {
      headers: { Origin: "http://localhost:3000" },
    });
    expect(cleared.status()).toBe(200);
    expect(await cleared.json()).toMatchObject({ deleted: 1 });
    const stalePractice = await post(student, "/api/student/ai-tutor/practice", {
      courseId, questionId: practiceQuestion.questionId, selectedOption: 1,
    });
    expect(stalePractice.status()).toBe(404);
    expect(await (await student.get("/api/student/ai-tutor/profile")).json())
      .toMatchObject({ topics: [] });
    const noConsent = await post(student, "/api/student/ai-tutor", {
      courseId, message: "جمع کسرها را توضیح بده.",
    });
    expect(await noConsent.json()).toMatchObject({ topicRecorded: false });
    expect(await (await student.get("/api/student/ai-tutor/profile")).json())
      .toMatchObject({ topics: [] });
    const crossOriginDelete = await student.delete("/api/student/ai-tutor/profile", {
      headers: { Origin: "https://attacker.example" },
    });
    expect(crossOriginDelete.status()).toBe(403);

    const unsupported = await post(student, "/api/student/ai-tutor", {
      courseId, message: "نظریه نسبیت را توضیح بده.",
    });
    expect(unsupported.status()).toBe(422);
    expect(await unsupported.json()).toMatchObject({
      code: "STARTER_CONTENT_NOT_FOUND",
    });
    expect(unsupported.headers()["cache-control"]).toContain("no-store");
    await anonymous.dispose();
    await otherStudent.dispose();
    await institute.dispose();
    await student.dispose();
  });

  test("student home surfaces published institute and Dena exams", async () => {
    const student = await client("student");
    const home = await student.get("/student");
    expect(home.status()).toBe(200);
    const html = await home.text();
    expect(html).toContain("آزمون‌های من");
    expect(html).toContain("آزمون هماهنگ دنا");
    expect(html).toContain("آزمون مؤسسه");
    expect(html).toContain("/student/assessments");
    await student.dispose();
  });

  test("independent educator can author a scoped learning assessment for institute review", async () => {
    const independentCourseId = randomUUID();
    const profileId = randomUUID();
    const affiliationId = randomUUID();
    const assetId = randomUUID();
    let assessmentId: string | null = null;
    await db.insert(independentEducatorProfiles).values({
      id: profileId, userId: users.student, displayName: "همکار آزمون",
    });
    await db.insert(educatorInstituteAffiliations).values({
      id: affiliationId, educatorProfileId: profileId, instituteId,
      requestedByUserId: users.student, clientRequestId: randomUUID(),
      displayNameSnapshot: "همکار آزمون",
      statement: "همکاری آموزشی برای آزمون یک دورهٔ آزمایشی.",
      status: "approved", reviewedByUserId: users.institute,
      reviewedAt: new Date(), decisionReason: "همکاری برای آزمون پذیرفته شد.",
    });
    await db.insert(courses).values({
      id: independentCourseId, ownerType: "independent_educator",
      independentEducatorProfileId: profileId, providerId: null,
      responsibleInstituteId: instituteId, title: "دورهٔ همکار مستقل",
      createdByProviderUserId: users.student, clientRequestId: randomUUID(),
    });
    await db.insert(supervisionGrants).values({
      courseId: independentCourseId, ownerType: "independent_educator",
      independentEducatorProfileId: profileId, providerId: null, instituteId,
      status: "approved", requestedByProviderUserId: users.student,
      approvedByInstituteUserId: users.institute, approvedAt: new Date(),
    });
    await db.insert(privateMediaAssets).values({
      id: assetId, courseId: independentCourseId, title: "درس آماده",
      objectKey: `${independentCourseId}/${assetId}.mp4`,
    });
    // Exercise the mixed-role case: course owner is also an institute member,
    // and must still be unable to review their own practice question.
    await db.insert(memberships).values({
      userId: users.student, role: "institute", instituteId,
    });

    try {
      const educator = await client("student");
      const instituteClient = await client("institute");
      const selfReviewClient = await client("student");
      const other = await client("other");
      const path = `/api/independent-educator/courses/${independentCourseId}/assessments`;
      expect((await educator.get(path)).status()).toBe(200);
      expect((await other.get(path)).status()).toBe(404);
      expect((await post(other,
        `/api/independent-educator/courses/${independentCourseId}/publication`,
        { action: "publish" })).status()).toBe(404);
      const created = await post(educator, path, {
        title: "ارزیابی همکار مستقل", instructions: "به پرسش پاسخ دهید.",
        questionCount: 1, requiredCorrectCount: 1,
        questions: [{
          prompt: "کدام گزینه برای ارزیابی این درس درست است؟",
          options: ["پاسخ درست", "گزینهٔ دوم", "گزینهٔ سوم", "گزینهٔ چهارم"],
          correctOption: 0, lessonAssetId: assetId,
        }],
      });
      expect(created.status()).toBe(201);
      const createdBody = await created.json();
      assessmentId = createdBody.assessmentId;
      expect(createdBody).toMatchObject({ reviewStatus: "pending" });
      expect((await instituteClient.get(
        `/api/institute/courses/${independentCourseId}/assessments`,
      )).status()).toBe(200);
      const decision = await post(instituteClient,
        `/api/institute/courses/${independentCourseId}/assessments/${assessmentId}`, {
          action: "approve", reason: "متن، کلید و درس مرتبط بررسی شد.",
        });
      expect(decision.status()).toBe(200);
      expect(await decision.json()).toMatchObject({ reviewStatus: "approved" });
      const practicePath = `/api/independent-educator/courses/${independentCourseId}/practice`;
      const practiceCreated = await post(educator, practicePath, {
        learningConceptId: "math.percent.v1",
        prompt: "کدام گزینه درصد یک‌چهارم را نشان می‌دهد؟",
        options: ["۲۵ درصد", "۵۰ درصد", "۷۵ درصد", "۱۰۰ درصد"],
        correctOption: 0,
      });
      expect(practiceCreated.status()).toBe(201);
      expect((await educator.get(practicePath)).status()).toBe(200);
      const practiceReviewPath = `/api/institute/courses/${independentCourseId}/practice`;
      expect((await selfReviewClient.get(practiceReviewPath)).status()).toBe(404);
      expect((await post(selfReviewClient, practiceReviewPath, {
        action: "approve", reason: "نباید مالک خودش تصمیم بازبینی بگیرد.",
      })).status()).toBe(404);
      const pendingPractice = await instituteClient.get(practiceReviewPath);
      expect(pendingPractice.status()).toBe(200);
      expect((await pendingPractice.json()).question).toMatchObject({
        reviewStatus: "pending", correctOption: 0,
      });
      const practiceDecision = await post(instituteClient, practiceReviewPath, {
        action: "approve", reason: "پرسش و پاسخ درست برای این درس بررسی شد.",
      });
      expect(practiceDecision.status()).toBe(200);
      expect(await practiceDecision.json()).toMatchObject({ reviewStatus: "approved" });
      const practicePage = await educator.get(
        `/account/independent-educator/courses/${independentCourseId}/practice`,
      );
      expect(practicePage.status()).toBe(200);
      expect(await practicePage.text()).toContain("کدام گزینه درصد یک‌چهارم را نشان می‌دهد؟");
      const page = await educator.get(
        `/account/independent-educator/courses/${independentCourseId}/assessments`,
      );
      expect(page.status()).toBe(200);
      expect(await page.text()).toContain("ارزیابی همکار مستقل");
      const publication = await post(educator,
        `/api/independent-educator/courses/${independentCourseId}/publication`,
        { action: "publish" });
      expect(publication.status()).toBe(200);
      expect(await publication.json()).toMatchObject({
        courseId: independentCourseId, publicationStatus: "published", replayed: false,
      });
      const catalog = await other.get(
        `/api/student/courses?q=${encodeURIComponent("دورهٔ همکار مستقل")}`,
      );
      expect(catalog.status()).toBe(200);
      expect((await catalog.json()).courses).toEqual(expect.arrayContaining([
        expect.objectContaining({
          courseId: independentCourseId, title: "دورهٔ همکار مستقل",
          ownerType: "independent_educator",
        }),
      ]));
      expect((await post(other,
        `/api/student/courses/${independentCourseId}/enroll`, {})).status()).toBe(201);
      const studentPractice = await other.get(`/api/student/courses/${independentCourseId}/practice`);
      expect(studentPractice.status()).toBe(200);
      const studentPracticeBody = (await studentPractice.json()).practice;
      expect(studentPracticeBody).toMatchObject({
        prompt: "کدام گزینه درصد یک‌چهارم را نشان می‌دهد؟",
      });
      expect(studentPracticeBody).not.toHaveProperty("correctOption");
      await educator.dispose();
      await instituteClient.dispose();
      await other.dispose();
      await selfReviewClient.dispose();
    } finally {
      if (assessmentId) {
        await db.delete(auditLogs).where(and(
          eq(auditLogs.entityType, "PRACTICE"), eq(auditLogs.entityId, assessmentId),
        ));
        await db.delete(courseLearningAssessmentQuestions)
          .where(eq(courseLearningAssessmentQuestions.assessmentId, assessmentId));
        await db.delete(courseLearningAssessments)
          .where(eq(courseLearningAssessments.id, assessmentId));
      }
      await db.delete(privateMediaAssets).where(eq(privateMediaAssets.id, assetId));
      await db.delete(auditLogs).where(and(
        eq(auditLogs.entityType, "PRACTICE"), eq(auditLogs.entityId, independentCourseId),
      ));
      await db.delete(coursePracticeQuestions)
        .where(eq(coursePracticeQuestions.courseId, independentCourseId));
      await db.delete(studentEnrollments)
        .where(and(eq(studentEnrollments.courseId, independentCourseId),
          eq(studentEnrollments.studentUserId, users.other)));
      await db.delete(memberships).where(and(
        eq(memberships.userId, users.student), eq(memberships.role, "institute"),
        eq(memberships.instituteId, instituteId),
      ));
      await db.delete(supervisionGrants).where(eq(supervisionGrants.courseId, independentCourseId));
      await db.delete(courses).where(eq(courses.id, independentCourseId));
      await db.delete(educatorInstituteAffiliations).where(eq(educatorInstituteAffiliations.id, affiliationId));
      await db.delete(independentEducatorProfiles).where(eq(independentEducatorProfiles.id, profileId));
    }
  });

  test("hides answer keys, serializes starts, and requires lesson review before retry", async () => {
    const student = await client("student");
    const other = await client("other");
    const institute = await client("institute");
    const provider = await client("provider");
    const anonymous = await request.newContext({ baseURL: "http://localhost:3000" });
    expect((await anonymous.get(listPath)).status()).toBe(401);
    expect((await student.post(`${basePath}/attempts`, { data: {} })).status()).toBe(403);
    const listed = await student.get(listPath);
    expect(listed.status()).toBe(200);
    expect((await listed.json()).assessments).toHaveLength(1);

    const instituteHome = await institute.get("/institute");
    expect(instituteHome.status()).toBe(200);
    const instituteHomeHtml = await instituteHome.text();
    expect(instituteHomeHtml).toMatch(/تأییدشده:(?: <!-- -->)۱/);
    expect(instituteHomeHtml).toContain("مشاهدهٔ ارزیابی‌های یادگیری");
    const instituteCourses = await institute.get("/institute/courses");
    expect(instituteCourses.status()).toBe(200);
    const instituteCoursesHtml = await instituteCourses.text();
    expect(instituteCoursesHtml).toContain("دوره ارزیابی یادگیری");
    expect(instituteCoursesHtml).toContain(
      `/institute/courses/${courseId}/assessments`,
    );
    expect((await student.get("/institute/courses")).status()).toBe(404);
    const instituteAssessmentQueue = await institute.get("/institute/assessments");
    expect(instituteAssessmentQueue.status()).toBe(200);
    const queueHtml = await instituteAssessmentQueue.text();
    expect(queueHtml).toContain("سؤال‌های تمرینی");
    expect(queueHtml).toContain("سؤال تمرینی در انتظار بررسی نیست.");
    expect(queueHtml).toContain("ارزیابی‌های یادگیری");
    expect(queueHtml).toContain("ارزیابی یادگیری در انتظار بررسی نیست.");
    expect(queueHtml).not.toContain("پرسش خصوصی ارزیابی در انتظار بازبینی چیست؟");
    expect(queueHtml).not.toContain("پرسش تمرینی در انتظار بازبینی برای آزمون؟");
    expect((await student.get("/institute/assessments")).status()).toBe(404);
    const instituteProfile = await institute.get("/institute/profile");
    expect(instituteProfile.status()).toBe(200);
    const instituteProfileHtml = await instituteProfile.text();
    expect(instituteProfileHtml).toContain("assessment institute");
    expect(instituteProfileHtml).not.toContain("test/assessment-institute");
    expect((await student.get("/institute/profile")).status()).toBe(404);
    const instituteLearning = await institute.get("/institute/learning");
    expect(instituteLearning.status()).toBe(200);
    const instituteLearningHtml = await instituteLearning.text();
    expect(instituteLearningHtml).toContain("آمادگی آموزشی دوره‌ها");
    expect(instituteLearningHtml).not.toContain("پرسش خصوصی ارزیابی در انتظار بازبینی چیست؟");
    expect((await student.get("/institute/learning")).status()).toBe(404);

    const providerHome = await provider.get("/provider");
    expect(providerHome.status()).toBe(200);
    const providerHomeHtml = await providerHome.text();
    expect(providerHomeHtml).toContain("ارزیابی‌های یادگیری");
    expect(providerHomeHtml).toContain("تأییدشده");
    expect(providerHomeHtml).toContain(`/provider/courses/${courseId}/assessments`);
    expect(providerHomeHtml).toContain('href="/provider/courses"');
    expect(providerHomeHtml).not.toContain("کدام گزینه پاسخ درست پرسش 1 است؟");
    const providerCourses = await provider.get("/provider/courses");
    expect(providerCourses.status()).toBe(200);
    expect(await providerCourses.text()).toContain("دوره ارزیابی یادگیری");
    const providerAssessments = await provider.get("/provider/assessments");
    expect(providerAssessments.status()).toBe(200);
    const providerAssessmentsHtml = await providerAssessments.text();
    expect(providerAssessmentsHtml).toContain("ارزیابی فصل");
    expect(providerAssessmentsHtml).toContain("تأییدشده");
    expect(providerAssessmentsHtml).not.toContain("کدام گزینه پاسخ درست پرسش 1 است؟");
    const providerProfile = await provider.get("/provider/profile");
    expect(providerProfile.status()).toBe(200);
    const providerProfileHtml = await providerProfile.text();
    expect(providerProfileHtml).toContain("assessment provider");
    expect(providerProfileHtml).not.toContain("test/assessment-provider");
    const providerLearning = await provider.get("/provider/learning");
    expect(providerLearning.status()).toBe(200);
    const providerLearningHtml = await providerLearning.text();
    expect(providerLearningHtml).toContain("آمادگی آموزشی دوره‌ها");
    expect(providerLearningHtml).not.toContain("پرسش خصوصی ارزیابی در انتظار بازبینی چیست؟");
    expect((await student.get("/provider/courses")).status()).toBe(404);
    expect((await student.get("/provider/assessments")).status()).toBe(404);
    expect((await student.get("/provider/profile")).status()).toBe(404);
    expect((await student.get("/provider/learning")).status()).toBe(404);
    const providerAccount = await provider.get("/account");
    const providerAccountHtml = await providerAccount.text();
    expect(providerAccountHtml).toContain('href="/provider/profile"');
    expect(providerAccountHtml).toContain('href="/provider/learning"');
    expect(providerAccountHtml).not.toContain('href="/institute"');

    const starts = await Promise.all([
      post(student, `${basePath}/attempts`, {}),
      post(student, `${basePath}/attempts`, {}),
    ]);
    expect(starts.every((response) => response.status() === 200 || response.status() === 201)).toBe(true);
    const startBodies = await Promise.all(starts.map((response) => response.json()));
    expect(new Set(startBodies.map((body) => body.attemptId)).size).toBe(1);
    const attemptId = startBodies[0].attemptId as string;

    const attemptResponse = await student.get(`${basePath}/attempts/${attemptId}`);
    expect(attemptResponse.status()).toBe(200);
    const attempt = (await attemptResponse.json()).attempt;
    expect(attempt.questions).toHaveLength(2);
    expect(JSON.stringify(attempt)).not.toContain("correctOption");
    expect(JSON.stringify(attempt)).not.toContain('"correct"');
    expect((await other.get(`${basePath}/attempts/${attemptId}`)).status()).toBe(404);

    const answers = Object.fromEntries(attempt.questions.map((item: { questionId: string }) =>
      [item.questionId, 1]));
    const submitted = await post(student, `${basePath}/attempts/${attemptId}`, { answers });
    expect(submitted.status()).toBe(201);
    const result = await submitted.json();
    expect(result).toMatchObject({ outcome: "needs_review", correctCount: 0, questionCount: 2 });
    expect(JSON.stringify(result)).not.toContain("correctOption");

    const growth = await student.get("/student/growth");
    expect(growth.status()).toBe(200);
    const growthHtml = await growth.text();
    expect(growthHtml).toContain("ارزیابی فصل");
    expect(growthHtml).toContain("۰٪");
    const otherGrowth = await other.get("/student/growth");
    expect(otherGrowth.status()).toBe(200);
    expect(await otherGrowth.text()).not.toContain("ارزیابی فصل");

    const submittedAttempt = (await (await student.get(
      `${basePath}/attempts/${attemptId}`)).json()).attempt;
    expect(submittedAttempt.missedLessonAssetIds).toHaveLength(2);
    const blocked = await post(student, `${basePath}/attempts`, {});
    expect(blocked.status()).toBe(200);
    const blockedBody = await blocked.json();
    expect(blockedBody.reviewRequired).toBe(true);
    for (const lessonAssetId of blockedBody.outstandingLessonAssetIds as string[]) {
      const response = await post(student,
        `${basePath}/attempts/${attemptId}/lesson-reviews`, { lessonAssetId });
      expect(response.status()).toBe(201);
    }
    const retried = await post(student, `${basePath}/attempts`, {});
    expect(retried.status()).toBe(201);
    expect((await retried.json()).attemptNumber).toBe(2);
    await anonymous.dispose();
    await other.dispose();
    await institute.dispose();
    await provider.dispose();
    await student.dispose();
  });
});
