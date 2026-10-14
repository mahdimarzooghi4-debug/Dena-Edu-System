import { describe, expect, it } from "vitest";
import { getReviewPracticeTopic, getStudyPrompt, recommendNextStudyStep } from "./study-recommendation";
import {
  answerFromSeedCorpus, applySeedPracticeGuidance, getSeedPractice,
  gradeSeedPractice, SEED_CORPUS_VERSION,
} from "./seed-corpus";

describe("Dena internal tutor starter corpus", () => {
  it("returns a Persian explanation and traceable corpus version for covered concepts", () => {
    const result = answerFromSeedCorpus("معادله ۳x + ۵ = ۱۷ را چطور حل کنم؟");
    expect(result?.source.id).toBe("math.linear-equation.v1");
    expect(result?.source.corpusVersion).toBe(SEED_CORPUS_VERSION);
    expect(result?.answer).toContain("x = ۴");
  });

  it("normalizes Arabic/Persian letter variants for retrieval", () => {
    expect(answerFromSeedCorpus("جمع كسرها چطور است؟")?.source.id)
      .toBe("math.fractions.add.v1");
  });


  it.each([
    ["نور و عدسی را توضیح بده", "science.light.v1", "عدسی محدب"],
    ["اقلیم و رطوبت یعنی چه؟", "geography.climate.v1", "اقلیم"],
  ])("retrieves reviewed starter content for %s", (question, topicId, answerText) => {
    const result = answerFromSeedCorpus(question);
    expect(result?.source.id).toBe(topicId);
    expect(result?.answer).toContain(answerText);
  });

  it("does not make up an answer outside the starter corpus", () => {
    expect(answerFromSeedCorpus("نظریه نسبیت را توضیح بده")).toBeNull();
  });
});


describe("personalized starter practice", () => {
  it("returns only a prompt and options for the student's saved topic", () => {
    const practice = getSeedPractice("math.linear-equation.v1");
    expect(practice.id).toBe("practice.linear-equation.v1");
    expect(practice.prompt).toContain("۲x + ۳");
    expect(practice.options).toHaveLength(4);
    expect(practice.guidedHint).toEqual(expect.any(String));
    expect(practice).not.toHaveProperty("correctOption");
  });


  it.each([
    ["science.light.v1", "practice.science.light.v1"],
    ["geography.climate.v1", "practice.geography.climate.v1"],
  ] as const)("offers and grades authored practice for %s", (topicId, questionId) => {
    const practice = getSeedPractice(topicId);
    expect(practice.id).toBe(questionId);
    expect(practice.options).toHaveLength(4);
    expect(practice).not.toHaveProperty("correctOption");
    expect(gradeSeedPractice(questionId, 0)?.correct).toBe(true);
    expect(gradeSeedPractice(questionId, 1)?.correct).toBe(false);
  });

  it.each([
    ["math.linear-equation.v1", "practice.linear-equation.v2", 2],
    ["math.fractions.add.v1", "practice.fractions.add.v2", 2],
    ["math.percent.v1", "practice.percent.v2", 1],
    ["science.light.v1", "practice.science.light.v2", 1],
    ["geography.climate.v1", "practice.geography.climate.v2", 1],
  ] as const)("provides a different reviewed follow-up for %s", (topicId, nextId, correctOption) => {
    const first = getSeedPractice(topicId);
    const next = getSeedPractice(topicId, first.id);
    expect(next.id).toBe(nextId);
    expect(next.topicId).toBe(topicId);
    expect(next.id).not.toBe(first.id);
    expect(next.options).toHaveLength(4);
    expect(next).not.toHaveProperty("correctOption");
    expect(gradeSeedPractice(next.id, correctOption, topicId)?.correct).toBe(true);
    const otherTopicId = topicId === "math.percent.v1"
      ? "science.light.v1"
      : "math.percent.v1";
    expect(gradeSeedPractice(next.id, correctOption, otherTopicId)).toBeNull();
  });

  it("grades on the server and teaches after either choice", () => {
    expect(gradeSeedPractice("practice.linear-equation.v1", 1))
      .toMatchObject({ correct: true, explanation: expect.stringContaining("x = ۴") });
    expect(gradeSeedPractice("practice.linear-equation.v1", 0))
      .toMatchObject({ correct: false });
    expect(gradeSeedPractice("unknown-question", 0)).toBeNull();
  });
});


