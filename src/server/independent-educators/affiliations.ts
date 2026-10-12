import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "../../db";
import {
  auditLogs, courseOwnershipEvents, courses, educatorInstituteAffiliationEvents,
  educatorInstituteAffiliations, independentEducatorProfiles, memberships,
  supervisionGrants, user, verifiedEntities,
} from "../../db/schema";
import { auditLogRecord } from "../admin/audit";
import type {
  CreateEducatorAffiliationInput, EducatorAffiliationDecision,
} from "./contracts";

export type EducatorAffiliationFailure =
  | "account_unavailable" | "institute_unavailable" | "request_conflict"
  | "not_found" | "reviewer_unavailable" | "self_review"
  | "invalid_transition";

export class EducatorAffiliationError extends Error {
  constructor(readonly kind: EducatorAffiliationFailure) { super(kind); }
}

export async function getIndependentEducatorWorkspace(userId: string) {
  const [profile] = await getDb().select({
    id: independentEducatorProfiles.id,
    displayName: independentEducatorProfiles.displayName,
  }).from(independentEducatorProfiles)
    .where(eq(independentEducatorProfiles.userId, userId)).limit(1);

  const [institutes, affiliations] = await Promise.all([
    getDb().selectDistinct({
      id: verifiedEntities.id,
      name: verifiedEntities.name,
    }).from(verifiedEntities).innerJoin(memberships, and(
      eq(memberships.instituteId, verifiedEntities.id),
      eq(memberships.role, "institute"),
      eq(memberships.status, "active"),
    )).where(eq(verifiedEntities.role, "institute"))
      .orderBy(asc(verifiedEntities.name), asc(verifiedEntities.id)).limit(200),
    getDb().select({
      id: educatorInstituteAffiliations.id,
      instituteId: educatorInstituteAffiliations.instituteId,
      instituteName: verifiedEntities.name,
      displayName: educatorInstituteAffiliations.displayNameSnapshot,
      statement: educatorInstituteAffiliations.statement,
      status: educatorInstituteAffiliations.status,
      decisionReason: educatorInstituteAffiliations.decisionReason,
      createdAt: educatorInstituteAffiliations.createdAt,
      updatedAt: educatorInstituteAffiliations.updatedAt,
    }).from(educatorInstituteAffiliations)
      .innerJoin(independentEducatorProfiles, eq(
        independentEducatorProfiles.id,
        educatorInstituteAffiliations.educatorProfileId,
      )).innerJoin(verifiedEntities, and(
        eq(verifiedEntities.id, educatorInstituteAffiliations.instituteId),
        eq(verifiedEntities.role, "institute"),
      )).where(eq(independentEducatorProfiles.userId, userId))
      .orderBy(desc(educatorInstituteAffiliations.createdAt),
        desc(educatorInstituteAffiliations.id)).limit(100),
  ]);

  return { profile: profile ?? null, institutes, affiliations };
}

export async function getInstituteEducatorAffiliations(userId: string) {
  const instituteScopes = await getDb().selectDistinct({
    id: memberships.instituteId,
  }).from(memberships).where(and(
    eq(memberships.userId, userId), eq(memberships.role, "institute"),
    eq(memberships.status, "active"),
  ));
  const ids = instituteScopes.flatMap((scope) => scope.id ? [scope.id] : []);
  if (!ids.length) return [];
  return getDb().select({
    id: educatorInstituteAffiliations.id,
    instituteId: educatorInstituteAffiliations.instituteId,
    displayName: educatorInstituteAffiliations.displayNameSnapshot,
    statement: educatorInstituteAffiliations.statement,
    status: educatorInstituteAffiliations.status,
    decisionReason: educatorInstituteAffiliations.decisionReason,
    createdAt: educatorInstituteAffiliations.createdAt,
  }).from(educatorInstituteAffiliations)
    .innerJoin(independentEducatorProfiles, eq(
      independentEducatorProfiles.id,
      educatorInstituteAffiliations.educatorProfileId,
    )).where(and(
      inArray(educatorInstituteAffiliations.instituteId, ids),
      inArray(educatorInstituteAffiliations.status, ["requested", "approved"]),
    )).orderBy(asc(educatorInstituteAffiliations.status),
      desc(educatorInstituteAffiliations.createdAt)).limit(200);
}

