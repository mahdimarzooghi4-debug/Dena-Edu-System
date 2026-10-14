import { and, eq, or } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../../db";
import { isVerifiedProviderCourse } from "../courses/ownership";
import { learningConceptIdSchema } from "../ai-tutor/learning-concepts";
import {
  auditLogs, coursePracticeQuestions, courses, educatorInstituteAffiliations,
  independentEducatorProfiles, memberships, studentPracticeAttempts, supervisionGrants,
} from "../../db/schema";
import { auditLogRecord } from "../admin/audit";

const option = z.string().trim().min(1).max(160).refine((value) =>
  !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(value),
);
export const newPracticeQuestion = z.object({
  learningConceptId: learningConceptIdSchema,
  prompt: z.string().trim().min(10).max(500).refine((value) =>
    !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(value),
  ),
  options: z.tuple([option, option, option, option]).refine((values) =>
    new Set(values.map((value) => value.toLocaleLowerCase())).size === 4,
  ),
  correctOption: z.number().int().min(0).max(3),
}).strict();
export const practiceAnswer = z.object({
  selectedOption: z.number().int().min(0).max(3),
  rememberResult: z.boolean().optional(),
}).strict();
export const practiceReviewDecision = z.object({
  action: z.enum(["approve", "reject"]),
  reason: z.string().trim().min(15).max(500).refine((value) =>
    !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(value),
  ),
}).strict();
export type NewPracticeQuestion = z.infer<typeof newPracticeQuestion>;

export class PracticeUnavailable extends Error {
  constructor(readonly kind: "not_available" | "already_created") {
    super(kind);
  }
}

function toPublicQuestion(row: {
  courseId: string; learningConceptId: string | null; prompt: string;
  option0: string; option1: string; option2: string; option3: string;
}) {
  return {
    courseId: row.courseId,
    learningConceptId: row.learningConceptId,
    prompt: row.prompt,
    options: [row.option0, row.option1, row.option2, row.option3],
  };
}

/** No student identities or attempts are selected for providers. */
export async function getProviderPractice(
  providerUserId: string, courseId: string,
) {
  const db = getDb();
  const [course] = await db.select({
    courseId: courses.id, title: courses.title,
    ownerType: courses.ownerType,
    publicationStatus: courses.publicationStatus,
    supervisionStatus: supervisionGrants.status,
    providerId: courses.providerId,
    instituteId: courses.responsibleInstituteId,
    approvedBy: supervisionGrants.approvedByInstituteUserId,
  }).from(courses).innerJoin(supervisionGrants,
    eq(supervisionGrants.courseId, courses.id),
  ).where(eq(courses.id, courseId)).limit(1);
  if (!course || !isVerifiedProviderCourse(course)) return null;
  const active = await db.select({
    role: memberships.role, providerId: memberships.providerId,
    instituteId: memberships.instituteId, userId: memberships.userId,
  }).from(memberships).where(and(
    eq(memberships.status, "active"),
    or(
      and(eq(memberships.role, "provider"),
        eq(memberships.providerId, course.providerId)),
      and(eq(memberships.role, "institute"),
        eq(memberships.instituteId, course.instituteId)),
    ),
  ));
  if (!active.some((m) => m.role === "provider" &&
        m.userId === providerUserId && m.providerId === course.providerId) ||
      !active.some((m) => m.role === "institute" &&
        m.instituteId === course.instituteId) ||
      !active.some((m) => m.role === "institute" &&
        m.userId === course.approvedBy &&
        m.instituteId === course.instituteId) ||
      course.supervisionStatus !== "approved") return null;
  const [question] = await db.select().from(coursePracticeQuestions)
    .where(eq(coursePracticeQuestions.courseId, courseId)).limit(1);
  return {
    courseId, title: course.title,
    publicationStatus: course.publicationStatus,
    question: question ? { ...toPublicQuestion(question),
      correctOption: question.correctOption,
      reviewStatus: question.reviewStatus,
      reviewReason: question.reviewReason } : null,
  };
}

/** First write freezes the question and key; concurrent retry cannot alter
 * learner-facing questions after publication or after a student attempt.
 */
