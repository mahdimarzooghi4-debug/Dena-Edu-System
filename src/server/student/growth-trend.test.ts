import { describe, expect, it } from "vitest";
import { buildAssessmentGrowthSeries, type AssessmentGrowthRow } from "./growth-trend";

const courseId = "00000000-0000-4000-8000-000000000001";
const assessmentA = "00000000-0000-4000-8000-000000000010";
const assessmentB = "00000000-0000-4000-8000-000000000020";

function row(
  assessmentId: string,
  attemptNumber: number,
  correctCount: number,
  questionCount = 5,
): AssessmentGrowthRow {
  return {
    courseId,
    courseTitle: "دورهٔ نمونه",
    assessmentId,
    assessmentTitle: assessmentId === assessmentA ? "ارزیابی الف" : "ارزیابی ب",
    questionCount,
    attemptNumber,
    correctCount,
    outcome: correctCount === questionCount ? "completed" : "needs_review",
    submittedAt: new Date(`2026-09-${String(attemptNumber).padStart(2, "0")}T10:00:00Z`),
  };
}

describe("student assessment growth normalization", () => {
  it("normalizes and orders attempts separately for each assessment", () => {
    const result = buildAssessmentGrowthSeries([
      row(assessmentA, 2, 4),
      row(assessmentB, 1, 1, 4),
      row(assessmentA, 1, 2),
    ]);

    expect(result).toHaveLength(2);
    const first = result.find((series) => series.assessmentId === assessmentA);
    const second = result.find((series) => series.assessmentId === assessmentB);
    expect(first?.points.map((point) => [point.attemptNumber, point.percentage]))
      .toEqual([[1, 40], [2, 80]]);
    expect(second?.points.map((point) => point.percentage)).toEqual([25]);
  });

  it("rounds to one decimal and ignores invalid scores and dates", () => {
    const invalid = row(assessmentA, 3, 6);
    const badDate = { ...row(assessmentA, 4, 1), submittedAt: new Date("invalid") };
    const result = buildAssessmentGrowthSeries([
      row(assessmentA, 1, 1, 3),
      invalid,
      badDate,
      row(assessmentA, 0, 1),
    ]);

    expect(result[0]?.points).toHaveLength(1);
    expect(result[0]?.points[0]?.percentage).toBe(33.3);
  });
});
