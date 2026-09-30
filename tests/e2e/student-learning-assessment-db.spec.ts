import { randomUUID } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { serializeSignedCookie } from "better-call";
import { expect, request, test, type APIRequestContext } from "@playwright/test";
import { getDb } from "../../src/db";
import {
  courseLearningAssessmentQuestions, courseLearningAssessments, courses,
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
  const tokens = { student: randomUUID(), other: randomUUID() };
  const providerId = randomUUID();
  const instituteId = randomUUID();
  const courseId = randomUUID();
  const assessmentId = randomUUID();
  const assetIds = [randomUUID(), randomUUID(), randomUUID()];
  const questions = [randomUUID(), randomUUID(), randomUUID()];

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
  });

  test.afterAll(async () => {
    await db.delete(studentLearningAssessmentLessonReviews)
      .where(eq(studentLearningAssessmentLessonReviews.assessmentId, assessmentId));
    await db.delete(studentLearningAssessmentAttemptQuestions)
      .where(eq(studentLearningAssessmentAttemptQuestions.assessmentId, assessmentId));
    await db.delete(studentLearningAssessmentAttempts)
      .where(eq(studentLearningAssessmentAttempts.assessmentId, assessmentId));
    await db.delete(courseLearningAssessmentQuestions)
      .where(eq(courseLearningAssessmentQuestions.assessmentId, assessmentId));
    await db.delete(courseLearningAssessments).where(eq(courseLearningAssessments.id, assessmentId));
    await db.delete(studentEnrollments).where(eq(studentEnrollments.courseId, courseId));
    await db.delete(privateMediaAssets).where(eq(privateMediaAssets.courseId, courseId));
    await db.delete(supervisionGrants).where(eq(supervisionGrants.courseId, courseId));
    await db.delete(courses).where(eq(courses.id, courseId));
    await db.delete(session).where(inArray(session.userId, Object.values(users)));
    await db.delete(memberships).where(inArray(memberships.userId, Object.values(users)));
    await db.delete(verifiedEntities).where(inArray(verifiedEntities.id, [providerId, instituteId]));
    await db.delete(user).where(inArray(user.id, Object.values(users)));
  });

  test("hides answer keys, serializes starts, and requires lesson review before retry", async () => {
    const student = await client("student");
    const other = await client("other");
    const anonymous = await request.newContext({ baseURL: "http://localhost:3000" });
    expect((await anonymous.get(listPath)).status()).toBe(401);
    expect((await student.post(`${basePath}/attempts`, { data: {} })).status()).toBe(403);
    const listed = await student.get(listPath);
    expect(listed.status()).toBe(200);
    expect((await listed.json()).assessments).toHaveLength(1);

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
    await student.dispose();
  });
});