export async function createProviderPractice(
  providerUserId: string, courseId: string, input: NewPracticeQuestion,
) {
  return getDb().transaction(async (tx) => {
    const [course] = await tx.select().from(courses)
      .where(eq(courses.id, courseId)).limit(1).for("share");
    if (!course || !isVerifiedProviderCourse(course) || course.publicationStatus !== "draft") {
      throw new PracticeUnavailable("not_available");
    }
    const [grant] = await tx.select().from(supervisionGrants).where(and(
      eq(supervisionGrants.courseId, courseId),
      eq(supervisionGrants.providerId, course.providerId),
      eq(supervisionGrants.instituteId, course.responsibleInstituteId),
      eq(supervisionGrants.status, "approved"),
    )).limit(1).for("share");
    if (!grant?.approvedByInstituteUserId || !grant.approvedAt) {
      throw new PracticeUnavailable("not_available");
    }
    const actors = await tx.select({
      role: memberships.role, providerId: memberships.providerId,
      instituteId: memberships.instituteId, userId: memberships.userId,
    }).from(memberships).where(and(
      eq(memberships.status, "active"),
      or(
        and(eq(memberships.role, "provider"),
          eq(memberships.providerId, course.providerId)),
        and(eq(memberships.role, "institute"),
          eq(memberships.instituteId, course.responsibleInstituteId)),
      ),
    )).for("share");
    if (!actors.some((m) => m.role === "provider" &&
          m.userId === providerUserId && m.providerId === course.providerId) ||
        !actors.some((m) => m.role === "institute" &&
          m.instituteId === course.responsibleInstituteId) ||
        !actors.some((m) => m.role === "institute" &&
          m.userId === grant.approvedByInstituteUserId &&
          m.instituteId === course.responsibleInstituteId)) {
      throw new PracticeUnavailable("not_available");
    }
    const [created] = await tx.insert(coursePracticeQuestions).values({
      courseId, learningConceptId: input.learningConceptId, prompt: input.prompt,
      option0: input.options[0], option1: input.options[1],
      option2: input.options[2], option3: input.options[3],
      correctOption: input.correctOption,
      authoredByProviderUserId: providerUserId,
    }).onConflictDoNothing().returning({ courseId: coursePracticeQuestions.courseId });
    if (!created) throw new PracticeUnavailable("already_created");
    return { courseId, created: true };
  });
}

/** Independent educator view of the same immutable one-question workflow. */
export async function getIndependentEducatorPractice(userId: string, courseId: string) {
  const db = getDb();
  const [course] = await db.select({
    courseId: courses.id, title: courses.title,
    profileId: courses.independentEducatorProfileId,
    instituteId: courses.responsibleInstituteId,
    publicationStatus: courses.publicationStatus,
    supervisionStatus: supervisionGrants.status,
    grantOwnerType: supervisionGrants.ownerType,
    grantProfileId: supervisionGrants.independentEducatorProfileId,
    grantInstituteId: supervisionGrants.instituteId,
    approvedBy: supervisionGrants.approvedByInstituteUserId,
  }).from(courses).innerJoin(supervisionGrants,
    eq(supervisionGrants.courseId, courses.id),
  ).where(and(eq(courses.id, courseId),
    eq(courses.ownerType, "independent_educator"))).limit(1);
  if (!course.profileId || course.publicationStatus !== "draft" ||
      course.supervisionStatus !== "approved" ||
      course.grantOwnerType !== "independent_educator" ||
      course.grantProfileId !== course.profileId ||
      course.grantInstituteId !== course.instituteId || !course.approvedBy) return null;
  const [owner] = await db.select({ userId: independentEducatorProfiles.userId })
    .from(independentEducatorProfiles).innerJoin(memberships, and(
      eq(memberships.userId, independentEducatorProfiles.userId),
      eq(memberships.role, "student"), eq(memberships.status, "active"),
    )).innerJoin(educatorInstituteAffiliations, and(
      eq(educatorInstituteAffiliations.educatorProfileId, independentEducatorProfiles.id),
      eq(educatorInstituteAffiliations.instituteId, course.instituteId),
      eq(educatorInstituteAffiliations.status, "approved"),
    )).where(and(
      eq(independentEducatorProfiles.id, course.profileId),
      eq(independentEducatorProfiles.userId, userId),
    )).limit(1);
  const [approver] = await db.select({ id: memberships.id }).from(memberships)
    .where(and(
      eq(memberships.userId, course.approvedBy), eq(memberships.role, "institute"),
      eq(memberships.instituteId, course.instituteId), eq(memberships.status, "active"),
    )).limit(1);
  if (!owner || !approver) return null;
  const [question] = await db.select().from(coursePracticeQuestions)
    .where(eq(coursePracticeQuestions.courseId, courseId)).limit(1);
  return {
    courseId, title: course.title, publicationStatus: course.publicationStatus,
    question: question ? { ...toPublicQuestion(question),
      correctOption: question.correctOption, reviewStatus: question.reviewStatus,
      reviewReason: question.reviewReason } : null,
  };
}

