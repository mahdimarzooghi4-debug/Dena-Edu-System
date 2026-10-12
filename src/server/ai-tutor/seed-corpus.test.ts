import { describe, expect, it } from "vitest";
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

  it("grades on the server and teaches after either choice", () => {
    expect(gradeSeedPractice("practice.linear-equation.v1", 1))
      .toMatchObject({ correct: true, explanation: expect.stringContaining("x = ۴") });
    expect(gradeSeedPractice("practice.linear-equation.v1", 0))
      .toMatchObject({ correct: false });
    expect(gradeSeedPractice("unknown-question", 0)).toBeNull();
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
