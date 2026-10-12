import { and, asc, desc, eq, ilike, inArray, lt, or, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../../db";
import {
  assessmentExamQuestions, assessmentExams, assessmentQuestionBankQuestions,
  assessmentExamAttemptAnswers, assessmentExamAttempts,
  assessmentQuestionBanks, auditLogs, courses, DENA_ASSESSMENT_BANK_ID,
  DENA_ASSESSMENT_OWNER_ID, memberships, studentEnrollments,
  supervisionGrants, user, verifiedEntities,
} from "../../db/schema";
import { auditLogRecord } from "../admin/audit";

const clean = z.string().trim();
const dateTime = z.string().datetime({ offset: true });
const commonInput = {
  title: clean.min(3).max(160),
  instructions: clean.min(1).max(2000),
  startsAt: dateTime,
  endsAt: dateTime,
  durationMinutes: z.number().int().min(5).max(300),
  attemptLimit: z.number().int().min(1).max(20).default(1),
  questionIds: z.array(z.uuid()).min(1).max(300),
};
export const instituteExamInput = z.object({
  ...commonInput,
  courseId: z.uuid(),
}).strict().superRefine((input, ctx) => validateExamTiming(input, ctx));
export const denaExamInput = z.object(commonInput).strict()
  .superRefine((input, ctx) => validateExamTiming(input, ctx));
function validateExamTiming(input: {
  startsAt: string; endsAt: string; questionIds: string[];
}, ctx: z.RefinementCtx) {
  if (Date.parse(input.endsAt) <= Date.parse(input.startsAt)) {
    ctx.addIssue({ code: "custom", path: ["endsAt"], message: "invalid_schedule" });
  }
  if (new Set(input.questionIds).size !== input.questionIds.length) {
    ctx.addIssue({ code: "custom", path: ["questionIds"], message: "duplicate_questions" });
  }
}
export type InstituteExamInput = z.infer<typeof instituteExamInput>;
export type DenaExamInput = z.infer<typeof denaExamInput>;

export const examReportQuery = z.object({
  status: z.enum(["in_progress", "submitted", "expired"]).optional(),
  search: clean.max(80).optional(),
  cursor: z.string().max(512).optional(),
}).strict();
export type ExamReportQuery = z.infer<typeof examReportQuery>;

function encodeReportCursor(startedAt: string, id: string) {
  return Buffer.from(JSON.stringify({ startedAt, id }), "utf8").toString("base64url");
}
function decodeReportCursor(value: string | undefined) {
  if (!value) return undefined;
  try {
    const parsed = z.object({ startedAt: z.string().datetime({ offset: true }), id: z.uuid() })
      .strict().parse(JSON.parse(Buffer.from(value, "base64url").toString("utf8")));
    return { startedAt: parsed.startedAt, id: parsed.id };
  } catch {
    return null;
  }
}

export class ExamManagementError extends Error {
  constructor(readonly kind: "scope_unavailable" | "course_unavailable" |
    "questions_unavailable" | "admin_unavailable" | "exam_unavailable" |
    "student_unavailable" | "not_enrolled" | "outside_schedule" |
    "attempt_limit" | "attempt_unavailable" | "attempt_closed") { super(kind); }
}

export async function getInstituteExams(userId: string) {
  const scopes = await getDb().select({ id: verifiedEntities.id })
    .from(memberships).innerJoin(verifiedEntities, and(
      eq(verifiedEntities.id, memberships.instituteId),
      eq(verifiedEntities.role, "institute"),
    )).where(and(
      eq(memberships.userId, userId), eq(memberships.role, "institute"),
      eq(memberships.status, "active"),
    ));
  const ids = scopes.map((scope) => scope.id);
  if (!ids.length) return { exams: [], denaExams: [] };
  const [exams, denaExams] = await Promise.all([
    getDb().select({
      id: assessmentExams.id, title: assessmentExams.title,
      startsAt: assessmentExams.startsAt, endsAt: assessmentExams.endsAt,
      durationMinutes: assessmentExams.durationMinutes,
      attemptLimit: assessmentExams.attemptLimit, status: assessmentExams.status,
      courseTitle: courses.title,
      questionCount: assessmentExamQuestions.id,
    }).from(assessmentExams).innerJoin(courses, eq(courses.id, assessmentExams.courseId))
      .leftJoin(assessmentExamQuestions, eq(assessmentExamQuestions.examId, assessmentExams.id))
      .where(and(eq(assessmentExams.examType, "institute_planned"),
        inArray(assessmentExams.ownerId, ids)))
      .orderBy(desc(assessmentExams.startsAt), asc(assessmentExams.id)).limit(200),
    getDb().select({
      id: assessmentExams.id, title: assessmentExams.title,
      startsAt: assessmentExams.startsAt, endsAt: assessmentExams.endsAt,
      durationMinutes: assessmentExams.durationMinutes, status: assessmentExams.status,
      questionCount: assessmentExamQuestions.id,
    }).from(assessmentExams)
      .leftJoin(assessmentExamQuestions, eq(assessmentExamQuestions.examId, assessmentExams.id))
      .where(and(eq(assessmentExams.examType, "dena_coordinated"),
        eq(assessmentExams.ownerId, DENA_ASSESSMENT_OWNER_ID),
        eq(assessmentExams.status, "published")))
      .orderBy(desc(assessmentExams.startsAt), asc(assessmentExams.id)).limit(100),
  ]);
  return { exams: collapseCount(exams), denaExams: collapseCount(denaExams) };
}

export async function getDenaExams(userId: string) {
  const [admin] = await getDb().select({ id: memberships.id }).from(memberships)
    .where(and(eq(memberships.userId, userId), eq(memberships.role, "admin"),
      eq(memberships.status, "active"))).limit(1);
  if (!admin) return null;
  const exams = await getDb().select({
    id: assessmentExams.id, title: assessmentExams.title,
    startsAt: assessmentExams.startsAt, endsAt: assessmentExams.endsAt,
    durationMinutes: assessmentExams.durationMinutes,
    attemptLimit: assessmentExams.attemptLimit, status: assessmentExams.status,
    questionCount: assessmentExamQuestions.id,
  }).from(assessmentExams)
    .leftJoin(assessmentExamQuestions, eq(assessmentExamQuestions.examId, assessmentExams.id))
    .where(and(eq(assessmentExams.examType, "dena_coordinated"),
      eq(assessmentExams.ownerId, DENA_ASSESSMENT_OWNER_ID)))
    .orderBy(desc(assessmentExams.startsAt), asc(assessmentExams.id)).limit(200);
  return { exams: collapseCount(exams) };
}

export async function getExamReport(
  userId: string, role: "admin" | "institute", examId: string,
  query: ExamReportQuery = {}, options: { pageSize?: number } = {},
) {
  const db = getDb();
  let exam: {
    id: string; title: string; examType: "institute_planned" | "dena_coordinated";
    status: "draft" | "published" | "cancelled"; startsAt: Date; endsAt: Date;
    durationMinutes: number; attemptLimit: number; courseTitle: string | null;
  } | undefined;
  if (role === "admin") {
    const [admin] = await db.select({ id: memberships.id }).from(memberships)
      .where(and(eq(memberships.userId, userId), eq(memberships.role, "admin"),
        eq(memberships.status, "active"))).limit(1);
    if (!admin) return null;
    const [row] = await db.select({
      id: assessmentExams.id, title: assessmentExams.title,
      examType: assessmentExams.examType, status: assessmentExams.status,
      startsAt: assessmentExams.startsAt, endsAt: assessmentExams.endsAt,
      durationMinutes: assessmentExams.durationMinutes,
      attemptLimit: assessmentExams.attemptLimit, courseTitle: sql.raw("NULL").mapWith({
        mapFromDriverValue: (value) => value === null ? null : String(value),
      }),
    }).from(assessmentExams).where(and(
      eq(assessmentExams.id, examId),
      eq(assessmentExams.examType, "dena_coordinated"),
    )).limit(1);
    exam = row;
  } else {
    const rows = await db.select({
      id: assessmentExams.id, title: assessmentExams.title,
      examType: assessmentExams.examType, status: assessmentExams.status,
      startsAt: assessmentExams.startsAt, endsAt: assessmentExams.endsAt,
      durationMinutes: assessmentExams.durationMinutes,
      attemptLimit: assessmentExams.attemptLimit, courseTitle: courses.title,
    }).from(assessmentExams).innerJoin(memberships, and(
      eq(memberships.instituteId, assessmentExams.ownerId),
      eq(memberships.userId, userId),
      eq(memberships.role, "institute"),
      eq(memberships.status, "active"),
    )).innerJoin(courses, eq(courses.id, assessmentExams.courseId))
      .where(and(eq(assessmentExams.id, examId),
        eq(assessmentExams.examType, "institute_planned"),
      )).limit(1);
    exam = rows[0];
  }
  if (!exam) return null;

  const cursor = decodeReportCursor(query.cursor);
  if (cursor === null) return null;
  const pageSize = Math.min(Math.max(options.pageSize ?? 50, 1), 10001);
  const attemptConditions = [eq(assessmentExamAttempts.examId, examId)];
  if (query.status) attemptConditions.push(eq(assessmentExamAttempts.status, query.status));
  if (query.search) attemptConditions.push(ilike(user.name, `%${query.search}%`));
  if (cursor) attemptConditions.push(or(
    sql`${assessmentExamAttempts.startedAt} < ${cursor.startedAt}::timestamptz`,
    and(sql`${assessmentExamAttempts.startedAt} = ${cursor.startedAt}::timestamptz`, lt(assessmentExamAttempts.id, cursor.id)),
  )!);
  const [questionCount, summary, attemptRows] = await Promise.all([
    db.select({ value: sql.raw("count(*)").mapWith(Number) })
      .from(assessmentExamQuestions)
      .where(eq(assessmentExamQuestions.examId, examId)),
    db.select({
      participants: sql.raw("count(DISTINCT student_user_id)").mapWith(Number),
      totalAttempts: sql.raw("count(*)").mapWith(Number),
      inProgress: sql.raw("count(*) FILTER (WHERE status = 'in_progress')").mapWith(Number),
      submitted: sql.raw("count(*) FILTER (WHERE status = 'submitted')").mapWith(Number),
      expired: sql.raw("count(*) FILTER (WHERE status = 'expired')").mapWith(Number),
      averageScorePercent: sql.raw(
        "coalesce(avg(earned_points::numeric * 100 / NULLIF(total_points, 0)) " +
        "FILTER (WHERE status IN ('submitted', 'expired')), 0)",
      ).mapWith(Number),
    }).from(assessmentExamAttempts).where(eq(assessmentExamAttempts.examId, examId)),
    db.select({
      id: assessmentExamAttempts.id,
      studentName: user.name, attemptNumber: assessmentExamAttempts.attemptNumber,
      status: assessmentExamAttempts.status, startedAt: assessmentExamAttempts.startedAt,
      cursorStartedAt: sql<string>`to_char(${assessmentExamAttempts.startedAt} AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`,
      submittedAt: assessmentExamAttempts.submittedAt,
      correctCount: assessmentExamAttempts.correctCount,
      totalPoints: assessmentExamAttempts.totalPoints,
      earnedPoints: assessmentExamAttempts.earnedPoints,
    }).from(assessmentExamAttempts)
      .innerJoin(user, eq(user.id, assessmentExamAttempts.studentUserId))
      .where(and(...attemptConditions))
      .orderBy(desc(assessmentExamAttempts.startedAt), desc(assessmentExamAttempts.id))
      .limit(pageSize + 1),
  ]);
  const hasMore = attemptRows.length > pageSize;
  const rows = hasMore ? attemptRows.slice(0, pageSize) : attemptRows;
  const last = rows.at(-1);
  const totals = summary[0]!;
  return {
    exam: { ...exam, questionCount: questionCount[0]?.value ?? 0 },
    summary: {
      participants: totals.participants,
      totalAttempts: totals.totalAttempts,
      inProgress: totals.inProgress,
      submitted: totals.submitted,
      expired: totals.expired,
      averageScorePercent: Math.round(totals.averageScorePercent * 10) / 10,
    },
    filters: { status: query.status ?? "", search: query.search ?? "" },
    attempts: rows.map((attempt) => ({
      id: attempt.id,
      studentName: attempt.studentName,
      attemptNumber: attempt.attemptNumber,
      status: attempt.status,
      startedAt: attempt.startedAt,
      submittedAt: attempt.submittedAt,
      correctCount: attempt.correctCount,
      totalPoints: attempt.totalPoints,
      earnedPoints: attempt.earnedPoints,
      scorePercent: attempt.totalPoints && attempt.earnedPoints !== null
        ? Math.round(attempt.earnedPoints / attempt.totalPoints * 1000) / 10
        : null,
    })),
    nextCursor: hasMore && last ? encodeReportCursor(last.cursorStartedAt, last.id) : null,
  };
}

type CountRow = { id: string; questionCount: string | null };
function collapseCount<T extends CountRow>(rows: T[]) {
  const result = new Map<string, Omit<T, "questionCount"> & { questionCount: number }>();
  for (const row of rows) {
    const prior = result.get(row.id);
    if (!prior) result.set(row.id, { ...row, questionCount: row.questionCount ? 1 : 0 });
    else if (row.questionCount) prior.questionCount += 1;
  }
  return [...result.values()];
}

async function activeAdmin(tx: Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0], userId: string) {
  const [row] = await tx.select({ id: memberships.id }).from(memberships).where(and(
    eq(memberships.userId, userId), eq(memberships.role, "admin"),
    eq(memberships.status, "active"),
  )).limit(1).for("share");
  return Boolean(row);
}

