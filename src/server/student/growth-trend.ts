import { and, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "../../db";
import {
  courseLearningAssessments, courses, studentLearningAssessmentAttempts,
} from "../../db/schema";
import { getStudentProgressOverview } from "./progress-overview";

export type AssessmentGrowthRow = {
  courseId: string;
  courseTitle: string;
  assessmentId: string;
  assessmentTitle: string;
  questionCount: number;
  attemptNumber: number;
  correctCount: number;
  outcome: "completed" | "needs_review";
  submittedAt: Date;
};

export type AssessmentGrowthPoint = {
  attemptNumber: number;
  submittedAt: string;
  correctCount: number;
  questionCount: number;
  percentage: number;
  outcome: "completed" | "needs_review";
};

export type AssessmentGrowthSeries = {
  courseId: string;
  courseTitle: string;
  assessmentId: string;
  assessmentTitle: string;
  points: AssessmentGrowthPoint[];
};

/**
 * Normalize only within one approved assessment: correct answers divided by
 * that assessment's fixed question count. Random question versions are assumed
 * to have comparable difficulty; this is a trend signal, not proof of learning.
 */
export function buildAssessmentGrowthSeries(
  rows: AssessmentGrowthRow[],
): AssessmentGrowthSeries[] {
  const groups = new Map<string, AssessmentGrowthSeries>();
  for (const row of rows) {
    if (!Number.isInteger(row.questionCount) || row.questionCount <= 0 ||
        !Number.isInteger(row.correctCount) || row.correctCount < 0 ||
        row.correctCount > row.questionCount ||
        !Number.isInteger(row.attemptNumber) || row.attemptNumber < 1 ||
        Number.isNaN(row.submittedAt.getTime())) continue;

    let series = groups.get(row.assessmentId);
    if (!series) {
      series = {
        courseId: row.courseId,
        courseTitle: row.courseTitle,
        assessmentId: row.assessmentId,
        assessmentTitle: row.assessmentTitle,
        points: [],
      };
      groups.set(row.assessmentId, series);
    }
    if (series.courseId !== row.courseId ||
        series.courseTitle !== row.courseTitle ||
        series.assessmentTitle !== row.assessmentTitle) continue;

    series.points.push({
      attemptNumber: row.attemptNumber,
      submittedAt: row.submittedAt.toISOString(),
      correctCount: row.correctCount,
      questionCount: row.questionCount,
      percentage: Math.round((row.correctCount / row.questionCount) * 1000) / 10,
      outcome: row.outcome,
    });
  }

  return [...groups.values()]
    .map((series) => ({
      ...series,
      points: series.points.sort((a, b) => a.attemptNumber - b.attemptNumber),
    }))
    .sort((a, b) => a.courseTitle.localeCompare(b.courseTitle, "fa") ||
      a.assessmentTitle.localeCompare(b.assessmentTitle, "fa"));
}

/**
 * Current access is re-used from the student progress summary: only the 20
 * newest currently accessible courses are considered. Attempts are private
 * to the caller and restricted to approved assessments and submitted records.
 */
export async function getStudentAssessmentGrowth(studentUserId: string) {
  const overview = await getStudentProgressOverview(studentUserId);
  if (overview.courses.length === 0) return [];

  const db = getDb();
  const rows = await db.select({
    courseId: courses.id,
    courseTitle: courses.title,
    assessmentId: courseLearningAssessments.id,
    assessmentTitle: courseLearningAssessments.title,
    questionCount: courseLearningAssessments.questionCount,
    attemptNumber: studentLearningAssessmentAttempts.attemptNumber,
    correctCount: studentLearningAssessmentAttempts.correctCount,
    outcome: studentLearningAssessmentAttempts.outcome,
    submittedAt: studentLearningAssessmentAttempts.submittedAt,
  }).from(studentLearningAssessmentAttempts)
    .innerJoin(courseLearningAssessments, and(
      eq(courseLearningAssessments.id,
        studentLearningAssessmentAttempts.assessmentId),
      eq(courseLearningAssessments.courseId,
        studentLearningAssessmentAttempts.courseId),
      eq(courseLearningAssessments.reviewStatus, "approved"),
    ))
    .innerJoin(courses, eq(courses.id, courseLearningAssessments.courseId))
    .where(and(
      inArray(courses.id, overview.courses.map((course) => course.courseId)),
      eq(studentLearningAssessmentAttempts.studentUserId, studentUserId),
      eq(studentLearningAssessmentAttempts.status, "submitted"),
    ))
    .orderBy(desc(studentLearningAssessmentAttempts.submittedAt))
    .limit(100);

  return buildAssessmentGrowthSeries(rows.flatMap((row) =>
    row.correctCount === null || row.outcome === null ||
      row.submittedAt === null ? [] : [{
      ...row,
      correctCount: row.correctCount,
      outcome: row.outcome as "completed" | "needs_review",
      submittedAt: row.submittedAt,
    }]));
}