export async function createIndependentEducatorPractice(
  userId: string, courseId: string, input: NewPracticeQuestion,
) {
  return getDb().transaction(async (tx) => {
    const [candidate] = await tx.select({
      profileId: courses.independentEducatorProfileId,
      instituteId: courses.responsibleInstituteId,
    }).from(courses).where(and(
      eq(courses.id, courseId), eq(courses.ownerType, "independent_educator"),
    )).limit(1);
    if (!candidate?.profileId) throw new PracticeUnavailable("not_available");
    const [affiliation] = await tx.select({ id: educatorInstituteAffiliations.id })
      .from(educatorInstituteAffiliations).where(and(
        eq(educatorInstituteAffiliations.educatorProfileId, candidate.profileId),
        eq(educatorInstituteAffiliations.instituteId, candidate.instituteId),
        eq(educatorInstituteAffiliations.status, "approved"),
      )).limit(1).for("share");
    const [owner] = await tx.select({ id: memberships.id })
      .from(memberships).innerJoin(independentEducatorProfiles, and(
        eq(independentEducatorProfiles.id, candidate.profileId),
        eq(independentEducatorProfiles.userId, memberships.userId),
      )).where(and(
        eq(memberships.userId, userId), eq(memberships.role, "student"),
        eq(memberships.status, "active"),
      )).limit(1).for("share");
    if (!affiliation || !owner) throw new PracticeUnavailable("not_available");
    const [course] = await tx.select().from(courses).where(and(
      eq(courses.id, courseId), eq(courses.ownerType, "independent_educator"),
      eq(courses.independentEducatorProfileId, candidate.profileId),
      eq(courses.responsibleInstituteId, candidate.instituteId),
    )).limit(1).for("share");
    if (!course || course.publicationStatus !== "draft") {
      throw new PracticeUnavailable("not_available");
    }
    const [grant] = await tx.select().from(supervisionGrants).where(and(
      eq(supervisionGrants.courseId, courseId),
      eq(supervisionGrants.ownerType, "independent_educator"),
      eq(supervisionGrants.independentEducatorProfileId, candidate.profileId),
      eq(supervisionGrants.instituteId, candidate.instituteId),
      eq(supervisionGrants.status, "approved"),
    )).limit(1).for("share");
    if (!grant?.approvedByInstituteUserId || !grant.approvedAt) {
      throw new PracticeUnavailable("not_available");
    }
    const [approver] = await tx.select({ id: memberships.id }).from(memberships)
      .where(and(
        eq(memberships.userId, grant.approvedByInstituteUserId),
        eq(memberships.role, "institute"),
        eq(memberships.instituteId, candidate.instituteId),
        eq(memberships.status, "active"),
      )).limit(1).for("share");
    if (!approver) throw new PracticeUnavailable("not_available");
    const [created] = await tx.insert(coursePracticeQuestions).values({
      courseId, learningConceptId: input.learningConceptId, prompt: input.prompt,
      option0: input.options[0], option1: input.options[1],
      option2: input.options[2], option3: input.options[3],
      correctOption: input.correctOption, authoredByProviderUserId: userId,
    }).onConflictDoNothing().returning({ courseId: coursePracticeQuestions.courseId });
    if (!created) throw new PracticeUnavailable("already_created");
    return { courseId, created: true };
  });
}