export async function createInstituteExam(userId: string, input: InstituteExamInput) {
  return getDb().transaction(async (tx) => {
    const [course] = await tx.select({
      id: courses.id, instituteId: courses.responsibleInstituteId,
    }).from(memberships).innerJoin(verifiedEntities, and(
      eq(verifiedEntities.id, memberships.instituteId),
      eq(verifiedEntities.role, "institute"),
    )).innerJoin(courses, and(
      eq(courses.responsibleInstituteId, verifiedEntities.id),
      eq(courses.id, input.courseId),
    ))
      .innerJoin(supervisionGrants, and(
        eq(supervisionGrants.courseId, courses.id),
        eq(supervisionGrants.providerId, courses.providerId),
        eq(supervisionGrants.instituteId, courses.responsibleInstituteId),
        eq(supervisionGrants.status, "approved"),
      )).where(and(
        eq(memberships.userId, userId), eq(memberships.role, "institute"),
        eq(memberships.status, "active"),
      )).limit(1).for("share");
    if (!course) throw new ExamManagementError("course_unavailable");
    const [bank] = await tx.select({ id: assessmentQuestionBanks.id })
      .from(assessmentQuestionBanks).where(and(
        eq(assessmentQuestionBanks.ownerType, "institute"),
        eq(assessmentQuestionBanks.ownerId, course.instituteId),
      )).limit(1).for("share");
    if (!bank) throw new ExamManagementError("questions_unavailable");
    const questions = await tx.select().from(assessmentQuestionBankQuestions).where(and(
      eq(assessmentQuestionBankQuestions.bankId, bank.id),
      eq(assessmentQuestionBankQuestions.ownerType, "institute"),
      eq(assessmentQuestionBankQuestions.ownerId, course.instituteId),
      eq(assessmentQuestionBankQuestions.courseId, input.courseId),
      inArray(assessmentQuestionBankQuestions.id, input.questionIds),
    )).for("share");
    if (questions.length !== input.questionIds.length) {
      throw new ExamManagementError("questions_unavailable");
    }
    const [exam] = await tx.insert(assessmentExams).values({
      examType: "institute_planned", ownerType: "institute", ownerId: course.instituteId,
      bankId: bank.id, courseId: input.courseId, title: input.title,
      instructions: input.instructions, startsAt: new Date(input.startsAt),
      endsAt: new Date(input.endsAt), durationMinutes: input.durationMinutes,
      attemptLimit: input.attemptLimit, createdByUserId: userId,
    }).returning({ id: assessmentExams.id });
    await saveQuestions(tx, exam!.id, bank.id, "institute", course.instituteId, questions, input.questionIds);
    await tx.insert(auditLogs).values(auditLogRecord({ actorId: userId,
      actorRole: "institute", action: "institute.exam.created",
      entityType: "ASSESSMENT_EXAM", entityId: exam!.id }));
    return exam!;
  });
}

