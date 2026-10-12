import { and, desc, eq, ilike, inArray } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../../db";
import {
  assessmentQuestionBankQuestions, assessmentQuestionBanks, auditLogs,
  courses, memberships,
  privateMediaAssets, supervisionGrants, verifiedEntities,
} from "../../db/schema";
import { auditLogRecord } from "../admin/audit";
import { getInstituteScopes } from "./scopes";

const controlChars = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u;
const option = z.string().trim().min(1).max(160)
  .refine((value) => !controlChars.test(value));
export const instituteQuestionInput = z.object({
  courseId: z.uuid(),
  lessonAssetId: z.uuid(),
  prompt: z.string().trim().min(10).max(500)
    .refine((value) => !controlChars.test(value)),
  options: z.tuple([option, option, option, option]).refine((values) =>
    new Set(values.map((value) => value.toLocaleLowerCase())).size === 4,
  ),
  correctOption: z.number().int().min(0).max(3),
}).strict();
export type InstituteQuestionInput = z.infer<typeof instituteQuestionInput>;

export class InstituteQuestionBankError extends Error {
  constructor(readonly kind: "scope_unavailable" | "lesson_unavailable") {
    super(kind);
  }
}

export async function getInstituteQuestionBank(userId: string, search?: string) {
  const scopes = await getInstituteScopes(userId);
  if (!scopes.length) return { questions: [], courses: [] };
  const db = getDb();
  const cleanSearch = search?.trim().slice(0, 120);
  const [questions, courseLessonRows] = await Promise.all([
    db.select({
      id: assessmentQuestionBankQuestions.id,
      prompt: assessmentQuestionBankQuestions.prompt,
      option0: assessmentQuestionBankQuestions.option0,
      option1: assessmentQuestionBankQuestions.option1,
      option2: assessmentQuestionBankQuestions.option2,
      option3: assessmentQuestionBankQuestions.option3,
      correctOption: assessmentQuestionBankQuestions.correctOption,
      createdAt: assessmentQuestionBankQuestions.createdAt,
      instituteId: assessmentQuestionBankQuestions.ownerId,
      courseId: courses.id,
      courseTitle: courses.title,
      lessonAssetId: privateMediaAssets.id,
      lessonTitle: privateMediaAssets.title,
    }).from(assessmentQuestionBankQuestions)
      .innerJoin(assessmentQuestionBanks, and(
        eq(assessmentQuestionBanks.id, assessmentQuestionBankQuestions.bankId),
        eq(assessmentQuestionBanks.ownerType, "institute"),
        eq(assessmentQuestionBanks.ownerId, assessmentQuestionBankQuestions.ownerId),
      ))
      .innerJoin(courses, and(
        eq(courses.id, assessmentQuestionBankQuestions.courseId),
        eq(courses.responsibleInstituteId, assessmentQuestionBankQuestions.ownerId),
      ))
      .innerJoin(privateMediaAssets, and(
        eq(privateMediaAssets.id, assessmentQuestionBankQuestions.lessonAssetId),
        eq(privateMediaAssets.courseId, courses.id),
      ))
      .where(and(
        eq(assessmentQuestionBankQuestions.ownerType, "institute"),
        inArray(assessmentQuestionBankQuestions.ownerId, scopes.map((scope) => scope.id)),
        ...(cleanSearch ? [ilike(assessmentQuestionBankQuestions.prompt,
          `%${cleanSearch}%`)] : []),
      )).orderBy(desc(assessmentQuestionBankQuestions.createdAt),
        desc(assessmentQuestionBankQuestions.id)).limit(100),
    db.select({
      courseId: courses.id,
      courseTitle: courses.title,
      lessonAssetId: privateMediaAssets.id,
      lessonTitle: privateMediaAssets.title,
    }).from(courses).innerJoin(supervisionGrants, and(
      eq(supervisionGrants.courseId, courses.id),
      eq(supervisionGrants.providerId, courses.providerId),
      eq(supervisionGrants.instituteId, courses.responsibleInstituteId),
      eq(supervisionGrants.status, "approved"),
    )).innerJoin(privateMediaAssets, and(
      eq(privateMediaAssets.courseId, courses.id),
      eq(privateMediaAssets.status, "ready"),
    )).where(inArray(courses.responsibleInstituteId, scopes.map((scope) => scope.id)))
      .orderBy(courses.title, privateMediaAssets.createdAt)
      .limit(500),
  ]);
  const lessonMap = new Map<string, {
    id: string; title: string; lessons: Array<{ id: string; title: string }>;
  }>();
  for (const row of courseLessonRows) {
    const course = lessonMap.get(row.courseId) ?? {
      id: row.courseId, title: row.courseTitle, lessons: [],
    };
    course.lessons.push({ id: row.lessonAssetId, title: row.lessonTitle });
    lessonMap.set(row.courseId, course);
  }
  return { questions, courses: [...lessonMap.values()] };
}