/** Caller MUST check hasStudentEntitlement on every read. Correct answer is
 * not selected or serialized from this path, including after submission.
 */
export async function getStudentPractice(
  studentUserId: string, courseId: string, learningConceptId?: string,
) {
  const db = getDb();
  const [question] = await db.select({
    courseId: coursePracticeQuestions.courseId,
    learningConceptId: coursePracticeQuestions.learningConceptId,
    prompt: coursePracticeQuestions.prompt,
    option0: coursePracticeQuestions.option0,
    option1: coursePracticeQuestions.option1,
    option2: coursePracticeQuestions.option2,
    option3: coursePracticeQuestions.option3,
  }).from(coursePracticeQuestions)
    .where(and(
      eq(coursePracticeQuestions.courseId, courseId),
      eq(coursePracticeQuestions.reviewStatus, "approved"),
      ...(learningConceptId
        ? [eq(coursePracticeQuestions.learningConceptId, learningConceptId)]
        : []),
    )).limit(1);
  if (!question) return null;
  const [attempt] = await db.select({
    selectedOption: studentPracticeAttempts.selectedOption,
    correct: studentPracticeAttempts.correct,
    submittedAt: studentPracticeAttempts.submittedAt,
  }).from(studentPracticeAttempts).where(and(
    eq(studentPracticeAttempts.courseId, courseId),
    eq(studentPracticeAttempts.studentUserId, studentUserId),
  )).limit(1);
  return {
    ...toPublicQuestion(question),
    attempt: attempt ?? null,
  };
}

/** One durable attempt per learner/course, graded server-side against
 * immutable answer key; retries return their existing own result.
 */
export async function submitStudentPractice(
  studentUserId: string, courseId: string, selectedOption: number,
) {
  return getDb().transaction(async (tx) => {
    const [question] = await tx.select({
      correctOption: coursePracticeQuestions.correctOption,
      learningConceptId: coursePracticeQuestions.learningConceptId,
    }).from(coursePracticeQuestions)
      .where(and(
        eq(coursePracticeQuestions.courseId, courseId),
        eq(coursePracticeQuestions.reviewStatus, "approved"),
      ))
      .limit(1).for("share");
    if (!question) return null;
    const [created] = await tx.insert(studentPracticeAttempts).values({
      courseId, studentUserId, selectedOption,
      correct: selectedOption === question.correctOption,
    }).onConflictDoNothing({
      target: [studentPracticeAttempts.studentUserId,
        studentPracticeAttempts.courseId],
    }).returning({
      selectedOption: studentPracticeAttempts.selectedOption,
      correct: studentPracticeAttempts.correct,
      submittedAt: studentPracticeAttempts.submittedAt,
    });
    if (created) return {
      courseId, ...created, learningConceptId: question.learningConceptId,
      replayed: false,
    };
    const [previous] = await tx.select({
      selectedOption: studentPracticeAttempts.selectedOption,
      correct: studentPracticeAttempts.correct,
      submittedAt: studentPracticeAttempts.submittedAt,
    }).from(studentPracticeAttempts).where(and(
      eq(studentPracticeAttempts.courseId, courseId),
      eq(studentPracticeAttempts.studentUserId, studentUserId),
    )).limit(1);
    if (!previous) throw new Error("practice_attempt_conflict");
    return {
      courseId, ...previous, learningConceptId: question.learningConceptId,
      replayed: true,
    };
  });
}


/** Institute reviewers can inspect the provider-authored answer key only for
 * their own actively supervised course. Student identities/attempts are absent.
 */
