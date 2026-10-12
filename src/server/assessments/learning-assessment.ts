import { and, eq, inArray, or, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../../db";
import { isVerifiedProviderCourse } from "../courses/ownership";
import {
  auditLogs, courseLearningAssessments, courseLearningAssessmentQuestions, courses,
  memberships, privateMediaAssets, studentLearningAssessmentAttempts,
  studentLearningAssessmentAttemptQuestions,
  studentLearningAssessmentLessonReviews, supervisionGrants,
} from "../../db/schema";
import { auditLogRecord } from "../admin/audit";

const controlChars = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u;
const option = z.string().trim().min(1).max(160).refine((v) => !controlChars.test(v));
const question = z.object({
  prompt: z.string().trim().min(10).max(500).refine((v) => !controlChars.test(v)),
  options: z.tuple([option, option, option, option]).refine((values) =>
    new Set(values.map((value) => value.toLocaleLowerCase())).size === 4,
  ),
  correctOption: z.number().int().min(0).max(3),
  lessonAssetId: z.uuid(),
}).strict();

export const newLearningAssessment = z.object({
  title: z.string().trim().min(3).max(160).refine((v) => !controlChars.test(v)),
  instructions: z.string().trim().min(1).max(1000)
    .refine((v) => !controlChars.test(v)),
  questionCount: z.number().int().min(1).max(100),
  requiredCorrectCount: z.number().int().min(1).max(100),
  questions: z.array(question).min(1).max(100),
}).strict().superRefine((value, ctx) => {
  if (value.questions.length < value.questionCount) {
    ctx.addIssue({ code: "custom", path: ["questions"],
      message: "question_bank_too_small" });
  }
  if (value.requiredCorrectCount > value.questionCount) {
    ctx.addIssue({ code: "custom", path: ["requiredCorrectCount"],
      message: "required_correct_exceeds_question_count" });
  }
});

export const learningAssessmentDecision = z.object({
  action: z.enum(["approve", "reject"]),
  reason: z.string().trim().min(15).max(500).refine((v) => !controlChars.test(v)),
}).strict();

export const learningAssessmentAnswers = z.object({
  answers: z.record(z.uuid(), z.number().int().min(0).max(3)),
}).strict();

export const learningAssessmentLessonReview = z.object({
  lessonAssetId: z.uuid(),
}).strict();

export class LearningAssessmentUnavailable extends Error {
  constructor(readonly kind: "not_available" | "already_reviewed" | "invalid_bank" |
    "attempt_closed" | "incomplete_answers" | "review_required") {
    super(kind);
  }
}

/** Lists only approved assessments and this learner's own attempt outcomes. */
export async function getStudentLearningAssessments(
  studentUserId: string, courseId: string,
) {
  const db = getDb();
  const assessments = await db.select({
    id: courseLearningAssessments.id,
    title: courseLearningAssessments.title,
    instructions: courseLearningAssessments.instructions,
    questionCount: courseLearningAssessments.questionCount,
    requiredCorrectCount: courseLearningAssessments.requiredCorrectCount,
  }).from(courseLearningAssessments).where(and(
    eq(courseLearningAssessments.courseId, courseId),
    eq(courseLearningAssessments.reviewStatus, "approved"),
  ));
  const rows = assessments.length ? await db.select({
    assessmentId: studentLearningAssessmentAttempts.assessmentId,
    attemptNumber: studentLearningAssessmentAttempts.attemptNumber,
    status: studentLearningAssessmentAttempts.status,
    outcome: studentLearningAssessmentAttempts.outcome,
    correctCount: studentLearningAssessmentAttempts.correctCount,
    submittedAt: studentLearningAssessmentAttempts.submittedAt,
  }).from(studentLearningAssessmentAttempts).where(and(
    eq(studentLearningAssessmentAttempts.studentUserId, studentUserId),
    inArray(studentLearningAssessmentAttempts.assessmentId,
      assessments.map((assessment) => assessment.id)),
  )) : [];
  return { courseId, assessments: assessments.map((assessment) => ({
    ...assessment,
    attempts: rows.filter((attempt) => attempt.assessmentId === assessment.id)
      .sort((a, b) => a.attemptNumber - b.attemptNumber),
  })) };
}

/** Starts or resumes an attempt. New attempts require acknowledgements for
 * every lesson attached to a missed question from the previous attempt. */
export async function startStudentLearningAssessment(
  studentUserId: string, courseId: string, assessmentId: string,
) {
  return getDb().transaction(async (tx) => {
    const [assessment] = await tx.select().from(courseLearningAssessments)
      .where(and(
        eq(courseLearningAssessments.id, assessmentId),
        eq(courseLearningAssessments.courseId, courseId),
        eq(courseLearningAssessments.reviewStatus, "approved"),
      )).limit(1).for("update");
    if (!assessment) return null;
    const attempts = await tx.select().from(studentLearningAssessmentAttempts)
      .where(and(
        eq(studentLearningAssessmentAttempts.assessmentId, assessmentId),
        eq(studentLearningAssessmentAttempts.studentUserId, studentUserId),
      )).orderBy(sql`${studentLearningAssessmentAttempts.attemptNumber} DESC`);
    const previous = attempts[0];
    if (previous?.status === "in_progress") {
      return { attemptId: previous.id, attemptNumber: previous.attemptNumber,
        resumed: true };
    }
    if (previous?.outcome === "completed") {
      return { completed: true, attemptId: previous.id,
        attemptNumber: previous.attemptNumber };
    }
    if (previous?.outcome === "needs_review") {
      const missed = await tx.select({ lessonAssetId:
        courseLearningAssessmentQuestions.lessonAssetId })
        .from(studentLearningAssessmentAttemptQuestions)
        .innerJoin(courseLearningAssessmentQuestions, eq(
          courseLearningAssessmentQuestions.id,
          studentLearningAssessmentAttemptQuestions.questionId,
        )).where(and(
          eq(studentLearningAssessmentAttemptQuestions.attemptId, previous.id),
          eq(studentLearningAssessmentAttemptQuestions.correct, false),
        ));
      const lessonAssetIds = [...new Set(missed.map((row) => row.lessonAssetId))];
      const reviews = lessonAssetIds.length ? await tx.select({
        lessonAssetId: studentLearningAssessmentLessonReviews.lessonAssetId,
      }).from(studentLearningAssessmentLessonReviews).where(and(
        eq(studentLearningAssessmentLessonReviews.attemptId, previous.id),
        eq(studentLearningAssessmentLessonReviews.studentUserId, studentUserId),
        inArray(studentLearningAssessmentLessonReviews.lessonAssetId, lessonAssetIds),
      )) : [];
      const reviewedIds = new Set(reviews.map((row) => row.lessonAssetId));
      const outstandingLessonAssetIds = lessonAssetIds.filter((id) => !reviewedIds.has(id));
      if (outstandingLessonAssetIds.length) {
        return { reviewRequired: true, previousAttemptId: previous.id,
          outstandingLessonAssetIds };
      }
    }
    const bank = await tx.select({ id: courseLearningAssessmentQuestions.id })
      .from(courseLearningAssessmentQuestions).where(and(
        eq(courseLearningAssessmentQuestions.assessmentId, assessmentId),
        eq(courseLearningAssessmentQuestions.courseId, courseId),
      )).orderBy(sql`random()`).limit(assessment.questionCount);
    if (bank.length !== assessment.questionCount) {
      throw new LearningAssessmentUnavailable("invalid_bank");
    }
    const [attempt] = await tx.insert(studentLearningAssessmentAttempts).values({
      assessmentId, courseId, studentUserId,
      attemptNumber: (previous?.attemptNumber ?? 0) + 1,
    }).returning({ id: studentLearningAssessmentAttempts.id,
      attemptNumber: studentLearningAssessmentAttempts.attemptNumber });
    await tx.insert(studentLearningAssessmentAttemptQuestions).values(bank.map((item, position) => ({
      attemptId: attempt.id, assessmentId, courseId,
      questionId: item.id, position,
    })));
    return { attemptId: attempt.id, attemptNumber: attempt.attemptNumber,
      resumed: false };
  });
}

/** Student-facing attempt view deliberately omits answer keys and per-item correctness. */
export async function getStudentLearningAssessmentAttempt(
  studentUserId: string, courseId: string, assessmentId: string, attemptId: string,
) {
  const db = getDb();
  const [attempt] = await db.select({
    id: studentLearningAssessmentAttempts.id,
    attemptNumber: studentLearningAssessmentAttempts.attemptNumber,
    status: studentLearningAssessmentAttempts.status,
    outcome: studentLearningAssessmentAttempts.outcome,
    correctCount: studentLearningAssessmentAttempts.correctCount,
    submittedAt: studentLearningAssessmentAttempts.submittedAt,
    questionCount: courseLearningAssessments.questionCount,
    title: courseLearningAssessments.title,
    instructions: courseLearningAssessments.instructions,
  }).from(studentLearningAssessmentAttempts)
    .innerJoin(courseLearningAssessments, and(
      eq(courseLearningAssessments.id, studentLearningAssessmentAttempts.assessmentId),
      eq(courseLearningAssessments.courseId, studentLearningAssessmentAttempts.courseId),
    )).where(and(
      eq(studentLearningAssessmentAttempts.id, attemptId),
      eq(studentLearningAssessmentAttempts.assessmentId, assessmentId),
      eq(studentLearningAssessmentAttempts.courseId, courseId),
      eq(studentLearningAssessmentAttempts.studentUserId, studentUserId),
    )).limit(1);
  if (!attempt) return null;
  const questions = await db.select({
    questionId: studentLearningAssessmentAttemptQuestions.questionId,
    position: studentLearningAssessmentAttemptQuestions.position,
    selectedOption: studentLearningAssessmentAttemptQuestions.selectedOption,
    prompt: courseLearningAssessmentQuestions.prompt,
    option0: courseLearningAssessmentQuestions.option0,
    option1: courseLearningAssessmentQuestions.option1,
    option2: courseLearningAssessmentQuestions.option2,
    option3: courseLearningAssessmentQuestions.option3,
  }).from(studentLearningAssessmentAttemptQuestions)
    .innerJoin(courseLearningAssessmentQuestions, eq(
      courseLearningAssessmentQuestions.id,
      studentLearningAssessmentAttemptQuestions.questionId,
    )).where(eq(studentLearningAssessmentAttemptQuestions.attemptId, attemptId))
    .orderBy(studentLearningAssessmentAttemptQuestions.position);
  const missedRows = attempt.outcome === "needs_review" ? await db.select({
    lessonAssetId: courseLearningAssessmentQuestions.lessonAssetId,
  }).from(studentLearningAssessmentAttemptQuestions)
    .innerJoin(courseLearningAssessmentQuestions, eq(
      courseLearningAssessmentQuestions.id,
      studentLearningAssessmentAttemptQuestions.questionId,
    )).where(and(
      eq(studentLearningAssessmentAttemptQuestions.attemptId, attemptId),
      eq(studentLearningAssessmentAttemptQuestions.correct, false),
    )) : [];
  return { ...attempt, questions: questions.map((item) => ({
    ...item, options: [item.option0, item.option1, item.option2, item.option3],
    option0: undefined, option1: undefined, option2: undefined, option3: undefined,
  })), missedLessonAssetIds: [...new Set(missedRows.map((row) => row.lessonAssetId))] };
}

/** Grades submitted answers on the server; only aggregate outcome/count return. */
export async function submitStudentLearningAssessment(
  studentUserId: string, courseId: string, assessmentId: string, attemptId: string,
  answers: Record<string, number>,
) {
  return getDb().transaction(async (tx) => {
    const [assessment] = await tx.select().from(courseLearningAssessments)
      .where(and(
        eq(courseLearningAssessments.id, assessmentId),
        eq(courseLearningAssessments.courseId, courseId),
        eq(courseLearningAssessments.reviewStatus, "approved"),
      )).limit(1).for("share");
    const [attempt] = await tx.select().from(studentLearningAssessmentAttempts)
      .where(and(
        eq(studentLearningAssessmentAttempts.id, attemptId),
        eq(studentLearningAssessmentAttempts.assessmentId, assessmentId),
        eq(studentLearningAssessmentAttempts.courseId, courseId),
        eq(studentLearningAssessmentAttempts.studentUserId, studentUserId),
      )).limit(1).for("update");
    if (!assessment || !attempt) return null;
    if (attempt.status !== "in_progress") {
      throw new LearningAssessmentUnavailable("attempt_closed");
    }
    const questions = await tx.select({
      questionId: studentLearningAssessmentAttemptQuestions.questionId,
      correctOption: courseLearningAssessmentQuestions.correctOption,
    }).from(studentLearningAssessmentAttemptQuestions)
      .innerJoin(courseLearningAssessmentQuestions, eq(
        courseLearningAssessmentQuestions.id,
        studentLearningAssessmentAttemptQuestions.questionId,
      )).where(eq(studentLearningAssessmentAttemptQuestions.attemptId, attemptId));
    if (questions.length !== assessment.questionCount ||
        questions.some((question) => !Object.hasOwn(answers, question.questionId)) ||
        Object.keys(answers).length !== questions.length) {
      throw new LearningAssessmentUnavailable("incomplete_answers");
    }
    let correctCount = 0;
    for (const question of questions) {
      const selectedOption = answers[question.questionId];
      const correct = selectedOption === question.correctOption;
      if (correct) correctCount += 1;
      await tx.update(studentLearningAssessmentAttemptQuestions).set({
        selectedOption, correct,
      }).where(and(
        eq(studentLearningAssessmentAttemptQuestions.attemptId, attemptId),
        eq(studentLearningAssessmentAttemptQuestions.questionId, question.questionId),
      ));
    }
    const outcome = correctCount >= assessment.requiredCorrectCount
      ? "completed" as const : "needs_review" as const;
    const submittedAt = new Date();
    await tx.update(studentLearningAssessmentAttempts).set({
      status: "submitted", outcome, correctCount, submittedAt,
    }).where(eq(studentLearningAssessmentAttempts.id, attemptId));
    return { attemptId, outcome, correctCount,
      questionCount: assessment.questionCount, submittedAt };
  });
}

/** Records the learner's explicit review acknowledgement; it is not playback proof. */
export async function acknowledgeStudentLearningAssessmentLessonReview(
  studentUserId: string, courseId: string, assessmentId: string, attemptId: string,
  lessonAssetId: string,
) {
  const db = getDb();
  const [attempt] = await db.select({ outcome: studentLearningAssessmentAttempts.outcome })
    .from(studentLearningAssessmentAttempts).where(and(
      eq(studentLearningAssessmentAttempts.id, attemptId),
      eq(studentLearningAssessmentAttempts.assessmentId, assessmentId),
      eq(studentLearningAssessmentAttempts.courseId, courseId),
      eq(studentLearningAssessmentAttempts.studentUserId, studentUserId),
      eq(studentLearningAssessmentAttempts.status, "submitted"),
      eq(studentLearningAssessmentAttempts.outcome, "needs_review"),
    )).limit(1);
  if (!attempt) return null;
  const [missedLesson] = await db.select({ id: privateMediaAssets.id })
    .from(studentLearningAssessmentAttemptQuestions)
    .innerJoin(courseLearningAssessmentQuestions, eq(
      courseLearningAssessmentQuestions.id,
      studentLearningAssessmentAttemptQuestions.questionId,
    )).innerJoin(privateMediaAssets, and(
      eq(privateMediaAssets.id, courseLearningAssessmentQuestions.lessonAssetId),
      eq(privateMediaAssets.courseId, courseId),
      eq(privateMediaAssets.status, "ready"),
    )).where(and(
      eq(studentLearningAssessmentAttemptQuestions.attemptId, attemptId),
      eq(studentLearningAssessmentAttemptQuestions.correct, false),
      eq(courseLearningAssessmentQuestions.lessonAssetId, lessonAssetId),
    )).limit(1);
  if (!missedLesson) return null;
  const [created] = await db.insert(studentLearningAssessmentLessonReviews).values({
    attemptId, assessmentId, courseId, studentUserId, lessonAssetId,
  }).onConflictDoNothing().returning({
    attemptId: studentLearningAssessmentLessonReviews.attemptId,
  });
  return { attemptId, lessonAssetId, acknowledged: true, replayed: !created };
}

async function courseContext(courseId: string) {
  const db = getDb();
  const [course] = await db.select({
    id: courses.id, ownerType: courses.ownerType, providerId: courses.providerId,
    instituteId: courses.responsibleInstituteId,
    publicationStatus: courses.publicationStatus,
    supervisionStatus: supervisionGrants.status,
    approvedBy: supervisionGrants.approvedByInstituteUserId,
  }).from(courses).innerJoin(supervisionGrants,
    eq(supervisionGrants.courseId, courses.id),
  ).where(eq(courses.id, courseId)).limit(1);
  return course ?? null;
}

async function activeScopeActors(course: NonNullable<Awaited<ReturnType<typeof courseContext>>>) {
  if (!isVerifiedProviderCourse(course)) return [];
  return getDb().select({ role: memberships.role, userId: memberships.userId,
    providerId: memberships.providerId, instituteId: memberships.instituteId,
  }).from(memberships).where(and(
    eq(memberships.status, "active"),
    or(
      and(eq(memberships.role, "provider"), eq(memberships.providerId, course.providerId)),
      and(eq(memberships.role, "institute"), eq(memberships.instituteId, course.instituteId)),
    ),
  ));
}

function hasCourseSupervision(
  course: NonNullable<Awaited<ReturnType<typeof courseContext>>>,
  actors: Awaited<ReturnType<typeof activeScopeActors>>,
) {
  return course.supervisionStatus === "approved" && Boolean(course.approvedBy) &&
    actors.some((actor) => actor.role === "provider" && actor.providerId === course.providerId) &&
    actors.some((actor) => actor.role === "institute" && actor.instituteId === course.instituteId) &&
    actors.some((actor) => actor.role === "institute" && actor.userId === course.approvedBy &&
      actor.instituteId === course.instituteId);
}

export async function getProviderLearningAssessments(providerUserId: string, courseId: string) {
  const course = await courseContext(courseId);
  if (!course) return null;
  const actors = await activeScopeActors(course);
  if (!hasCourseSupervision(course, actors) ||
      !actors.some((actor) => actor.role === "provider" && actor.userId === providerUserId &&
        actor.providerId === course.providerId)) return null;
  const db = getDb();
  const readyLessons = await db.select({
    id: privateMediaAssets.id,
    title: privateMediaAssets.title,
  }).from(privateMediaAssets).where(and(
    eq(privateMediaAssets.courseId, courseId),
    eq(privateMediaAssets.status, "ready"),
  ));
  const assessments = await db.select({
    id: courseLearningAssessments.id,
    title: courseLearningAssessments.title,
    instructions: courseLearningAssessments.instructions,
    questionCount: courseLearningAssessments.questionCount,
    requiredCorrectCount: courseLearningAssessments.requiredCorrectCount,
    reviewStatus: courseLearningAssessments.reviewStatus,
    reviewReason: courseLearningAssessments.reviewReason,
    createdAt: courseLearningAssessments.createdAt,
  }).from(courseLearningAssessments)
    .where(eq(courseLearningAssessments.courseId, courseId));
  const items = assessments.length ? await db.select({
    id: courseLearningAssessmentQuestions.id,
    assessmentId: courseLearningAssessmentQuestions.assessmentId,
    prompt: courseLearningAssessmentQuestions.prompt,
    option0: courseLearningAssessmentQuestions.option0,
    option1: courseLearningAssessmentQuestions.option1,
    option2: courseLearningAssessmentQuestions.option2,
    option3: courseLearningAssessmentQuestions.option3,
    correctOption: courseLearningAssessmentQuestions.correctOption,
    lessonAssetId: courseLearningAssessmentQuestions.lessonAssetId,
  }).from(courseLearningAssessmentQuestions)
    .where(inArray(courseLearningAssessmentQuestions.assessmentId,
      assessments.map((assessment) => assessment.id))) : [];
  return {
    courseId,
    publicationStatus: course.publicationStatus,
    readyLessons,
    assessments: assessments.map((assessment) => ({
      ...assessment,
      questions: items.filter((item) => item.assessmentId === assessment.id),
    })),
  };
}

/** Provider creates a complete immutable assessment version in one write.
 * Correct keys are available only in provider/institute-scoped readers. */
export async function createProviderLearningAssessment(
  providerUserId: string, courseId: string,
  input: z.infer<typeof newLearningAssessment>,
) {
  return getDb().transaction(async (tx) => {
    const [course] = await tx.select().from(courses).where(eq(courses.id, courseId))
      .limit(1).for("share");
    if (!course || !isVerifiedProviderCourse(course) || course.publicationStatus !== "draft") {
      throw new LearningAssessmentUnavailable("not_available");
    }
    const [grant] = await tx.select().from(supervisionGrants).where(and(
      eq(supervisionGrants.courseId, courseId),
      eq(supervisionGrants.providerId, course.providerId),
      eq(supervisionGrants.instituteId, course.responsibleInstituteId),
      eq(supervisionGrants.status, "approved"),
    )).limit(1).for("share");
    if (!grant?.approvedByInstituteUserId || !grant.approvedAt) {
      throw new LearningAssessmentUnavailable("not_available");
    }
    const actors = await tx.select({ role: memberships.role, userId: memberships.userId,
      providerId: memberships.providerId, instituteId: memberships.instituteId,
    }).from(memberships).where(and(
      eq(memberships.status, "active"),
      or(
        and(eq(memberships.role, "provider"), eq(memberships.providerId, course.providerId)),
        and(eq(memberships.role, "institute"), eq(memberships.instituteId, course.responsibleInstituteId)),
      ),
    )).for("share");
    if (!actors.some((actor) => actor.role === "provider" && actor.userId === providerUserId &&
          actor.providerId === course.providerId) ||
        !actors.some((actor) => actor.role === "institute" &&
          actor.instituteId === course.responsibleInstituteId) ||
        !actors.some((actor) => actor.role === "institute" &&
          actor.userId === grant.approvedByInstituteUserId &&
          actor.instituteId === course.responsibleInstituteId)) {
      throw new LearningAssessmentUnavailable("not_available");
    }
    const assetIds = [...new Set(input.questions.map((item) => item.lessonAssetId))];
    const assets = await tx.select({ id: privateMediaAssets.id })
      .from(privateMediaAssets).where(and(
        eq(privateMediaAssets.courseId, courseId),
        eq(privateMediaAssets.status, "ready"),
        inArray(privateMediaAssets.id, assetIds),
      ));
    if (assets.length !== assetIds.length) {
      throw new LearningAssessmentUnavailable("invalid_bank");
    }
    const [assessment] = await tx.insert(courseLearningAssessments).values({
      courseId,
      title: input.title,
      instructions: input.instructions,
      questionCount: input.questionCount,
      requiredCorrectCount: input.requiredCorrectCount,
      authoredByProviderUserId: providerUserId,
    }).returning({ id: courseLearningAssessments.id });
    await tx.insert(courseLearningAssessmentQuestions).values(input.questions.map((item) => ({
      assessmentId: assessment.id,
      courseId,
      lessonAssetId: item.lessonAssetId,
      prompt: item.prompt,
      option0: item.options[0], option1: item.options[1],
      option2: item.options[2], option3: item.options[3],
      correctOption: item.correctOption,
    })));
    return { assessmentId: assessment.id, reviewStatus: "pending" as const };
  });
}

export async function getInstituteLearningAssessments(instituteUserId: string, courseId: string) {
  const course = await courseContext(courseId);
  if (!course) return null;
  const actors = await activeScopeActors(course);
  if (!hasCourseSupervision(course, actors) ||
      !actors.some((actor) => actor.role === "institute" && actor.userId === instituteUserId &&
        actor.instituteId === course.instituteId) ||
      actors.some((actor) => actor.role === "provider" && actor.userId === instituteUserId &&
        actor.providerId === course.providerId)) return null;
  const db = getDb();
  const assessments = await db.select({
    id: courseLearningAssessments.id,
    title: courseLearningAssessments.title,
    instructions: courseLearningAssessments.instructions,
    questionCount: courseLearningAssessments.questionCount,
    requiredCorrectCount: courseLearningAssessments.requiredCorrectCount,
    reviewStatus: courseLearningAssessments.reviewStatus,
    reviewReason: courseLearningAssessments.reviewReason,
    createdAt: courseLearningAssessments.createdAt,
  }).from(courseLearningAssessments)
    .where(eq(courseLearningAssessments.courseId, courseId));
  const items = assessments.length ? await db.select({
    id: courseLearningAssessmentQuestions.id,
    assessmentId: courseLearningAssessmentQuestions.assessmentId,
    prompt: courseLearningAssessmentQuestions.prompt,
    option0: courseLearningAssessmentQuestions.option0,
    option1: courseLearningAssessmentQuestions.option1,
    option2: courseLearningAssessmentQuestions.option2,
    option3: courseLearningAssessmentQuestions.option3,
    correctOption: courseLearningAssessmentQuestions.correctOption,
    lessonAssetId: courseLearningAssessmentQuestions.lessonAssetId,
  }).from(courseLearningAssessmentQuestions)
    .where(inArray(courseLearningAssessmentQuestions.assessmentId,
      assessments.map((assessment) => assessment.id))) : [];
  return { courseId, assessments: assessments.map((assessment) => ({
    ...assessment,
    questions: items.filter((item) => item.assessmentId === assessment.id),
  })) };
}

/** One final course-institute review, independent from same-course provider. */
export async function decideInstituteLearningAssessment(
  instituteUserId: string, courseId: string, assessmentId: string,
  decision: z.infer<typeof learningAssessmentDecision>,
) {
  return getDb().transaction(async (tx) => {
    const [course] = await tx.select().from(courses).where(eq(courses.id, courseId))
      .limit(1).for("share");
    if (!course || !isVerifiedProviderCourse(course) || course.publicationStatus !== "draft") return null;
    const [grant] = await tx.select().from(supervisionGrants).where(and(
      eq(supervisionGrants.courseId, courseId),
      eq(supervisionGrants.providerId, course.providerId),
      eq(supervisionGrants.instituteId, course.responsibleInstituteId),
      eq(supervisionGrants.status, "approved"),
    )).limit(1).for("share");
    if (!grant?.approvedByInstituteUserId || !grant.approvedAt) return null;
    const actors = await tx.select({ role: memberships.role, userId: memberships.userId,
      providerId: memberships.providerId, instituteId: memberships.instituteId,
    }).from(memberships).where(and(
      eq(memberships.status, "active"),
      or(
        and(eq(memberships.role, "provider"), eq(memberships.providerId, course.providerId)),
        and(eq(memberships.role, "institute"), eq(memberships.instituteId, course.responsibleInstituteId)),
      ),
    )).for("share");
    if (!actors.some((actor) => actor.role === "institute" && actor.userId === instituteUserId &&
          actor.instituteId === course.responsibleInstituteId) ||
        actors.some((actor) => actor.role === "provider" && actor.userId === instituteUserId &&
          actor.providerId === course.providerId) ||
        !actors.some((actor) => actor.role === "provider" && actor.providerId === course.providerId) ||
        !actors.some((actor) => actor.role === "institute" &&
          actor.userId === grant.approvedByInstituteUserId &&
          actor.instituteId === course.responsibleInstituteId)) return null;

    const [assessment] = await tx.select().from(courseLearningAssessments).where(and(
      eq(courseLearningAssessments.id, assessmentId),
      eq(courseLearningAssessments.courseId, courseId),
    )).limit(1).for("update");
    if (!assessment) return null;
    if (assessment.reviewStatus !== "pending") {
      throw new LearningAssessmentUnavailable("already_reviewed");
    }
    const [bank] = await tx.select({ count: sql<number>`count(*)` })
      .from(courseLearningAssessmentQuestions)
      .where(eq(courseLearningAssessmentQuestions.assessmentId, assessmentId));
    if (Number(bank.count) < assessment.questionCount) {
      throw new LearningAssessmentUnavailable("invalid_bank");
    }
    const status = decision.action === "approve" ? "approved" : "rejected";
    if (status === "approved") {
      const linkedAssets = await tx.selectDistinct({
        id: courseLearningAssessmentQuestions.lessonAssetId,
      }).from(courseLearningAssessmentQuestions)
        .where(eq(courseLearningAssessmentQuestions.assessmentId, assessmentId));
      const readyAssets = linkedAssets.length ? await tx.select({ id: privateMediaAssets.id })
        .from(privateMediaAssets).where(and(
          eq(privateMediaAssets.courseId, courseId),
          eq(privateMediaAssets.status, "ready"),
          inArray(privateMediaAssets.id, linkedAssets.map((asset) => asset.id)),
        )) : [];
      if (readyAssets.length !== linkedAssets.length) {
        throw new LearningAssessmentUnavailable("invalid_bank");
      }
    }
    await tx.update(courseLearningAssessments).set({
      reviewStatus: status,
      reviewedByInstituteUserId: instituteUserId,
      reviewedAt: new Date(),
      reviewReason: decision.reason,
    }).where(eq(courseLearningAssessments.id, assessmentId));
    await tx.insert(auditLogs).values(auditLogRecord({
      actorId: instituteUserId,
      actorRole: "institute",
      action: status === "approved"
        ? "course.learning_assessment.approved"
        : "course.learning_assessment.rejected",
      entityType: "PRACTICE",
      entityId: assessmentId,
    }));
    return { assessmentId, reviewStatus: status };
  });
}
