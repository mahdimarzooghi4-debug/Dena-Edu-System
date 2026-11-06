import { describe, expect, it } from "vitest";
import { demoStudentWorkspace, gradeDemoPractice, isStudentDemoEnabled } from "./demo-app";

describe("explicitly isolated student demo", () => {
  it("is disabled by default and in production without an additional opt in", () => {
    expect(isStudentDemoEnabled({ NODE_ENV: "test" })).toBe(false);
    expect(isStudentDemoEnabled({ NODE_ENV: "production", DENA_DEMO_MODE: "enabled" })).toBe(false);
    expect(isStudentDemoEnabled({ NODE_ENV: "development", DENA_DEMO_MODE: "enabled" })).toBe(true);
  });
  it("returns synthetic only, never entitlements or payment claims", () => {
    expect(demoStudentWorkspace.courses.length).toBeGreaterThan(0);
    expect(gradeDemoPractice("practice-functions", 0)).toMatchObject({ correct: true, stored: false, mode: "synthetic" });
    expect(gradeDemoPractice("practice-functions", 1)).toMatchObject({ correct: false, stored: false });
    expect(gradeDemoPractice("missing", 0)).toBeNull();
    expect(gradeDemoPractice("practice-functions", 10)).toBeNull();
  });
});