export async function getInstitutePractice(
  instituteUserId: string, courseId: string,
) {
  const db = getDb();
  const [owner] = await db.select({ ownerType: courses.ownerType })
    .from(courses).where(eq(courses.id, courseId)).limit(1);
  if (owner?.ownerType === "independent_educator") {
    return getIndependentEducatorInstitutePractice(instituteUserId, courseId);
  }
  const [course] = await db.select({
    courseId: courses.id, title: courses.title,
    ownerType: courses.ownerType,
    publicationStatus: courses.publicationStatus,
    providerId: courses.providerId,
    instituteId: courses.responsibleInstituteId,
    supervisionStatus: supervisionGrants.status,
    approvedBy: supervisionGrants.approvedByInstituteUserId,
  }).from(courses).innerJoin(supervisionGrants,
    eq(supervisionGrants.courseId, courses.id),
  ).where(eq(courses.id, courseId)).limit(1);
  if (!course || !isVerifiedProviderCourse(course) || course.supervisionStatus !== "approved") return null;
  const active = await db.select({
    role: memberships.role, providerId: memberships.providerId,
    instituteId: memberships.instituteId, userId: memberships.userId,
  }).from(memberships).where(and(
    eq(memberships.status, "active"),
    or(
      and(eq(memberships.role, "institute"),
        eq(memberships.instituteId, course.instituteId)),
      and(eq(memberships.role, "provider"),
        eq(memberships.providerId, course.providerId)),
    ),
  ));
  const reviewerOwnsInstitute = active.some((m) =>
    m.role === "institute" && m.userId === instituteUserId &&
    m.instituteId === course.instituteId);
  const reviewerAlsoProvider = active.some((m) =>
    m.role === "provider" && m.userId === instituteUserId &&
    m.providerId === course.providerId);
  const providerActive = active.some((m) =>
    m.role === "provider" && m.providerId === course.providerId);
  const courseApproverActive = active.some((m) =>
    m.role === "institute" && m.userId === course.approvedBy &&
    m.instituteId === course.instituteId);
  if (!reviewerOwnsInstitute || reviewerAlsoProvider ||
      !providerActive || !courseApproverActive) return null;
  const [question] = await db.select().from(coursePracticeQuestions)
    .where(eq(coursePracticeQuestions.courseId, courseId)).limit(1);
  return {
    courseId, title: course.title,
    publicationStatus: course.publicationStatus,
    question: question ? {
      ...toPublicQuestion(question),
      correctOption: question.correctOption,
      reviewStatus: question.reviewStatus,
      reviewReason: question.reviewReason,
    } : null,
  };
}

/** One independent institute decision. The provider/author can never call this
 * path, and a decided question is immutable in the current pilot.
 */
export async function decideInstitutePractice(
  instituteUserId: string, courseId: string,
  decision: z.infer<typeof practiceReviewDecision>,
) {
  const [owner] = await getDb().select({ ownerType: courses.ownerType })
    .from(courses).where(eq(courses.id, courseId)).limit(1);
  if (owner?.ownerType === "independent_educator") {
    return decideIndependentEducatorInstitutePractice(instituteUserId, courseId, decision);
  }
  return getDb().transaction(async (tx) => {
    const [course] = await tx.select().from(courses)
      .where(eq(courses.id, courseId)).limit(1).for("share");
    if (!course || !isVerifiedProviderCourse(course) || course.publicationStatus !== "draft") return null;
    const [grant] = await tx.select().from(supervisionGrants).where(and(
      eq(supervisionGrants.courseId, courseId),
      eq(supervisionGrants.providerId, course.providerId),
      eq(supervisionGrants.instituteId, course.responsibleInstituteId),
      eq(supervisionGrants.status, "approved"),
    )).limit(1).for("share");
    if (!grant?.approvedByInstituteUserId || !grant.approvedAt) return null;
    const actors = await tx.select({
      role: memberships.role, providerId: memberships.providerId,
      instituteId: memberships.instituteId, userId: memberships.userId,
    }).from(memberships).where(and(
      eq(memberships.status, "active"),
      or(
        and(eq(memberships.role, "institute"),
          eq(memberships.instituteId, course.responsibleInstituteId)),
        and(eq(memberships.role, "provider"),
          eq(memberships.providerId, course.providerId)),
      ),
    )).for("share");
    if (!actors.some((m) => m.role === "institute" &&
          m.userId === instituteUserId &&
          m.instituteId === course.responsibleInstituteId) ||
        actors.some((m) => m.role === "provider" &&
          m.userId === instituteUserId && m.providerId === course.providerId) ||
        !actors.some((m) => m.role === "provider" &&
          m.providerId === course.providerId) ||
        !actors.some((m) => m.role === "institute" &&
          m.userId === grant.approvedByInstituteUserId &&
          m.instituteId === course.responsibleInstituteId)) {
      return null;
    }
    const [question] = await tx.select({
      status: coursePracticeQuestions.reviewStatus,
    }).from(coursePracticeQuestions).where(
      eq(coursePracticeQuestions.courseId, courseId),
    ).limit(1).for("update");
    if (!question) return null;
    if (question.status !== "pending") {
      throw new PracticeUnavailable("already_created");
    }
    const reviewStatus = decision.action === "approve" ? "approved" : "rejected";
    await tx.update(coursePracticeQuestions).set({
      reviewStatus,
      reviewedByInstituteUserId: instituteUserId,
      reviewedAt: new Date(),
      reviewReason: decision.reason,
    }).where(eq(coursePracticeQuestions.courseId, courseId));
    await tx.insert(auditLogs).values(auditLogRecord({
      actorId: instituteUserId,
      actorRole: "institute",
      action: decision.action === "approve"
        ? "course.practice.approved" : "course.practice.rejected",
      entityType: "PRACTICE",
      entityId: courseId,
    }));
    return { courseId, reviewStatus };
  });
}