export async function createDenaExam(userId: string, input: DenaExamInput) {
  return getDb().transaction(async (tx) => {
    if (!await activeAdmin(tx, userId)) throw new ExamManagementError("admin_unavailable");
    const [bank] = await tx.select({ id: assessmentQuestionBanks.id })
      .from(assessmentQuestionBanks).where(and(
        eq(assessmentQuestionBanks.id, DENA_ASSESSMENT_BANK_ID),
        eq(assessmentQuestionBanks.ownerType, "dena"),
        eq(assessmentQuestionBanks.ownerId, DENA_ASSESSMENT_OWNER_ID),
      )).limit(1).for("share");
    if (!bank) throw new ExamManagementError("admin_unavailable");
    const questions = await tx.select().from(assessmentQuestionBankQuestions).where(and(
      eq(assessmentQuestionBankQuestions.bankId, bank.id),
      eq(assessmentQuestionBankQuestions.ownerType, "dena"),
      eq(assessmentQuestionBankQuestions.ownerId, DENA_ASSESSMENT_OWNER_ID),
      inArray(assessmentQuestionBankQuestions.id, input.questionIds),
    )).for("share");
    if (questions.length !== input.questionIds.length) {
      throw new ExamManagementError("questions_unavailable");
    }
    const [exam] = await tx.insert(assessmentExams).values({
      examType: "dena_coordinated", ownerType: "dena",
      ownerId: DENA_ASSESSMENT_OWNER_ID, bankId: bank.id,
      title: input.title, instructions: input.instructions,
      startsAt: new Date(input.startsAt), endsAt: new Date(input.endsAt),
      durationMinutes: input.durationMinutes, attemptLimit: input.attemptLimit,
      createdByUserId: userId,
    }).returning({ id: assessmentExams.id });
    await saveQuestions(tx, exam!.id, bank.id, "dena", DENA_ASSESSMENT_OWNER_ID,
      questions, input.questionIds);
    await tx.insert(auditLogs).values(auditLogRecord({ actorId: userId,
      actorRole: "admin", action: "admin.dena_exam.created",
      entityType: "ASSESSMENT_EXAM", entityId: exam!.id }));
    return exam!;
  });
}

