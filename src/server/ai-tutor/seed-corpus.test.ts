import { describe, expect, it } from "vitest";
import { answerFromSeedCorpus, SEED_CORPUS_VERSION } from "./seed-corpus";

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