async function getIndependentEducatorInstitutePractice(
  instituteUserId: string, courseId: string,
) {
  const db = getDb();
  const [course] = await db.select({
    courseId: courses.id, title: courses.title,
    profileId: courses.independentEducatorProfileId,
    instituteId: courses.responsibleInstituteId,
    publicationStatus: courses.publicationStatus,
    supervisionStatus: supervisionGrants.status,
    grantOwnerType: supervisionGrants.ownerType,
    grantProfileId: supervisionGrants.independentEducatorProfileId,
    grantInstituteId: supervisionGrants.instituteId,
    approvedBy: supervisionGrants.approvedByInstituteUserId,
  }).from(courses).innerJoin(supervisionGrants,
    eq(supervisionGrants.courseId, courses.id),
  ).where(and(eq(courses.id, courseId),
    eq(courses.ownerType, "independent_educator"))).limit(1);
  if (!course?.profileId || course.supervisionStatus !== "approved" ||
      course.grantOwnerType !== "independent_educator" ||
      course.grantProfileId !== course.profileId ||
      course.grantInstituteId !== course.instituteId || !course.approvedBy) return null;
  const [affiliation] = await db.select({ id: educatorInstituteAffiliations.id })
    .from(educatorInstituteAffiliations).where(and(
      eq(educatorInstituteAffiliations.educatorProfileId, course.profileId),
      eq(educatorInstituteAffiliations.instituteId, course.instituteId),
      eq(educatorInstituteAffiliations.status, "approved"),
    )).limit(1);
  const [reviewer] = await db.select({ id: memberships.id })
    .from(memberships).where(and(
      eq(memberships.userId, instituteUserId), eq(memberships.role, "institute"),
      eq(memberships.instituteId, course.instituteId), eq(memberships.status, "active"),
    )).limit(1);
  const [approver] = await db.select({ id: memberships.id })
    .from(memberships).where(and(
      eq(memberships.userId, course.approvedBy), eq(memberships.role, "institute"),
      eq(memberships.instituteId, course.instituteId), eq(memberships.status, "active"),
    )).limit(1);
  const [educator] = await db.select({ userId: independentEducatorProfiles.userId })
    .from(independentEducatorProfiles)
    .where(eq(independentEducatorProfiles.id, course.profileId)).limit(1);
  if (!affiliation || !reviewer || !approver || educator?.userId === instituteUserId) return null;
  const [question] = await db.select().from(coursePracticeQuestions)
    .where(eq(coursePracticeQuestions.courseId, courseId)).limit(1);
  return {
    courseId, title: course.title, ownerType: "independent_educator" as const,
    publicationStatus: course.publicationStatus,
    question: question ? { ...toPublicQuestion(question),
      correctOption: question.correctOption, reviewStatus: question.reviewStatus,
      reviewReason: question.reviewReason } : null,
  };
}

