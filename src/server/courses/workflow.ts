import { and, eq, ne, notExists } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { getDb } from "../../db";
import {
  courses, memberships, supervisionEvents, supervisionGrants, verifiedEntities,
} from "../../db/schema";
import type { NewSupervisedCourse, SupervisionDecision } from "./contracts";

export type CourseWorkflowFailure =
  | "provider_not_active" | "institute_unavailable" | "scope_invalid"
  | "course_not_found" | "institute_not_active" | "conflicted_reviewer"
  | "invalid_transition" | "idempotency_conflict" | "legacy_grant";

export class CourseWorkflowError extends Error {
  constructor(readonly kind: CourseWorkflowFailure) { super(kind); }
}

/** Immutable per provider+clientRequestId: duplicate network retry returns the
 * SAME course, never inserts a second requested grant/event.
 */
export async function createSupervisedCourse(
  providerUserId: string, payload: NewSupervisedCourse,
) {
  return getDb().transaction(async (tx) => {
    const [provider] = await tx.select({ id: memberships.id })
      .from(memberships).where(and(
        eq(memberships.userId, providerUserId),
        eq(memberships.role, "provider"),
        eq(memberships.providerId, payload.providerId),
        eq(memberships.status, "active"),
      )).limit(1).for("share");
    if (!provider) throw new CourseWorkflowError("provider_not_active");

    // A verified role alone is not enough: institute must have an active,
    // INDEPENDENT representative. A request is NOT an institute approval.
    const [verifiedProvider] = await tx.select({ id: verifiedEntities.id })
      .from(verifiedEntities).where(and(
        eq(verifiedEntities.id, payload.providerId),
        eq(verifiedEntities.role, "provider"),
      )).limit(1);
    if (!verifiedProvider) throw new CourseWorkflowError("scope_invalid");

    const [verifiedInstitute] = await tx.select({ id: verifiedEntities.id })
      .from(verifiedEntities).where(and(
        eq(verifiedEntities.id, payload.responsibleInstituteId),
        eq(verifiedEntities.role, "institute"),
      )).limit(1);
    if (!verifiedInstitute) throw new CourseWorkflowError("institute_unavailable");

    const overlap = alias(memberships, "dena_provider_conflict");
    const [independentInstitute] = await tx.select({ id: memberships.id })
      .from(memberships).where(and(
        eq(memberships.role, "institute"),
        eq(memberships.instituteId, payload.responsibleInstituteId),
        eq(memberships.status, "active"),
        ne(memberships.userId, providerUserId),
        notExists(tx.select({ id: overlap.id }).from(overlap).where(and(
          eq(overlap.userId, memberships.userId),
          eq(overlap.role, "provider"),
          eq(overlap.providerId, payload.providerId),
        ))),
      )).limit(1).for("share");
    if (!independentInstitute) throw new CourseWorkflowError("institute_unavailable");

    const [created] = await tx.insert(courses).values({
      providerId: payload.providerId,
      responsibleInstituteId: payload.responsibleInstituteId,
      title: payload.title,
      createdByProviderUserId: providerUserId,
      clientRequestId: payload.clientRequestId,
    }).onConflictDoNothing({
      target: [courses.providerId, courses.clientRequestId],
    }).returning({ id: courses.id });
    if (!created) {
      const [existing] = await tx.select().from(courses).where(and(
        eq(courses.providerId, payload.providerId),
        eq(courses.clientRequestId, payload.clientRequestId),
      )).limit(1);
      if (!existing || existing.createdByProviderUserId !== providerUserId ||
          existing.title !== payload.title ||
          existing.responsibleInstituteId !== payload.responsibleInstituteId) {
        throw new CourseWorkflowError("idempotency_conflict");
      }
      const [grant] = await tx.select({ status: supervisionGrants.status })
        .from(supervisionGrants)
        .where(eq(supervisionGrants.courseId, existing.id)).limit(1);
      if (!grant) throw new CourseWorkflowError("legacy_grant");
      return { courseId: existing.id, status: grant.status, replayed: true };
    }

    await tx.insert(supervisionGrants).values({
      courseId: created.id,
      providerId: payload.providerId,
      instituteId: payload.responsibleInstituteId,
      requestedByProviderUserId: providerUserId,
      status: "requested",
    });
    await tx.insert(supervisionEvents).values({
      courseId: created.id,
      providerId: payload.providerId,
      instituteId: payload.responsibleInstituteId,
      actorUserId: providerUserId,
      kind: "requested",
    });
    return { courseId: created.id, status: "requested" as const, replayed: false };
  });
}

/** One mutable CURRENT grant; insert-only events preserve decision history.
 * course+grant are locked; institute membership is rechecked inside transaction
 * and cannot be suspended concurrently until this transaction finishes.
 */
export async function decideCourseSupervision(
  instituteUserId: string, courseId: string, decision: SupervisionDecision,
) {
  return getDb().transaction(async (tx) => {
    const [course] = await tx.select().from(courses)
      .where(eq(courses.id, courseId)).limit(1).for("update");
    if (!course) throw new CourseWorkflowError("course_not_found");

    const [institute] = await tx.select({ id: memberships.id }).from(memberships)
      .where(and(
        eq(memberships.userId, instituteUserId),
        eq(memberships.role, "institute"),
        eq(memberships.instituteId, course.responsibleInstituteId),
        eq(memberships.status, "active"),
      )).limit(1).for("share");
    if (!institute) throw new CourseWorkflowError("course_not_found");

    // Dual-role actors cannot approve or revoke their own provider's work.
    const [conflictingProvider] = await tx.select({ id: memberships.id })
      .from(memberships).where(and(
        eq(memberships.userId, instituteUserId),
        eq(memberships.role, "provider"),
        eq(memberships.providerId, course.providerId),
      )).limit(1);
    if (conflictingProvider) throw new CourseWorkflowError("conflicted_reviewer");

    const [grant] = await tx.select().from(supervisionGrants).where(and(
      eq(supervisionGrants.courseId, course.id),
      eq(supervisionGrants.providerId, course.providerId),
      eq(supervisionGrants.instituteId, course.responsibleInstituteId),
    )).limit(1).for("update");
    if (!grant || !grant.requestedByProviderUserId) {
      throw new CourseWorkflowError("legacy_grant");
    }
    if (grant.requestedByProviderUserId === instituteUserId) {
      throw new CourseWorkflowError("conflicted_reviewer");
    }
    if (decision.action === "approve" && grant.status !== "requested") {
      throw new CourseWorkflowError("invalid_transition");
    }
    if (decision.action === "revoke" &&
        !["requested", "approved"].includes(grant.status)) {
      throw new CourseWorkflowError("invalid_transition");
    }

    const nextStatus = decision.action === "approve" ? "approved" as const
      : "revoked" as const;
    const kind = decision.action === "approve" ? "approved" as const
      : grant.status === "requested" ? "rejected" as const : "revoked" as const;
    await tx.update(supervisionGrants).set({
      status: nextStatus,
      approvedByInstituteUserId: decision.action === "approve"
        ? instituteUserId : null,
      approvedAt: decision.action === "approve" ? new Date() : null,
    }).where(eq(supervisionGrants.courseId, course.id));
    await tx.insert(supervisionEvents).values({
      courseId: course.id,
      providerId: course.providerId,
      instituteId: course.responsibleInstituteId,
      actorUserId: instituteUserId,
      kind,
      reason: decision.reason,
    });
    return { courseId: course.id, status: nextStatus, decision: kind };
  });
}