export async function createEducatorAffiliation(
  userId: string, input: CreateEducatorAffiliationInput,
) {
  return getDb().transaction(async (tx) => {
    const [account] = await tx.select({
      id: user.id,
      phoneVerified: user.phoneNumberVerified,
    }).from(user).where(eq(user.id, userId)).limit(1).for("share");
    const [studentMembership] = await tx.select({ id: memberships.id })
      .from(memberships).where(and(
        eq(memberships.userId, userId), eq(memberships.role, "student"),
        eq(memberships.status, "active"),
      )).limit(1).for("share");
    if (!account?.phoneVerified || !studentMembership) {
      throw new EducatorAffiliationError("account_unavailable");
    }

    const [institute] = await tx.select({ id: verifiedEntities.id })
      .from(verifiedEntities).innerJoin(memberships, and(
        eq(memberships.instituteId, verifiedEntities.id),
        eq(memberships.role, "institute"),
        eq(memberships.status, "active"),
      )).where(and(
        eq(verifiedEntities.id, input.instituteId),
        eq(verifiedEntities.role, "institute"),
      )).limit(1).for("share");
    if (!institute) throw new EducatorAffiliationError("institute_unavailable");

    let [profile] = await tx.select().from(independentEducatorProfiles)
      .where(eq(independentEducatorProfiles.userId, userId)).limit(1).for("update");
    if (!profile) {
      const [created] = await tx.insert(independentEducatorProfiles).values({
        userId, displayName: input.displayName,
      }).onConflictDoNothing({ target: independentEducatorProfiles.userId })
        .returning();
      profile = created;
      if (!profile) {
        [profile] = await tx.select().from(independentEducatorProfiles)
          .where(eq(independentEducatorProfiles.userId, userId)).limit(1).for("update");
      }
    } else if (profile.displayName !== input.displayName) {
      [profile] = await tx.update(independentEducatorProfiles).set({
        displayName: input.displayName, updatedAt: new Date(),
      }).where(eq(independentEducatorProfiles.id, profile.id)).returning();
    }
    if (!profile) throw new EducatorAffiliationError("account_unavailable");

    const [replay] = await tx.select().from(educatorInstituteAffiliations)
      .where(and(
        eq(educatorInstituteAffiliations.educatorProfileId, profile.id),
        eq(educatorInstituteAffiliations.clientRequestId, input.clientRequestId),
      )).limit(1).for("share");
    if (replay) {
      if (replay.instituteId !== input.instituteId || replay.requestedByUserId !== userId ||
          replay.displayNameSnapshot !== input.displayName ||
          replay.statement !== input.statement) {
        throw new EducatorAffiliationError("request_conflict");
      }
      return { id: replay.id, status: replay.status, replayed: true };
    }

    const [active] = await tx.select({ id: educatorInstituteAffiliations.id })
      .from(educatorInstituteAffiliations).where(and(
        eq(educatorInstituteAffiliations.educatorProfileId, profile.id),
        eq(educatorInstituteAffiliations.instituteId, input.instituteId),
        inArray(educatorInstituteAffiliations.status, ["requested", "approved"]),
      )).limit(1).for("share");
    if (active) throw new EducatorAffiliationError("request_conflict");

    const [created] = await tx.insert(educatorInstituteAffiliations).values({
      educatorProfileId: profile.id,
      instituteId: input.instituteId,
      requestedByUserId: userId,
      clientRequestId: input.clientRequestId,
      displayNameSnapshot: input.displayName,
      statement: input.statement,
    }).returning({
      id: educatorInstituteAffiliations.id,
      status: educatorInstituteAffiliations.status,
    });
    await tx.insert(educatorInstituteAffiliationEvents).values({
      affiliationId: created!.id, actorUserId: userId, kind: "requested",
    });
    await tx.insert(auditLogs).values(auditLogRecord({
      actorId: userId, actorRole: "student",
      action: "educator.affiliation.requested",
      entityType: "EDUCATOR_AFFILIATION", entityId: created!.id,
    }));
    return { ...created!, replayed: false };
  });
}