async function decideIndependentEducatorInstitutePractice(
  instituteUserId: string, courseId: string,
  decision: z.infer<typeof practiceReviewDecision>,
) {
  return getDb().transaction(async (tx) => {
    const [candidate] = await tx.select({
      profileId: courses.independentEducatorProfileId,
      instituteId: courses.responsibleInstituteId,
    }).from(courses).where(and(
      eq(courses.id, courseId), eq(courses.ownerType, "independent_educator"),
    )).limit(1);
    if (!candidate?.profileId) return null;
    const [affiliation] = await tx.select({ id: educatorInstituteAffiliations.id })
      .from(educatorInstituteAffiliations).where(and(
        eq(educatorInstituteAffiliations.educatorProfileId, candidate.profileId),
        eq(educatorInstituteAffiliations.instituteId, candidate.instituteId),
        eq(educatorInstituteAffiliations.status, "approved"),
      )).limit(1).for("share");
    if (!affiliation) return null;
    const [course] = await tx.select().from(courses).where(and(
      eq(courses.id, courseId), eq(courses.ownerType, "independent_educator"),
      eq(courses.independentEducatorProfileId, candidate.profileId),
      eq(courses.responsibleInstituteId, candidate.instituteId),
    )).limit(1).for("share");
    if (!course || course.publicationStatus !== "draft") return null;
    const [grant] = await tx.select().from(supervisionGrants).where(and(
      eq(supervisionGrants.courseId, courseId),
      eq(supervisionGrants.ownerType, "independent_educator"),
      eq(supervisionGrants.independentEducatorProfileId, candidate.profileId),
      eq(supervisionGrants.instituteId, candidate.instituteId),
      eq(supervisionGrants.status, "approved"),
    )).limit(1).for("share");
    if (!grant?.approvedByInstituteUserId || !grant.approvedAt) return null;
    const [reviewer] = await tx.select({ id: memberships.id })
      .from(memberships).where(and(
        eq(memberships.userId, instituteUserId), eq(memberships.role, "institute"),
        eq(memberships.instituteId, candidate.instituteId),
        eq(memberships.status, "active"),
      )).limit(1).for("share");
    const [approver] = await tx.select({ id: memberships.id })
      .from(memberships).where(and(
        eq(memberships.userId, grant.approvedByInstituteUserId),
        eq(memberships.role, "institute"),
        eq(memberships.instituteId, candidate.instituteId),
        eq(memberships.status, "active"),
      )).limit(1).for("share");
    const [educator] = await tx.select({ userId: independentEducatorProfiles.userId })
      .from(independentEducatorProfiles)
      .where(eq(independentEducatorProfiles.id, candidate.profileId)).limit(1);
    if (!reviewer || !approver || educator?.userId === instituteUserId) return null;
    const [question] = await tx.select({
      status: coursePracticeQuestions.reviewStatus,
    }).from(coursePracticeQuestions).where(
      eq(coursePracticeQuestions.courseId, courseId),
    ).limit(1).for("update");
    if (!question) return null;
    if (question.status !== "pending") throw new PracticeUnavailable("already_created");
    const reviewStatus = decision.action === "approve" ? "approved" : "rejected";
    await tx.update(coursePracticeQuestions).set({
      reviewStatus, reviewedByInstituteUserId: instituteUserId,
      reviewedAt: new Date(), reviewReason: decision.reason,
    }).where(eq(coursePracticeQuestions.courseId, courseId));
    await tx.insert(auditLogs).values(auditLogRecord({
      actorId: instituteUserId, actorRole: "institute",
      action: decision.action === "approve"
        ? "course.practice.approved" : "course.practice.rejected",
      entityType: "PRACTICE", entityId: courseId,
    }));
    return { courseId, reviewStatus };
  });
}
