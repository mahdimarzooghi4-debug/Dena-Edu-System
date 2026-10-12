import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../../db";
import {
  assessmentQuestionBankQuestions, assessmentQuestionBanks, auditLogs,
  DENA_ASSESSMENT_BANK_ID, DENA_ASSESSMENT_OWNER_ID, memberships,
} from "../../db/schema";
import { auditLogRecord } from "./audit";

const controlChars = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u;
const option = z.string().trim().min(1).max(160)
  .refine((value) => !controlChars.test(value));
export const denaQuestionInput = z.object({
  prompt: z.string().trim().min(10).max(500)
    .refine((value) => !controlChars.test(value)),
  options: z.tuple([option, option, option, option]).refine((values) =>
    new Set(values.map((value) => value.toLocaleLowerCase())).size === 4,
  ),
  correctOption: z.number().int().min(0).max(3),
}).strict();
export type DenaQuestionInput = z.infer<typeof denaQuestionInput>;

export class DenaQuestionBankError extends Error {
  constructor(readonly kind: "admin_unavailable" | "question_unavailable") {
    super(kind);
  }
}

async function hasActiveAdmin(tx: Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0], userId: string) {
  const [row] = await tx.select({ id: memberships.id }).from(memberships)
    .where(and(
      eq(memberships.userId, userId),
      eq(memberships.role, "admin"),
      eq(memberships.status, "active"),
    )).limit(1).for("share");
  return Boolean(row);
}

export async function getDenaQuestionBank(userId: string) {
  const db = getDb();
  const [admin] = await db.select({ id: memberships.id }).from(memberships)
    .where(and(
      eq(memberships.userId, userId),
      eq(memberships.role, "admin"),
      eq(memberships.status, "active"),
    )).limit(1);
  if (!admin) return null;
  const [bank] = await db.select({ id: assessmentQuestionBanks.id })
    .from(assessmentQuestionBanks).where(and(
      eq(assessmentQuestionBanks.id, DENA_ASSESSMENT_BANK_ID),
      eq(assessmentQuestionBanks.ownerType, "dena"),
      eq(assessmentQuestionBanks.ownerId, DENA_ASSESSMENT_OWNER_ID),
    )).limit(1);
  if (!bank) throw new Error("dena_assessment_bank_not_seeded");
  const questions = await db.select({
    id: assessmentQuestionBankQuestions.id,
    prompt: assessmentQuestionBankQuestions.prompt,
    option0: assessmentQuestionBankQuestions.option0,
    option1: assessmentQuestionBankQuestions.option1,
    option2: assessmentQuestionBankQuestions.option2,
    option3: assessmentQuestionBankQuestions.option3,
    correctOption: assessmentQuestionBankQuestions.correctOption,
    createdAt: assessmentQuestionBankQuestions.createdAt,
  }).from(assessmentQuestionBankQuestions).where(and(
    eq(assessmentQuestionBankQuestions.bankId, bank.id),
    eq(assessmentQuestionBankQuestions.ownerType, "dena"),
    eq(assessmentQuestionBankQuestions.ownerId, DENA_ASSESSMENT_OWNER_ID),
  )).orderBy(desc(assessmentQuestionBankQuestions.createdAt),
    desc(assessmentQuestionBankQuestions.id)).limit(100);
  return { questions };
}

export async function createDenaQuestion(actorUserId: string, input: DenaQuestionInput) {
  return getDb().transaction(async (tx) => {
    if (!await hasActiveAdmin(tx, actorUserId)) {
      throw new DenaQuestionBankError("admin_unavailable");
    }
    const [bank] = await tx.select({ id: assessmentQuestionBanks.id })
      .from(assessmentQuestionBanks).where(and(
        eq(assessmentQuestionBanks.id, DENA_ASSESSMENT_BANK_ID),
        eq(assessmentQuestionBanks.ownerType, "dena"),
        eq(assessmentQuestionBanks.ownerId, DENA_ASSESSMENT_OWNER_ID),
      )).limit(1).for("share");
    if (!bank) throw new DenaQuestionBankError("admin_unavailable");
    const [question] = await tx.insert(assessmentQuestionBankQuestions).values({
      bankId: bank.id,
      ownerType: "dena",
      ownerId: DENA_ASSESSMENT_OWNER_ID,
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
      actorRole: "admin",
      action: "admin.dena_question.created",
      entityType: "ASSESSMENT_QUESTION",
      entityId: question!.id,
    }));
    return question!;
  });
}

export async function updateDenaQuestion(
  actorUserId: string, questionId: string, input: DenaQuestionInput,
) {
  return getDb().transaction(async (tx) => {
    if (!await hasActiveAdmin(tx, actorUserId)) {
      throw new DenaQuestionBankError("admin_unavailable");
    }
    const [updated] = await tx.update(assessmentQuestionBankQuestions).set({
      prompt: input.prompt,
      option0: input.options[0],
      option1: input.options[1],
      option2: input.options[2],
      option3: input.options[3],
      correctOption: input.correctOption,
    }).where(and(
      eq(assessmentQuestionBankQuestions.id, questionId),
      eq(assessmentQuestionBankQuestions.bankId, DENA_ASSESSMENT_BANK_ID),
      eq(assessmentQuestionBankQuestions.ownerType, "dena"),
      eq(assessmentQuestionBankQuestions.ownerId, DENA_ASSESSMENT_OWNER_ID),
    )).returning({ id: assessmentQuestionBankQuestions.id });
    if (!updated) throw new DenaQuestionBankError("question_unavailable");
    await tx.insert(auditLogs).values(auditLogRecord({
      actorId: actorUserId,
      actorRole: "admin",
      action: "admin.dena_question.updated",
      entityType: "ASSESSMENT_QUESTION",
      entityId: updated.id,
    }));
    return updated;
  });
}
