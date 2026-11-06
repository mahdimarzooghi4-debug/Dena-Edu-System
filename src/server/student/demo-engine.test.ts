import { describe, expect, it } from "vitest";
import { applyDemoAction, decodeDemoState, encodeDemoState, freshDemoState, DemoInputError } from "./demo-engine";

describe("signed and isolated synthetic student workflows", () => {
  it("starts with no membership or formal results", () => {
    const state = freshDemoState();
    expect(state.elite.status).toBe("not_registered");
    expect(state.services).toEqual({});
    expect(state.attempts).toEqual({});
  });
  it("enforces evaluation transitions and does not grant membership", () => {
    let state = freshDemoState();
    expect(() => applyDemoAction(state, { type: "submitEvaluation" })).toThrow(DemoInputError);
    state = applyDemoAction(state, { type: "applyElite" }).state;
    state = applyDemoAction(state, { type: "startEvaluation" }).state;
    for (const questionId of ["motivation", "learning", "interests"]) {
      state = applyDemoAction(state, { type: "answerEvaluation", questionId, choice: 1 }).state;
    }
    state = applyDemoAction(state, { type: "submitEvaluation" }).state;
    expect(state.elite.status).toBe("pending");
    expect(() => applyDemoAction(state, { type: "applyElite" })).toThrow();
  });
  it("records only a synthetic lesson and practice", () => {
    let state = applyDemoAction(freshDemoState(), { type: "completeLesson", lesson: "math-10:1" }).state;
    state = applyDemoAction(state, { type: "attempt", assessmentId: "practice-functions", choice: 0 }).state;
    expect(state.completed).toEqual(["math-10:1"]);
    expect(state.attempts["practice-functions"]).toEqual({ choice: 0, correct: true });
    expect(() => applyDemoAction(state, { type: "completeLesson", lesson: "math-10:20" })).toThrow();
  });
  it("supports synthetic service, support and profile updates with constraints", () => {
    let state = applyDemoAction(freshDemoState(), { type: "requestService", kind: "welfare" }).state;
    state = applyDemoAction(state, { type: "createTicket", subject: "مشکل ورود نمونه", message: "برای این درس به راهنمایی نیاز دارم." }).state;
    state = applyDemoAction(state, { type: "updateProfile", name: "دانش‌آموز تست", grade: "دهم ریاضی" }).state;
    expect(state.tickets).toHaveLength(1);
    expect(state.services.welfare).toBe("requested");
    expect(state.name).toBe("دانش‌آموز تست");
    expect(() => applyDemoAction(state, { type: "requestService", kind: "welfare" })).toThrow();
  });
  it("rejects invalid and tampered state, supports reset", () => {
    const state = applyDemoAction(freshDemoState(), { type: "completeLesson", lesson: "math-10:1" }).state;
    const token = encodeDemoState(state);
    expect(decodeDemoState(token).completed).toEqual(["math-10:1"]);
    expect(decodeDemoState(token.slice(0,-4)+"ffff").completed).toEqual([]);
    expect(applyDemoAction(state, { type: "reset" }).state.completed).toEqual([]);
    expect(() => applyDemoAction(state, { type: "createTicket", subject: "<", message: "short" })).toThrow();
  });
});
