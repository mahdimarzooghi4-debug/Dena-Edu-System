import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { APIError } from "better-auth/api";
import { and, eq, ne, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../../db";
import { auditLogs, memberships, phoneChangeChallenges, user } from "../../db/schema";
import { isCanonicalIranMobile } from "../../lib/phone-number";
import { auditLogRecord } from "../admin/audit";
import { reserveOtpDispatch, sendSmsOtp } from "../auth/phone";

export const studentPhoneChangeRequestSchema = z.object({
  phoneNumber: z.string().refine(isCanonicalIranMobile),
}).strict();
export const studentPhoneChangeVerifySchema = z.object({
  code: z.string().regex(/^\d{6}$/),
}).strict();

export class StudentPhoneChangeError extends Error {
  constructor(readonly kind:
    "student_unavailable" | "phone_unavailable" | "same_phone" |
    "challenge_unavailable" | "code_invalid" | "code_expired" |
    "rate_limited" | "sms_unavailable") {
    super(kind);
  }
}

const challengeLifetimeMs = 5 * 60 * 1000;
const maxAttempts = 3;

function challengeHash(userId: string, phoneNumber: string, code: string) {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret || secret.length < 32) throw new StudentPhoneChangeError("sms_unavailable");
  return createHmac("sha256", secret).update(`${userId}:${phoneNumber}:${code}`).digest("hex");
}

async function requireActiveStudent(userId: string) {
  const [membership] = await getDb().select({ id: memberships.id }).from(memberships)
    .where(and(eq(memberships.userId, userId), eq(memberships.role, "student"),
      eq(memberships.status, "active"))).limit(1);
  if (!membership) throw new StudentPhoneChangeError("student_unavailable");
}

export async function requestStudentPhoneChange(userId: string, phoneNumber: string) {
  const parsed = studentPhoneChangeRequestSchema.parse({ phoneNumber });
  await requireActiveStudent(userId);
  const db = getDb();
  const [account] = await db.select({
    phoneNumber: user.phoneNumber,
    phoneNumberVerified: user.phoneNumberVerified,
  }).from(user).where(eq(user.id, userId)).limit(1);
  if (!account?.phoneNumberVerified || !account.phoneNumber) {
    throw new StudentPhoneChangeError("student_unavailable");
  }
  if (account.phoneNumber === parsed.phoneNumber) throw new StudentPhoneChangeError("same_phone");
  const [owner] = await db.select({ id: user.id }).from(user)
    .where(eq(user.phoneNumber, parsed.phoneNumber)).limit(1);
  if (owner && owner.id !== userId) throw new StudentPhoneChangeError("phone_unavailable");

  try {
    // Share the normal per-target SMS budget and also cap requests per account,
    // so one signed-in user cannot fan out OTPs across many phone numbers.
    await reserveOtpDispatch(`phone-change:${userId}`);
    await reserveOtpDispatch(parsed.phoneNumber);
  } catch (error) {
    if (error instanceof APIError && error.status === 429) {
      throw new StudentPhoneChangeError("rate_limited");
    }
    throw new StudentPhoneChangeError("sms_unavailable");
  }

  const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
  const now = new Date();
  const [challenge] = await db.insert(phoneChangeChallenges).values({
    userId,
    phoneNumber: parsed.phoneNumber,
    codeHash: challengeHash(userId, parsed.phoneNumber, code),
    attempts: 0,
    expiresAt: new Date(now.getTime() + challengeLifetimeMs),
    updatedAt: now,
  }).onConflictDoUpdate({
    target: phoneChangeChallenges.userId,
    set: {
      phoneNumber: parsed.phoneNumber,
      codeHash: challengeHash(userId, parsed.phoneNumber, code),
      attempts: 0,
      expiresAt: new Date(now.getTime() + challengeLifetimeMs),
      updatedAt: now,
    },
  }).returning({ id: phoneChangeChallenges.id });
  try {
    await sendSmsOtp(parsed.phoneNumber, code, "dena-phone-change");
  } catch {
    await db.delete(phoneChangeChallenges).where(and(
      eq(phoneChangeChallenges.userId, userId), eq(phoneChangeChallenges.id, challenge!.id),
    ));
    throw new StudentPhoneChangeError("sms_unavailable");
  }
  return { expiresAt: new Date(now.getTime() + challengeLifetimeMs) };
}

export async function verifyStudentPhoneChange(userId: string, code: string) {
  const parsed = studentPhoneChangeVerifySchema.parse({ code });
  await requireActiveStudent(userId);
  try {
    const result = await getDb().transaction(async (tx) => {
      const [challenge] = await tx.select().from(phoneChangeChallenges)
        .where(eq(phoneChangeChallenges.userId, userId)).limit(1).for("update");
      if (!challenge) throw new StudentPhoneChangeError("challenge_unavailable");
      const now = new Date();
      if (challenge.expiresAt.getTime() <= now.getTime()) {
        await tx.delete(phoneChangeChallenges).where(eq(phoneChangeChallenges.id, challenge.id));
        return { verified: false as const, reason: "code_expired" as const };
      }
      if (challenge.attempts >= maxAttempts) throw new StudentPhoneChangeError("code_invalid");

      const submittedHash = Buffer.from(challengeHash(userId, challenge.phoneNumber, parsed.code), "hex");
      const savedHash = Buffer.from(challenge.codeHash, "hex");
      if (submittedHash.length !== savedHash.length || !timingSafeEqual(submittedHash, savedHash)) {
        await tx.update(phoneChangeChallenges).set({
          attempts: sql`${phoneChangeChallenges.attempts} + 1`, updatedAt: now,
        }).where(eq(phoneChangeChallenges.id, challenge.id));
        return { verified: false as const, reason: "code_invalid" as const };
      }

      const [owner] = await tx.select({ id: user.id }).from(user)
        .where(and(eq(user.phoneNumber, challenge.phoneNumber), ne(user.id, userId))).limit(1);
      if (owner) {
        await tx.delete(phoneChangeChallenges).where(eq(phoneChangeChallenges.id, challenge.id));
        return { verified: false as const, reason: "phone_unavailable" as const };
      }
      const [updated] = await tx.update(user).set({
        phoneNumber: challenge.phoneNumber,
        phoneNumberVerified: true,
        updatedAt: now,
      }).where(eq(user.id, userId)).returning({ id: user.id });
      if (!updated) throw new StudentPhoneChangeError("student_unavailable");
      await tx.delete(phoneChangeChallenges).where(eq(phoneChangeChallenges.id, challenge.id));
      await tx.insert(auditLogs).values(auditLogRecord({
        actorId: userId,
        actorRole: "student",
        action: "student.profile.phone_changed",
        entityType: "USER",
        entityId: userId,
      }));
      return { verified: true as const };
    });
    if (!result.verified && result.reason === "code_expired") {
      throw new StudentPhoneChangeError("code_expired");
    }
    return result;
  } catch (error) {
    if (error instanceof StudentPhoneChangeError) throw error;
    if (typeof error === "object" && error !== null && "code" in error && error.code === "23505") {
      throw new StudentPhoneChangeError("phone_unavailable");
    }
    throw error;
  }
}