export async function getInstituteQuestionById(userId: string, questionId: string) {
  const scopes = await getInstituteScopes(userId);
  if (!scopes.length) return null;
  const [question] = await getDb().select({
    id: assessmentQuestionBankQuestions.id,
    prompt: assessmentQuestionBankQuestions.prompt,
    option0: assessmentQuestionBankQuestions.option0,
    option1: assessmentQuestionBankQuestions.option1,
    option2: assessmentQuestionBankQuestions.option2,
    option3: assessmentQuestionBankQuestions.option3,
    correctOption: assessmentQuestionBankQuestions.correctOption,
    courseId: courses.id,
    lessonAssetId: privateMediaAssets.id,
  }).from(assessmentQuestionBankQuestions)
    .innerJoin(assessmentQuestionBanks, and(
      eq(assessmentQuestionBanks.id, assessmentQuestionBankQuestions.bankId),
      eq(assessmentQuestionBanks.ownerType, "institute"),
      eq(assessmentQuestionBanks.ownerId, assessmentQuestionBankQuestions.ownerId),
    )).innerJoin(courses, and(
      eq(courses.id, assessmentQuestionBankQuestions.courseId),
      eq(courses.responsibleInstituteId, assessmentQuestionBankQuestions.ownerId),
    )).innerJoin(privateMediaAssets, and(
      eq(privateMediaAssets.id, assessmentQuestionBankQuestions.lessonAssetId),
      eq(privateMediaAssets.courseId, courses.id),
    )).where(and(
      eq(assessmentQuestionBankQuestions.id, questionId),
      eq(assessmentQuestionBankQuestions.ownerType, "institute"),
      inArray(assessmentQuestionBankQuestions.ownerId, scopes.map((scope) => scope.id)),
    )).limit(1);
  return question ?? null;
}

/** Rechecks membership, course supervision and ready lesson within the write
 * transaction. Owner keys in the DB prevent questions entering another bank. */
export async function createInstituteQuestion(
  actorUserId: string, input: InstituteQuestionInput,
) {
  return getDb().transaction(async (tx) => {
    const scopes = await tx.select({ id: verifiedEntities.id })
      .from(memberships).innerJoin(verifiedEntities, and(
        eq(memberships.instituteId, verifiedEntities.id),
        eq(verifiedEntities.role, "institute"),
      )).where(and(
        eq(memberships.userId, actorUserId),
        eq(memberships.role, "institute"),
        eq(memberships.status, "active"),
      )).for("share");
    const instituteIds = [...new Set(scopes.map((scope) => scope.id))];
    if (!instituteIds.length) throw new InstituteQuestionBankError("scope_unavailable");

    const [lesson] = await tx.select({
      instituteId: courses.responsibleInstituteId,
    }).from(courses).innerJoin(supervisionGrants, and(
      eq(supervisionGrants.courseId, courses.id),
      eq(supervisionGrants.providerId, courses.providerId),
      eq(supervisionGrants.instituteId, courses.responsibleInstituteId),
      eq(supervisionGrants.status, "approved"),
    )).innerJoin(privateMediaAssets, and(
      eq(privateMediaAssets.id, input.lessonAssetId),
      eq(privateMediaAssets.courseId, courses.id),
      eq(privateMediaAssets.status, "ready"),
    )).where(and(
      eq(courses.id, input.courseId),
      inArray(courses.responsibleInstituteId, instituteIds),
    )).limit(1).for("share");
    if (!lesson) throw new InstituteQuestionBankError("lesson_unavailable");

    const ownerId = lesson.instituteId;
    let [bank] = await tx.select({ id: assessmentQuestionBanks.id })
      .from(assessmentQuestionBanks).where(and(
        eq(assessmentQuestionBanks.ownerType, "institute"),
        eq(assessmentQuestionBanks.ownerId, ownerId),
      )).limit(1).for("update");
    if (!bank) {
      await tx.insert(assessmentQuestionBanks).values({
        ownerType: "institute", ownerId,
      }).onConflictDoNothing();
      [bank] = await tx.select({ id: assessmentQuestionBanks.id })
        .from(assessmentQuestionBanks).where(and(
          eq(assessmentQuestionBanks.ownerType, "institute"),
          eq(assessmentQuestionBanks.ownerId, ownerId),
        )).limit(1);
    }
    if (!bank) throw new InstituteQuestionBankError("scope_unavailable");

    const [question] = await tx.insert(assessmentQuestionBankQuestions).values({
      bankId: bank.id,
      ownerType: "institute",
      ownerId,
      courseId: input.courseId,
      lessonAssetId: input.lessonAssetId,
      prompt: input.prompt,
      option0: input.options[0],
      option1: input.options[1],
      option2: input.options[2],
      option3: input.options[3],
      correctOption: input.correctOption,
      createdByUserId: actorUserId,
    }).returning({ id: assessmentQuestionBankQuestions.id });
    await tx.insert(auditLogs).values(auditLogRecord({
      actorId: actorUserId,
      actorRole: "institute",
      action: "institute.assessment.question.created",
      entityType: "ASSESSMENT_QUESTION",
      entityId: question!.id,
    }));
    return question!;
  });
}

