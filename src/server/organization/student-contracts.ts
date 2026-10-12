import { createCipheriv, createHmac, hkdfSync, randomBytes } from "node:crypto";
import { z } from "zod";
import { isCanonicalIranMobile } from "../../lib/phone-number";

export const studentInputSchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(100),
  nationalCode: z.string().trim().regex(/^\d{10}$/),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value &&
      date <= new Date(new Date().toISOString().slice(0, 10));
  }),
  gender: z.enum(["female", "male", "prefer_not_to_say"]),
  phoneNumber: z.string().refine(isCanonicalIranMobile),
  email: z.union([z.string().trim().email().max(254), z.literal("")]).optional(),
}).strict().superRefine((record, ctx) => {
  if (!isValidIranNationalCode(record.nationalCode)) {
    ctx.addIssue({ code: "custom", path: ["nationalCode"], message: "invalid_national_code" });
  }
});

export const apiStudentInputSchema = studentInputSchema.extend({
  guardianConsentConfirmed: z.literal(true),
}).strict();

export type OrganizationStudentInput = z.infer<typeof studentInputSchema>;

export function isValidIranNationalCode(code: string): boolean {
  if (!/^\d{10}$/.test(code) || /^([0-9])\1{9}$/.test(code)) return false;
  const check = Number(code[9]);
  const sum = code.slice(0, 9).split("").reduce(
    (total, digit, index) => total + Number(digit) * (10 - index), 0,
  ) % 11;
  return sum < 2 ? check === sum : check === 11 - sum;
}

function derivedKey(info: string, salt: string): Buffer {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret || secret.length < 32) throw new Error("Student identity encryption is unavailable");
  return Buffer.from(hkdfSync("sha256", Buffer.from(secret), Buffer.from(salt), Buffer.from(info), 32));
}

export function encryptNationalCode(code: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", derivedKey("national-code-encryption", "dena-org-student:v1"), iv);
  const ciphertext = Buffer.concat([cipher.update(code, "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), ciphertext.toString("base64url")].join(".");
}

export function nationalCodeTenantHash(organizationId: string, code: string): string {
  const key = derivedKey("national-code-lookup", "dena-org-student:v1");
  return createHmac("sha256", key).update(organizationId).update(":").update(code).digest("hex");
}