export async function decideEducatorAffiliation(
  reviewerUserId: string, affiliationId: string, decision: EducatorAffiliationDecision,
) {
  return getDb().transaction(async (tx) => {
    const [affiliation] = await tx.select().from(educatorInstituteAffiliations)
      .where(eq(educatorInstituteAffiliations.id, affiliationId))
      .limit(1).for("update");
    if (!affiliation) throw new EducatorAffiliationError("not_found");

    const [reviewer] = await tx.select({ id: memberships.id })
      .from(memberships).where(and(
        eq(memberships.userId, reviewerUserId),
        eq(memberships.role, "institute"),
        eq(memberships.instituteId, affiliation.instituteId),
        eq(memberships.status, "active"),
      )).limit(1).for("share");
    if (!reviewer) throw new EducatorAffiliationError("reviewer_unavailable");
    if (affiliation.requestedByUserId === reviewerUserId) {
      throw new EducatorAffiliationError("self_review");
    }

    const nextStatus = decision.action === "approve" ? "approved"
      : decision.action === "reject" ? "rejected" : "revoked";
    const valid = decision.action === "revoke"
      ? affiliation.status === "approved"
      : affiliation.status === "requested";
    if (!valid) throw new EducatorAffiliationError("invalid_transition");

    if (decision.action === "revoke") {
      const ownedCourses = await tx.select().from(courses).where(and(
        eq(courses.ownerType, "independent_educator"),
        eq(courses.independentEducatorProfileId, affiliation.educatorProfileId),
        eq(courses.responsibleInstituteId, affiliation.instituteId),
      )).orderBy(asc(courses.id)).for("update");
      for (const course of ownedCourses) {
        const [grant] = await tx.select().from(supervisionGrants)
          .where(eq(supervisionGrants.courseId, course.id))
          .limit(1).for("update");
        if (!grant || grant.ownerType !== "independent_educator" ||
            grant.independentEducatorProfileId !== affiliation.educatorProfileId ||
            grant.instituteId !== affiliation.instituteId) {
          throw new EducatorAffiliationError("invalid_transition");
        }
        // Delete/recreate the current grant inside this transaction so the
        // composite owner FK remains immediate and no intermediate state is visible.
        await tx.delete(supervisionGrants).where(eq(supervisionGrants.courseId, course.id));
        await tx.update(courses).set({
          ownerType: "institute",
          independentEducatorProfileId: null,
        }).where(eq(courses.id, course.id));
        await tx.insert(supervisionGrants).values({
          courseId: grant.courseId,
          ownerType: "institute",
          providerId: null,
          independentEducatorProfileId: null,
          instituteId: grant.instituteId,
          status: grant.status,
          requestedByProviderUserId: grant.requestedByProviderUserId,
          requestedAt: grant.requestedAt,
          approvedByInstituteUserId: grant.approvedByInstituteUserId,
          approvedAt: grant.approvedAt,
        });
        await tx.insert(courseOwnershipEvents).values({
          courseId: course.id,
          sourceAffiliationId: affiliation.id,
          actorUserId: reviewerUserId,
          previousOwnerType: "independent_educator",
          previousEducatorProfileId: affiliation.educatorProfileId,
          nextOwnerType: "institute",
          instituteId: affiliation.instituteId,
          reason: decision.reason,
        });
        await tx.insert(auditLogs).values(auditLogRecord({
          actorId: reviewerUserId, actorRole: "institute",
          action: "institute.course_ownership.transferred",
          entityType: "COURSE", entityId: course.id,
        }));
      }
    }

    const now = new Date();
    await tx.update(educatorInstituteAffiliations).set({
      status: nextStatus,
      reviewedByUserId: reviewerUserId,
      reviewedAt: now,
      decisionReason: decision.reason,
      endedAt: decision.action === "revoke" ? now : null,
      updatedAt: now,
    }).where(eq(educatorInstituteAffiliations.id, affiliation.id));
    await tx.insert(educatorInstituteAffiliationEvents).values({
      affiliationId: affiliation.id,
      actorUserId: reviewerUserId,
      kind: nextStatus,
      reason: decision.reason,
    });
    await tx.insert(auditLogs).values(auditLogRecord({
      actorId: reviewerUserId, actorRole: "institute",
      action: `institute.educator_affiliation.${nextStatus}` as
        "institute.educator_affiliation.approved" |
        "institute.educator_affiliation.rejected" |
        "institute.educator_affiliation.revoked",
      entityType: "EDUCATOR_AFFILIATION", entityId: affiliation.id,
    }));
    return { id: affiliation.id, status: nextStatus };
  });
}

export async function withdrawEducatorAffiliation(userId: string, affiliationId: string) {
  return getDb().transaction(async (tx) => {
    const [affiliation] = await tx.select().from(educatorInstituteAffiliations)
      .where(eq(educatorInstituteAffiliations.id, affiliationId))
      .limit(1).for("update");
    if (!affiliation) throw new EducatorAffiliationError("not_found");
    const [profile] = await tx.select({ id: independentEducatorProfiles.id })
      .from(independentEducatorProfiles).where(and(
        eq(independentEducatorProfiles.id, affiliation.educatorProfileId),
        eq(independentEducatorProfiles.userId, userId),
      )).limit(1).for("share");
    if (!profile) throw new EducatorAffiliationError("reviewer_unavailable");
    if (affiliation.status !== "requested") {
      throw new EducatorAffiliationError("invalid_transition");
    }
    const now = new Date();
    await tx.update(educatorInstituteAffiliations).set({
      status: "withdrawn", withdrawnAt: now, updatedAt: now,
    }).where(eq(educatorInstituteAffiliations.id, affiliation.id));
    await tx.insert(educatorInstituteAffiliationEvents).values({
      affiliationId: affiliation.id,
      actorUserId: userId,
      kind: "withdrawn",
      reason: "درخواست همکاری توسط متقاضی پس گرفته شد",
    });
    await tx.insert(auditLogs).values(auditLogRecord({
      actorId: userId, actorRole: "student",
      action: "educator.affiliation.withdrawn",
      entityType: "EDUCATOR_AFFILIATION", entityId: affiliation.id,
    }));
    return { id: affiliation.id, status: "withdrawn" as const };
  });
}