export async function updateInstituteQuestion(
  actorUserId: string, questionId: string, input: InstituteQuestionInput,
) {
  return getDb().transaction(async (tx) => {
    const scopes = await tx.select({ id: verifiedEntities.id })
      .from(memberships).innerJoin(verifiedEntities, and(
        eq(memberships.instituteId, verifiedEntities.id),
        eq(verifiedEntities.role, "institute"),
      )).where(and(
        eq(memberships.userId, actorUserId),
        eq(memberships.role, "institute"),
        eq(memberships.status, "active"),
      )).for("share");
    const [current] = await tx.select({
      bankId: assessmentQuestionBankQuestions.bankId,
      ownerId: assessmentQuestionBankQuestions.ownerId,
    }).from(assessmentQuestionBankQuestions).innerJoin(assessmentQuestionBanks, and(
      eq(assessmentQuestionBanks.id, assessmentQuestionBankQuestions.bankId),
      eq(assessmentQuestionBanks.ownerType, "institute"),
      eq(assessmentQuestionBanks.ownerId, assessmentQuestionBankQuestions.ownerId),
    )).where(and(
      eq(assessmentQuestionBankQuestions.id, questionId),
      eq(assessmentQuestionBankQuestions.ownerType, "institute"),
      inArray(assessmentQuestionBankQuestions.ownerId, scopes.map((scope) => scope.id)),
    )).limit(1).for("update");
    if (!current) throw new InstituteQuestionBankError("scope_unavailable");

    const [lesson] = await tx.select({ courseId: courses.id })
      .from(courses).innerJoin(supervisionGrants, and(
        eq(supervisionGrants.courseId, courses.id),
        eq(supervisionGrants.providerId, courses.providerId),
        eq(supervisionGrants.instituteId, courses.responsibleInstituteId),
        eq(supervisionGrants.status, "approved"),
      )).innerJoin(privateMediaAssets, and(
        eq(privateMediaAssets.id, input.lessonAssetId),
        eq(privateMediaAssets.courseId, courses.id),
        eq(privateMediaAssets.status, "ready"),
      )).where(and(
        eq(courses.id, input.courseId),
        eq(courses.responsibleInstituteId, current.ownerId),
      )).limit(1).for("share");
    if (!lesson) throw new InstituteQuestionBankError("lesson_unavailable");

    const [updated] = await tx.update(assessmentQuestionBankQuestions).set({
      courseId: input.courseId,
      lessonAssetId: input.lessonAssetId,
      prompt: input.prompt,
      option0: input.options[0],
      option1: input.options[1],
      option2: input.options[2],
      option3: input.options[3],
      correctOption: input.correctOption,
    }).where(and(
      eq(assessmentQuestionBankQuestions.id, questionId),
      eq(assessmentQuestionBankQuestions.bankId, current.bankId),
      eq(assessmentQuestionBankQuestions.ownerId, current.ownerId),
    )).returning({ id: assessmentQuestionBankQuestions.id });
    if (!updated) throw new InstituteQuestionBankError("scope_unavailable");
    await tx.insert(auditLogs).values(auditLogRecord({
      actorId: actorUserId,
      actorRole: "institute",
      action: "institute.assessment.question.updated",
      entityType: "ASSESSMENT_QUESTION",
      entityId: updated.id,
    }));
    return updated;
  });
}
