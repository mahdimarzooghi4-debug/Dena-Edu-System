import { and, eq } from "drizzle-orm";
import { getDb } from "../../db";
import {
  memberships, roleApplicationEvents, roleApplications, user, verifiedEntities,
} from "../../db/schema";
import type { RoleApplicationDecision } from "./role-application-contracts";

type ReviewFailure =
  | "not_found" | "already_reviewed" | "self_review"
  | "reviewer_revoked" | "unverified_target" | "already_member";

export class ReviewRoleError extends Error {
  constructor(readonly kind: ReviewFailure) { super(kind); }
}

/**
 * The actor ID is supplied ONLY from Better Auth's server-verified session.
 * A transactional, row-locked admin check ensures suspension cannot race a
 * decision. A new scope UUID comes from the DB, not the applicant or reviewer.
 */
export async function reviewRoleApplication(
  reviewerId: string,
  requestId: string,
  decision: RoleApplicationDecision,
) {
  return getDb().transaction(async (tx) => {
    const [admin] = await tx.select({ id: memberships.id }).from(memberships)
      .where(and(
        eq(memberships.userId, reviewerId),
        eq(memberships.role, "admin"),
        eq(memberships.status, "active"),
      )).limit(1).for("share");
    if (!admin) throw new ReviewRoleError("reviewer_revoked");

    const [application] = await tx.select().from(roleApplications)
      .where(eq(roleApplications.id, requestId)).limit(1).for("update");
    if (!application) throw new ReviewRoleError("not_found");
    if (application.userId === reviewerId) throw new ReviewRoleError("self_review");
    if (application.status !== "pending") throw new ReviewRoleError("already_reviewed");

    let scopeId: string | null = null;
    if (decision.action === "approve") {
      const [target] = await tx.select({
        verified: user.phoneNumberVerified, mobile: user.phoneNumber,
      }).from(user).where(eq(user.id, application.userId)).limit(1).for("share");
      if (!target?.verified || !target.mobile) {
        throw new ReviewRoleError("unverified_target");
      }

      const [existing] = await tx.select({ id: memberships.id }).from(memberships)
        .where(and(
          eq(memberships.userId, application.userId),
          eq(memberships.role, application.requestedRole),
        )).limit(1);
      if (existing) throw new ReviewRoleError("already_member");

      const [scope] = await tx.insert(verifiedEntities).values({
        role: application.requestedRole,
        name: decision.verifiedName,
        evidenceReference: decision.evidenceReference,
        verifiedByUserId: reviewerId,
      }).returning({ id: verifiedEntities.id });
      scopeId = scope.id;

      const scopedMembership = {
        instituteId: application.requestedRole === "institute" ? scopeId : null,
        providerId: application.requestedRole === "provider" ? scopeId : null,
        organizationId: application.requestedRole === "organization" ? scopeId : null,
        benefactorId: application.requestedRole === "benefactor" ? scopeId : null,
      };
      await tx.insert(memberships).values({
        userId: application.userId, role: application.requestedRole,
        ...scopedMembership,
      });
    }

    await tx.update(roleApplications).set({
      status: decision.action === "approve" ? "approved" : "rejected",
      reviewerUserId: reviewerId,
      reviewedAt: new Date(),
      decisionReason: decision.reason,
      assignedScopeId: scopeId,
    }).where(eq(roleApplications.id, application.id));

    await tx.insert(roleApplicationEvents).values({
      applicationId: application.id,
      actorUserId: reviewerId,
      kind: decision.action === "approve" ? "approved" : "rejected",
      assignedScopeId: scopeId,
    });

    return {
      id: application.id,
      status: decision.action === "approve" ? "approved" : "rejected",
      role: application.requestedRole,
    };
  });
}
