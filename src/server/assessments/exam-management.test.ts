import { describe, expect, it } from "vitest";
import {
  denaExamInput, examReportQuery, instituteExamInput, scoreExamAnswerRows, studentExamAnswersInput,
} from "./exam-management";
import { csvCell } from "./report-csv";

const questionIds = ["11111111-1111-4111-8111-111111111111"];
const base = {
  title: "آزمون نیم‌سال",
  instructions: "به همهٔ سؤال‌ها پاسخ دهید.",
  startsAt: "2026-10-02T09:00:00+03:30",
  endsAt: "2026-10-02T12:00:00+03:30",
  durationMinutes: 60,
  questionIds,
};

describe("exam creation contract", () => {
  it("accepts a Dena exam without institute or course scope", () => {
    expect(denaExamInput.parse(base).attemptLimit).toBe(1);
  });

  it("requires institute planned exams to bind to a course", () => {
    expect(instituteExamInput.safeParse({
      ...base,
      courseId: "22222222-2222-4222-8222-222222222222",
      attemptLimit: 3,
    }).success).toBe(true);
    expect(instituteExamInput.safeParse(base).success).toBe(false);
  });

  it("rejects duplicate questions and a closing time before opening", () => {
    expect(denaExamInput.safeParse({ ...base, questionIds: [...questionIds, ...questionIds] }).success)
      .toBe(false);
    expect(denaExamInput.safeParse({
      ...base, endsAt: "2026-10-02T08:00:00+03:30",
    }).success).toBe(false);
  });

  it("enforces bounded duration, attempts, and question selection", () => {
    expect(denaExamInput.safeParse({ ...base, durationMinutes: 4 }).success).toBe(false);
    expect(denaExamInput.safeParse({ ...base, attemptLimit: 21 }).success).toBe(false);
    expect(denaExamInput.safeParse({ ...base, questionIds: [] }).success).toBe(false);
  });

  it("validates saved answer payloads and rejects duplicate question answers", () => {
    const answer = {
      questionId: questionIds[0]!,
      selectedOption: 2,
    };
    expect(studentExamAnswersInput.safeParse({ answers: [answer] }).success).toBe(true);
    expect(studentExamAnswersInput.safeParse({
      answers: [answer, answer],
    }).success).toBe(false);
    expect(studentExamAnswersInput.safeParse({
      answers: [{ ...answer, selectedOption: 4 }],
    }).success).toBe(false);
  });

  it("scores only correct selected options and awards no points for unanswered items", () => {
    expect(scoreExamAnswerRows([
      { selectedOption: 1, correctOption: 1, points: 2 },
      { selectedOption: 3, correctOption: 2, points: 1 },
      { selectedOption: null, correctOption: 0, points: 3 },
    ])).toEqual({ correctCount: 1, totalPoints: 6, earnedPoints: 2 });
  });
});

describe("exam report filters and CSV safety", () => {
  it("accepts bounded search and known attempt statuses only", () => {
    expect(examReportQuery.safeParse({ status: "submitted", search: "  سارا  " }).success).toBe(true);
    expect(examReportQuery.safeParse({ status: "draft" }).success).toBe(false);
    expect(examReportQuery.safeParse({ search: "x".repeat(81) }).success).toBe(false);
  });

  it("quotes CSV values and neutralizes spreadsheet formulas", () => {
    expect(csvCell('نام "آزمون"')).toBe('"نام ""آزمون"""');
    expect(csvCell("=1+1")).toBe("\"'=1+1\"");
    expect(csvCell("نام عادی")).toBe('"نام عادی"');
  });
});