export const examStatusInput = z.object({
  status: z.enum(["published", "cancelled"]),
}).strict();

export async function changeExamStatus(
  actorUserId: string, actorRole: "admin" | "institute", examId: string,
  status: "published" | "cancelled",
) {
  return getDb().transaction(async (tx) => {
    let row: typeof assessmentExams.$inferSelect | undefined;
    if (actorRole === "admin") {
      if (!await activeAdmin(tx, actorUserId)) throw new ExamManagementError("admin_unavailable");
      [row] = await tx.select().from(assessmentExams).where(and(
        eq(assessmentExams.id, examId), eq(assessmentExams.examType, "dena_coordinated"),
      )).limit(1).for("update");
    } else {
      const rows = await tx.select({ exam: assessmentExams })
        .from(assessmentExams).innerJoin(memberships, and(
          eq(memberships.instituteId, assessmentExams.ownerId),
          eq(memberships.userId, actorUserId),
          eq(memberships.role, "institute"),
          eq(memberships.status, "active"),
        )).where(and(eq(assessmentExams.id, examId),
          eq(assessmentExams.examType, "institute_planned"),
        )).limit(1).for("update");
      row = rows[0]?.exam;
    }
    if (!row) throw new ExamManagementError("exam_unavailable");
    const now = new Date();
    const canPublish = row.status === "draft" && status === "published" &&
      row.startsAt > now && row.endsAt > now;
    const canCancel = status === "cancelled" && (
      row.status === "draft" || (row.status === "published" && row.startsAt > now)
    );
    if (!canPublish && !canCancel) throw new ExamManagementError("exam_unavailable");
    const [updated] = await tx.update(assessmentExams).set({
      status, updatedAt: now,
    }).where(eq(assessmentExams.id, examId))
      .returning({ id: assessmentExams.id, status: assessmentExams.status });
    const action = actorRole === "admin"
      ? status === "published" ? "admin.dena_exam.published" : "admin.dena_exam.cancelled"
      : status === "published" ? "institute.exam.published" : "institute.exam.cancelled";
    await tx.insert(auditLogs).values(auditLogRecord({
      actorId: actorUserId, actorRole, action, entityType: "ASSESSMENT_EXAM",
      entityId: updated!.id,
    }));
    return updated!;
  });
}

