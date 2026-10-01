import { beforeEach, describe, expect, it } from "vitest";
import {
  encryptNationalCode, isValidIranNationalCode, nationalCodeTenantHash,
  apiStudentInputSchema, studentInputSchema,
} from "./student-contracts";

describe("organization student identity contracts", () => {
  beforeEach(() => { process.env.BETTER_AUTH_SECRET = "test-only-secret-with-at-least-32-characters-long"; });

  it("validates national code checksums and the complete intake record", () => {
    expect(isValidIranNationalCode("1234567891")).toBe(true);
    expect(isValidIranNationalCode("1234567890")).toBe(false);
    const valid = studentInputSchema.safeParse({
      firstName: "سارا", lastName: "محمدی", nationalCode: "1234567891",
      birthDate: "2011-08-16", gender: "female", phoneNumber: "+989121234567",
    });
    expect(valid.success).toBe(true);
    expect(studentInputSchema.safeParse({
      firstName: "سارا", lastName: "محمدی", nationalCode: "1234567890",
      birthDate: "2011-08-16", gender: "female", phoneNumber: "+989121234567",
    }).success).toBe(false);
  });

  it("encrypts national codes with a fresh nonce and scopes duplicate hashes by organization", () => {
    const first = encryptNationalCode("1234567891");
    const second = encryptNationalCode("1234567891");
    expect(first).not.toContain("1234567891");
    expect(first).not.toBe(second);
    expect(nationalCodeTenantHash("org-a", "1234567891"))
      .not.toBe(nationalCodeTenantHash("org-b", "1234567891"));
  });

  it("requires an explicit organization attestation for guardian consent on API intake", () => {
    const student = {
      firstName: "سارا", lastName: "محمدی", nationalCode: "1234567891",
      birthDate: "2011-08-16", gender: "female", phoneNumber: "+989121234567",
    };
    expect(apiStudentInputSchema.safeParse(student).success).toBe(false);
    expect(apiStudentInputSchema.safeParse({ ...student, guardianConsentConfirmed: true }).success).toBe(true);
    expect(apiStudentInputSchema.safeParse({ ...student, guardianConsentConfirmed: false }).success).toBe(false);
  });
});
