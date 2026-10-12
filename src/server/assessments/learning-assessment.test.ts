import { describe, expect, it } from "vitest";
import {
  learningAssessmentAnswers, learningAssessmentDecision, newLearningAssessment,
} from "./learning-assessment";

const assetA = "11111111-1111-4111-8111-111111111111";
const assetB = "22222222-2222-4222-8222-222222222222";
const valid = {
  title: "ارزیابی فصل اول",
  instructions: "به پرسش‌ها با دقت پاسخ دهید.",
  questionCount: 2,
  requiredCorrectCount: 1,
  questions: [
    { prompt: "کدام گزینه پاسخ درست پرسش اول است؟", options: ["الف", "ب", "پ", "ت"], correctOption: 2, lessonAssetId: assetA },
    { prompt: "کدام گزینه پاسخ درست پرسش دوم است؟", options: ["یک", "دو", "سه", "چهار"], correctOption: 0, lessonAssetId: assetB },
    { prompt: "کدام گزینه پاسخ درست پرسش سوم است؟", options: ["شرق", "غرب", "شمال", "جنوب"], correctOption: 1, lessonAssetId: assetA },
  ],
};

describe("learning assessment input contracts", () => {
  it("accepts a question bank larger than its randomized sample and a local threshold", () => {
    expect(newLearningAssessment.safeParse(valid).success).toBe(true);
  });

  it("rejects a question bank smaller than the configured sample", () => {
    expect(newLearningAssessment.safeParse({
      ...valid, questions: valid.questions.slice(0, 1),
    }).success).toBe(false);
  });

  it("rejects a threshold above this assessment's question count", () => {
    expect(newLearningAssessment.safeParse({
      ...valid, requiredCorrectCount: 3,
    }).success).toBe(false);
  });

  it("requires four distinct bounded options and a same-course lesson UUID", () => {
    const [first, ...rest] = valid.questions;
    expect(newLearningAssessment.safeParse({
      ...valid,
      questions: [{ ...first, options: ["تکرار", "تکرار", "پ", "ت"] }, ...rest],
    }).success).toBe(false);
    expect(newLearningAssessment.safeParse({
      ...valid,
      questions: [{ ...first, lessonAssetId: "not-a-uuid" }, ...rest],
    }).success).toBe(false);
  });

  it("accepts a bounded independent institute decision only", () => {
    expect(learningAssessmentDecision.safeParse({
      action: "approve", reason: "محتوا و کلید پاسخ بررسی شد.",
    }).success).toBe(true);
    expect(learningAssessmentDecision.safeParse({
      action: "approve", reason: "خوبه",
    }).success).toBe(false);
    expect(learningAssessmentDecision.safeParse({
      action: "approve", reason: "محتوا مناسب است", extra: true,
    }).success).toBe(false);
  });

  it("accepts only a strict map of question UUIDs to four-option indices", () => {
    expect(learningAssessmentAnswers.safeParse({ answers: {
      "11111111-1111-4111-8111-111111111111": 0,
      "22222222-2222-4222-8222-222222222222": 3,
    } }).success).toBe(true);
    expect(learningAssessmentAnswers.safeParse({ answers: {
      "not-a-uuid": 1,
    } }).success).toBe(false);
    expect(learningAssessmentAnswers.safeParse({ answers: {
      "11111111-1111-4111-8111-111111111111": 4,
    } }).success).toBe(false);
    expect(learningAssessmentAnswers.safeParse({ answers: {}, extra: true }).success).toBe(false);
  });
});
