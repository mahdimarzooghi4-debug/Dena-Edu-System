import { and, eq, inArray, isNull } from "drizzle-orm";
import { getDb } from "../../db";
import {
  auditLogs, memberships, organizationApiKeys, organizationStudents, user, verifiedEntities,
} from "../../db/schema";
import { temporaryPhoneEmail } from "../auth/phone";
import {
  encryptNationalCode, nationalCodeTenantHash, type OrganizationStudentInput,
} from "./student-contracts";

export type StudentSource = "manual" | "bulk" | "api";
export class OrganizationStudentError extends Error {
  constructor(readonly kind: "scope_unavailable" | "duplicate" | "student_membership_blocked") {
    super(kind);
  }
}

/** Rechecks active organization membership in the transaction before writes.
 * All PII is stored only on the tenant-scoped roster row.
 */
export async function createOrganizationStudent(input: {
  actorUserId: string;
  organizationId: string;
  record: OrganizationStudentInput;
  source: StudentSource;
  guardianConsentConfirmed: true;
  apiKeyId?: string;
}) {
  const db = getDb();
  const nationalCodeHash = nationalCodeTenantHash(input.organizationId, input.record.nationalCode);
  return db.transaction(async (tx) => {
    const [membership] = await tx.select({ id: memberships.id }).from(memberships)
      .innerJoin(verifiedEntities, and(
        eq(verifiedEntities.id, memberships.organizationId),
        eq(verifiedEntities.role, "organization"),
      )).where(and(
        eq(memberships.userId, input.actorUserId),
        eq(memberships.role, "organization"),
        eq(memberships.organizationId, input.organizationId),
        eq(memberships.status, "active"),
      )).limit(1).for("share");
    if (!membership) throw new OrganizationStudentError("scope_unavailable");

    if (input.apiKeyId) {
      const [key] = await tx.select({ id: organizationApiKeys.id }).from(organizationApiKeys)
        .where(and(
          eq(organizationApiKeys.id, input.apiKeyId),
          eq(organizationApiKeys.organizationId, input.organizationId),
          eq(organizationApiKeys.createdByUserId, input.actorUserId),
          isNull(organizationApiKeys.revokedAt),
        )).limit(1).for("share");
      if (!key) throw new OrganizationStudentError("scope_unavailable");
      await tx.update(organizationApiKeys).set({ lastUsedAt: new Date() })
        .where(eq(organizationApiKeys.id, key.id));
    }

    const [duplicateNationalCode] = await tx.select({ id: organizationStudents.id })
      .from(organizationStudents).where(and(
        eq(organizationStudents.organizationId, input.organizationId),
        eq(organizationStudents.nationalCodeHash, nationalCodeHash),
      )).limit(1);
    if (duplicateNationalCode) throw new OrganizationStudentError("duplicate");

    const email = temporaryPhoneEmail(input.record.phoneNumber);
    const inserted = await tx.insert(user).values({
      name: `${input.record.firstName} ${input.record.lastName}`,
      email,
      phoneNumber: input.record.phoneNumber,
      phoneNumberVerified: false,
    }).onConflictDoNothing().returning({ id: user.id });
    const [principal] = inserted.length ? inserted : await tx.select({ id: user.id })
      .from(user).where(eq(user.phoneNumber, input.record.phoneNumber)).limit(1);
    if (!principal) throw new OrganizationStudentError("duplicate");
    const [existingRosterEntry] = await tx.select({ id: organizationStudents.id })
      .from(organizationStudents).where(and(
        eq(organizationStudents.organizationId, input.organizationId),
        eq(organizationStudents.userId, principal.id),
      )).limit(1);
    if (existingRosterEntry) throw new OrganizationStudentError("duplicate");

    const [studentRole] = await tx.select({ status: memberships.status }).from(memberships)
      .where(and(eq(memberships.userId, principal.id), eq(memberships.role, "student")))
      .limit(1).for("share");
    if (studentRole && studentRole.status !== "active") {
      throw new OrganizationStudentError("student_membership_blocked");
    }
    if (!studentRole) {
      await tx.insert(memberships).values({ userId: principal.id, role: "student" })
        .onConflictDoNothing();
      const [activeRole] = await tx.select({ status: memberships.status }).from(memberships)
        .where(and(eq(memberships.userId, principal.id), eq(memberships.role, "student")))
        .limit(1);
      if (activeRole?.status !== "active") {
        throw new OrganizationStudentError("student_membership_blocked");
      }
    }

    const [student] = await tx.insert(organizationStudents).values({
      organizationId: input.organizationId,
      userId: principal.id,
      firstName: input.record.firstName,
      lastName: input.record.lastName,
      nationalCodeCiphertext: encryptNationalCode(input.record.nationalCode),
      nationalCodeHash,
      nationalCodeLast4: input.record.nationalCode.slice(-4),
      birthDate: input.record.birthDate,
      gender: input.record.gender,
      email: input.record.email || null,
      createdByUserId: input.actorUserId,
      guardianConsentConfirmedAt: new Date(),
      guardianConsentConfirmedByUserId: input.actorUserId,
      source: input.source,
    }).returning({ id: organizationStudents.id });

    await tx.insert(auditLogs).values({
      actorId: input.actorUserId,
      actorRole: "organization",
      action: `organization.student.${input.source}.created`,
      entityType: "ORGANIZATION_STUDENT",
      entityId: student.id,
    });
    return student;
  });
}

export async function listOrganizationStudents(organizationIds: string[]) {
  if (!organizationIds.length) return [];
  return getDb().select({
    id: organizationStudents.id,
    organizationId: organizationStudents.organizationId,
    firstName: organizationStudents.firstName,
    lastName: organizationStudents.lastName,
    nationalCodeLast4: organizationStudents.nationalCodeLast4,
    birthDate: organizationStudents.birthDate,
    gender: organizationStudents.gender,
    email: organizationStudents.email,
    phoneNumber: user.phoneNumber,
    phoneNumberVerified: user.phoneNumberVerified,
    createdAt: organizationStudents.createdAt,
  }).from(organizationStudents).innerJoin(user, eq(user.id, organizationStudents.userId))
    .where(inArray(organizationStudents.organizationId, organizationIds))
    .orderBy(organizationStudents.createdAt);
}

/** Removes only the tenant roster record. The shared Dena login account and
 * student membership are deliberately retained for other valid contexts.
 */
export async function deleteOrganizationStudent(actorUserId: string, studentId: string) {
  return getDb().transaction(async (tx) => {
    const [student] = await tx.select({
      id: organizationStudents.id,
      organizationId: organizationStudents.organizationId,
    }).from(organizationStudents).innerJoin(memberships, and(
      eq(memberships.organizationId, organizationStudents.organizationId),
      eq(memberships.userId, actorUserId),
      eq(memberships.role, "organization"),
      eq(memberships.status, "active"),
    )).innerJoin(verifiedEntities, and(
      eq(verifiedEntities.id, memberships.organizationId),
      eq(verifiedEntities.role, "organization"),
    )).where(eq(organizationStudents.id, studentId)).limit(1).for("update");
    if (!student) return false;
    const [deleted] = await tx.delete(organizationStudents).where(and(
      eq(organizationStudents.id, student.id),
      eq(organizationStudents.organizationId, student.organizationId),
    )).returning({ id: organizationStudents.id });
    if (!deleted) return false;
    await tx.insert(auditLogs).values({
      actorId: actorUserId,
      actorRole: "organization",
      action: "organization.student.deleted",
      entityType: "ORGANIZATION_STUDENT",
      entityId: deleted.id,
    });
    return true;
  });
}