export async function getStudentExamCatalog(studentUserId: string) {
  const db = getDb();
  const [student] = await db.select({ id: memberships.id }).from(memberships)
    .where(and(eq(memberships.userId, studentUserId),
      eq(memberships.role, "student"), eq(memberships.status, "active"))).limit(1);
  if (!student) return null;
  const [attemptRows, enrollmentRows] = await Promise.all([
    db.select().from(assessmentExamAttempts)
      .where(eq(assessmentExamAttempts.studentUserId, studentUserId))
      .orderBy(desc(assessmentExamAttempts.attemptNumber)),
    db.select({ courseId: studentEnrollments.courseId }).from(studentEnrollments)
      .where(and(eq(studentEnrollments.studentUserId, studentUserId),
        eq(studentEnrollments.status, "active"))),
  ]);
  const latestAttempt = new Map<string, typeof assessmentExamAttempts.$inferSelect>();
  for (const attempt of attemptRows) {
    if (!latestAttempt.has(attempt.examId)) latestAttempt.set(attempt.examId, attempt);
  }
  const attemptedExamIds = [...latestAttempt.keys()];
  const enrollmentCourseIds = [...new Set(enrollmentRows.map((item) => item.courseId))];
  const dbAttempts = attemptedExamIds.length > 0;
  const [denaRows, instituteRows] = await Promise.all([
    db.select({
      id: assessmentExams.id, title: assessmentExams.title,
      instructions: assessmentExams.instructions, startsAt: assessmentExams.startsAt,
      endsAt: assessmentExams.endsAt, durationMinutes: assessmentExams.durationMinutes,
      attemptLimit: assessmentExams.attemptLimit, status: assessmentExams.status,
      questionCount: assessmentExamQuestions.id,
      courseTitle: sql.raw("NULL").mapWith({
        mapFromDriverValue: (value) => value === null ? null : String(value),
      }),
    }).from(assessmentExams)
      .leftJoin(assessmentExamQuestions, eq(assessmentExamQuestions.examId, assessmentExams.id))
      .where(and(
        eq(assessmentExams.examType, "dena_coordinated"),
        eq(assessmentExams.ownerId, DENA_ASSESSMENT_OWNER_ID),
        dbAttempts
          ? or(eq(assessmentExams.status, "published"), inArray(assessmentExams.id, attemptedExamIds))
          : eq(assessmentExams.status, "published"),
      )).orderBy(asc(assessmentExams.startsAt), asc(assessmentExams.id)).limit(300),
    enrollmentCourseIds.length > 0 || attemptedExamIds.length > 0
      ? db.select({
        id: assessmentExams.id, title: assessmentExams.title,
        instructions: assessmentExams.instructions, startsAt: assessmentExams.startsAt,
        endsAt: assessmentExams.endsAt, durationMinutes: assessmentExams.durationMinutes,
        attemptLimit: assessmentExams.attemptLimit, status: assessmentExams.status,
        questionCount: assessmentExamQuestions.id, courseTitle: courses.title,
      }).from(assessmentExams).innerJoin(courses, eq(courses.id, assessmentExams.courseId))
        .leftJoin(assessmentExamQuestions, eq(assessmentExamQuestions.examId, assessmentExams.id))
        .where(and(
          eq(assessmentExams.examType, "institute_planned"),
          or(
            enrollmentCourseIds.length
              ? inArray(courses.id, enrollmentCourseIds) : undefined,
            attemptedExamIds.length
              ? inArray(assessmentExams.id, attemptedExamIds) : undefined,
          ),
          dbAttempts
            ? or(eq(assessmentExams.status, "published"), inArray(assessmentExams.id, attemptedExamIds))
            : eq(assessmentExams.status, "published"),
        )).orderBy(asc(assessmentExams.startsAt), asc(assessmentExams.id)).limit(300)
      : Promise.resolve([]),
  ]);
  const now = new Date();
  const all = [...collapseCount(denaRows), ...collapseCount(instituteRows)]
    .filter((exam) => exam.endsAt >= now || latestAttempt.has(exam.id))
    .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
  return { exams: all.map((exam) => {
    const attempt = latestAttempt.get(exam.id);
    const inProgress = attempt?.status === "in_progress";
    return {
      id: exam.id, title: exam.title, instructions: exam.instructions,
      startsAt: exam.startsAt, endsAt: exam.endsAt,
      durationMinutes: exam.durationMinutes, attemptLimit: exam.attemptLimit,
      status: exam.status,
      examType: exam.courseTitle ? "institute_planned" as const : "dena_coordinated" as const,
      courseTitle: exam.courseTitle, questionCount: exam.questionCount,
      attemptNumber: attempt?.attemptNumber ?? null, attemptStatus: attempt?.status ?? null,
      attemptId: inProgress ? attempt.id : null, correctCount: attempt?.correctCount ?? null,
      totalPoints: attempt?.totalPoints ?? null, earnedPoints: attempt?.earnedPoints ?? null,
      canStart: exam.status === "published" && now >= exam.startsAt && now < exam.endsAt &&
        (inProgress || (attempt?.attemptNumber ?? 0) < exam.attemptLimit),
    };
  }) };
}