describe("focused lesson review practice", () => {
  it("targets only a supported topic where the student asked for more help", () => {
    expect(getReviewPracticeTopic([
      { topicId: "math.percent.v1", lessonFeedback: "understood" },
      { topicId: "science.light.v1", lessonFeedback: "needs_help" },
    ])).toBe("science.light.v1");
    expect(getReviewPracticeTopic([
      { topicId: "unreviewed.topic", lessonFeedback: "needs_help" },
      { topicId: "math.percent.v1", lessonFeedback: null },
    ])).toBeNull();
  });
});

describe("student next study recommendation", () => {
  it("recommends only an explicitly saved topic that needs guidance", () => {
    expect(recommendNextStudyStep([
      { topicId: "math.percent.v1", practiceAttemptCount: 2, practiceNeedsGuidance: false },
      { topicId: "math.linear-equation.v1", practiceAttemptCount: 1, practiceNeedsGuidance: true, lessonFeedback: null },
    ])).toMatchObject({
      topicId: "math.linear-equation.v1",
      prompt: expect.stringContaining("معادله"),
      explanation: expect.stringContaining("۳x + ۵ = ۱۷"),
    });
    expect(recommendNextStudyStep([
      { topicId: "math.fractions.add.v1", practiceAttemptCount: 1, practiceNeedsGuidance: true },
    ])?.explanation).toContain("۵/۶");
    expect(recommendNextStudyStep([
      { topicId: "math.percent.v1", practiceAttemptCount: 1, practiceNeedsGuidance: true },
    ])?.explanation).toContain("۲۰٪");
    expect(recommendNextStudyStep([
      { topicId: "science.light.v1", practiceAttemptCount: 1, practiceNeedsGuidance: true },
    ])?.explanation).toContain("عدسی محدب");
    expect(recommendNextStudyStep([
      { topicId: "geography.climate.v1", practiceAttemptCount: 1, practiceNeedsGuidance: true },
    ])?.explanation).toContain("اقلیم");
  });

  it("stops recommending a lesson after the student records that they understood it", () => {
    expect(recommendNextStudyStep([{
      topicId: "math.linear-equation.v1", practiceAttemptCount: 1,
      practiceNeedsGuidance: true, lessonFeedback: "understood",
    }])).toBeNull();
  });

  it("does not recommend without a saved need for guidance or for unsupported topics", () => {
    expect(recommendNextStudyStep([
      { topicId: "science.light.v1", practiceAttemptCount: 1, practiceNeedsGuidance: false },
      { topicId: "unreviewed.topic", practiceAttemptCount: 1, practiceNeedsGuidance: true },
    ])).toBeNull();
    expect(getStudyPrompt("unreviewed.topic")).toBeNull();
  });
});

describe("consent-based tutor response guidance", () => {
  it("adds only reviewed topic guidance after a saved outcome requests help", () => {
    const answer = answerFromSeedCorpus("معادله را چطور حل کنم؟");
    if (!answer) throw new Error("expected a starter answer");
    const plain = applySeedPracticeGuidance(answer, false);
    expect(plain).not.toHaveProperty("guidedHint");

    const guided = applySeedPracticeGuidance(answer, true);
    expect(guided.guidedHint).toBe(getSeedPractice(answer.source.id).guidedHint);
    expect(guided.source).toEqual(answer.source);
    expect(guided.answer).toBe(answer.answer);
  });
});