async function requireStudent(
  tx: Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0],
  studentUserId: string,
) {
  const [student] = await tx.select({ id: memberships.id }).from(memberships)
    .where(and(eq(memberships.userId, studentUserId), eq(memberships.role, "student"),
      eq(memberships.status, "active"))).limit(1).for("share");
  if (!student) throw new ExamManagementError("student_unavailable");
}

async function requireExamEligibility(
  tx: Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0],
  studentUserId: string, exam: typeof assessmentExams.$inferSelect,
) {
  await requireStudent(tx, studentUserId);
  if (exam.examType === "institute_planned") {
    const [enrollment] = await tx.select({ id: studentEnrollments.id })
      .from(studentEnrollments).where(and(
        eq(studentEnrollments.studentUserId, studentUserId),
        eq(studentEnrollments.courseId, exam.courseId!),
        eq(studentEnrollments.status, "active"),
      )).limit(1).for("share");
    if (!enrollment) throw new ExamManagementError("not_enrolled");
  }
}

export async function startStudentExam(studentUserId: string, examId: string) {
  return getDb().transaction(async (tx) => {
    const [exam] = await tx.select().from(assessmentExams)
      .where(and(eq(assessmentExams.id, examId),
        eq(assessmentExams.status, "published")))
      .limit(1).for("update");
    if (!exam) throw new ExamManagementError("exam_unavailable");
    await requireExamEligibility(tx, studentUserId, exam);
    const attempts = await tx.select().from(assessmentExamAttempts).where(and(
      eq(assessmentExamAttempts.examId, examId),
      eq(assessmentExamAttempts.studentUserId, studentUserId),
    )).orderBy(desc(assessmentExamAttempts.attemptNumber)).for("update");
    const latest = attempts[0];
    const now = new Date();
    if (latest?.status === "in_progress") {
      return { attemptId: latest.id, resumed: true };
    }
    if (now < exam.startsAt || now >= exam.endsAt) {
      throw new ExamManagementError("outside_schedule");
    }
    if (attempts.length >= exam.attemptLimit) throw new ExamManagementError("attempt_limit");
    const questions = await tx.select({
      id: assessmentExamQuestions.id,
    }).from(assessmentExamQuestions).where(eq(assessmentExamQuestions.examId, examId))
      .orderBy(asc(assessmentExamQuestions.position));
    if (!questions.length) throw new ExamManagementError("exam_unavailable");
    const deadlineAt = new Date(Math.min(
      now.getTime() + exam.durationMinutes * 60_000, exam.endsAt.getTime(),
    ));
    const attemptNumber = (latest?.attemptNumber ?? 0) + 1;
    const [attempt] = await tx.insert(assessmentExamAttempts).values({
      examId, studentUserId, attemptNumber, questionCount: questions.length, deadlineAt,
    }).returning({ id: assessmentExamAttempts.id });
    await tx.insert(assessmentExamAttemptAnswers).values(questions.map((question) => ({
      attemptId: attempt!.id, examId, studentUserId, examQuestionId: question.id,
    })));
    return { attemptId: attempt!.id, resumed: false };
  });
}

async function finalizeStudentExamAttempt(
  tx: Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0],
  attempt: typeof assessmentExamAttempts.$inferSelect,
  status: "submitted" | "expired",
) {
  const rows = await tx.select({
    selectedOption: assessmentExamAttemptAnswers.selectedOption,
    correctOption: assessmentExamQuestions.correctOption,
    points: assessmentExamQuestions.points,
  }).from(assessmentExamAttemptAnswers).innerJoin(assessmentExamQuestions, and(
    eq(assessmentExamQuestions.id, assessmentExamAttemptAnswers.examQuestionId),
    eq(assessmentExamQuestions.examId, assessmentExamAttemptAnswers.examId),
  )).where(and(
    eq(assessmentExamAttemptAnswers.attemptId, attempt.id),
    eq(assessmentExamAttemptAnswers.studentUserId, attempt.studentUserId),
  ));
  const { correctCount, totalPoints, earnedPoints } = scoreExamAnswerRows(rows);
  const [updated] = await tx.update(assessmentExamAttempts).set({
    status, correctCount, totalPoints, earnedPoints, submittedAt: new Date(),
  }).where(and(eq(assessmentExamAttempts.id, attempt.id),
    eq(assessmentExamAttempts.status, "in_progress")))
    .returning({ id: assessmentExamAttempts.id });
  return { id: updated?.id ?? attempt.id, status, correctCount, totalPoints, earnedPoints };
}

export function scoreExamAnswerRows(rows: Array<{
  selectedOption: number | null; correctOption: number; points: number;
}>) {
  const correctCount = rows.filter((row) =>
    row.selectedOption !== null && row.selectedOption === row.correctOption).length;
  const totalPoints = rows.reduce((total, row) => total + row.points, 0);
  const earnedPoints = rows.reduce((total, row) => total +
    (row.selectedOption !== null && row.selectedOption === row.correctOption ? row.points : 0), 0);
  return { correctCount, totalPoints, earnedPoints };
}

export async function getStudentExamAttempt(
  studentUserId: string, examId: string, attemptId: string,
) {
  return getDb().transaction(async (tx) => {
    await requireStudent(tx, studentUserId);
    const [attempt] = await tx.select().from(assessmentExamAttempts).where(and(
      eq(assessmentExamAttempts.id, attemptId),
      eq(assessmentExamAttempts.examId, examId),
      eq(assessmentExamAttempts.studentUserId, studentUserId),
    )).limit(1).for("update");
    if (!attempt) throw new ExamManagementError("attempt_unavailable");
    const [exam] = await tx.select({
      title: assessmentExams.title, instructions: assessmentExams.instructions,
    }).from(assessmentExams).where(eq(assessmentExams.id, examId)).limit(1);
    if (attempt.status === "in_progress" && attempt.deadlineAt <= new Date()) {
      const result = await finalizeStudentExamAttempt(tx, attempt, "expired");
      return { ...result, title: exam!.title, instructions: exam!.instructions,
        deadlineAt: attempt.deadlineAt, questions: [] };
    }
    if (attempt.status !== "in_progress") {
      return {
        id: attempt.id, status: attempt.status, deadlineAt: attempt.deadlineAt,
        correctCount: attempt.correctCount, totalPoints: attempt.totalPoints,
        earnedPoints: attempt.earnedPoints, title: exam!.title,
        instructions: exam!.instructions, questions: [],
      };
    }
    const questions = await tx.select({
      id: assessmentExamQuestions.id, prompt: assessmentExamQuestions.prompt,
      option0: assessmentExamQuestions.option0, option1: assessmentExamQuestions.option1,
      option2: assessmentExamQuestions.option2, option3: assessmentExamQuestions.option3,
      position: assessmentExamQuestions.position,
      selectedOption: assessmentExamAttemptAnswers.selectedOption,
    }).from(assessmentExamAttemptAnswers).innerJoin(assessmentExamQuestions, and(
      eq(assessmentExamQuestions.id, assessmentExamAttemptAnswers.examQuestionId),
      eq(assessmentExamQuestions.examId, assessmentExamAttemptAnswers.examId),
    )).where(and(
      eq(assessmentExamAttemptAnswers.attemptId, attempt.id),
      eq(assessmentExamAttemptAnswers.studentUserId, studentUserId),
    )).orderBy(asc(assessmentExamQuestions.position));
    return {
      id: attempt.id, status: attempt.status, deadlineAt: attempt.deadlineAt,
      title: exam!.title, instructions: exam!.instructions, questions,
    };
  });
}

export const studentExamAnswersInput = z.object({
  answers: z.array(z.object({
    questionId: z.uuid(), selectedOption: z.number().int().min(0).max(3),
  }).strict()).min(1).max(300),
}).strict().superRefine(({ answers }, ctx) => {
  if (new Set(answers.map((answer) => answer.questionId)).size !== answers.length) {
    ctx.addIssue({ code: "custom", path: ["answers"], message: "duplicate_answers" });
  }
});

export async function saveStudentExamAnswers(
  studentUserId: string, examId: string, attemptId: string,
  answers: z.infer<typeof studentExamAnswersInput>["answers"],
) {
  return getDb().transaction(async (tx) => {
    await requireStudent(tx, studentUserId);
    const [attempt] = await tx.select().from(assessmentExamAttempts).where(and(
      eq(assessmentExamAttempts.id, attemptId),
      eq(assessmentExamAttempts.examId, examId),
      eq(assessmentExamAttempts.studentUserId, studentUserId),
    )).limit(1).for("update");
    if (!attempt || attempt.status !== "in_progress") {
      throw new ExamManagementError("attempt_closed");
    }
    if (attempt.deadlineAt <= new Date()) {
      await finalizeStudentExamAttempt(tx, attempt, "expired");
      return { saved: 0, expired: true };
    }
    const rows = await tx.select({ questionId: assessmentExamAttemptAnswers.examQuestionId })
      .from(assessmentExamAttemptAnswers).where(and(
        eq(assessmentExamAttemptAnswers.attemptId, attemptId),
        eq(assessmentExamAttemptAnswers.studentUserId, studentUserId),
        inArray(assessmentExamAttemptAnswers.examQuestionId,
          answers.map((answer) => answer.questionId)),
      ));
    if (rows.length !== answers.length) throw new ExamManagementError("attempt_unavailable");
    const now = new Date();
    for (const answer of answers) {
      await tx.update(assessmentExamAttemptAnswers).set({
        selectedOption: answer.selectedOption, answeredAt: now,
      }).where(and(
        eq(assessmentExamAttemptAnswers.attemptId, attemptId),
        eq(assessmentExamAttemptAnswers.studentUserId, studentUserId),
        eq(assessmentExamAttemptAnswers.examQuestionId, answer.questionId),
      ));
    }
    return { saved: answers.length };
  });
}

export async function submitStudentExamAttempt(
  studentUserId: string, examId: string, attemptId: string,
) {
  return getDb().transaction(async (tx) => {
    await requireStudent(tx, studentUserId);
    const [attempt] = await tx.select().from(assessmentExamAttempts).where(and(
      eq(assessmentExamAttempts.id, attemptId),
      eq(assessmentExamAttempts.examId, examId),
      eq(assessmentExamAttempts.studentUserId, studentUserId),
    )).limit(1).for("update");
    if (!attempt) throw new ExamManagementError("attempt_unavailable");
    if (attempt.status !== "in_progress") {
      return {
        id: attempt.id, status: attempt.status, correctCount: attempt.correctCount,
        totalPoints: attempt.totalPoints, earnedPoints: attempt.earnedPoints,
      };
    }
    return finalizeStudentExamAttempt(tx, attempt,
      attempt.deadlineAt <= new Date() ? "expired" : "submitted");
  });
}

async function saveQuestions(
  tx: Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0],
  examId: string, bankId: string, ownerType: "dena" | "institute", ownerId: string,
  questions: typeof assessmentQuestionBankQuestions.$inferSelect[], ids: string[],
) {
  const byId = new Map(questions.map((question) => [question.id, question]));
  await tx.insert(assessmentExamQuestions).values(ids.map((id, position) => {
    const question = byId.get(id)!;
    return {
      examId, bankId, ownerType, ownerId, bankQuestionId: question.id, position,
      prompt: question.prompt, option0: question.option0, option1: question.option1,
      option2: question.option2, option3: question.option3,
      correctOption: question.correctOption, points: 1,
    };
  }));
}
