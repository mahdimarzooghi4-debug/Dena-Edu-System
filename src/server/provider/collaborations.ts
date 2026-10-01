import { and, asc, desc, eq, inArray, isNotNull, ne, notExists, or } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { getDb } from "../../db";
import {
  auditLogs, memberships, providerInstituteCollaborationEvents,
  providerInstituteCollaborations, verifiedEntities,
} from "../../db/schema";
import { auditLogRecord } from "../admin/audit";
import type { CollaborationDecision } from "./collaboration-contracts";

export type CollaborationWorkflowFailure =
  | "provider_unavailable" | "institute_unavailable" | "request_conflict"
  | "not_found" | "reviewer_unavailable" | "conflicted_reviewer"
  | "invalid_transition";

export class CollaborationWorkflowError extends Error {
  constructor(readonly kind: CollaborationWorkflowFailure) { super(kind); }
}

export async function getProviderCollaborations(userId: string) {
  const db = getDb();
  const scopes = await db.select({ id: memberships.providerId }).from(memberships)
    .where(and(eq(memberships.userId, userId), eq(memberships.role, "provider"),
      eq(memberships.status, "active")));
  const providerIds = [...new Set(scopes.flatMap((item) => item.id ? [item.id] : []))];
  if (!providerIds.length) return { institutes: [], collaborations: [] };
  const activeInstituteScopes = await db.select({ id: memberships.instituteId }).from(memberships)
    .where(and(eq(memberships.role, "institute"), eq(memberships.status, "active"),
      isNotNull(memberships.instituteId)));
  const instituteIds = [...new Set(activeInstituteScopes.flatMap((item) => item.id ? [item.id] : []))];

  const [institutes, collaborations] = await Promise.all([
    instituteIds.length ? db.select({ id: verifiedEntities.id, name: verifiedEntities.name })
      .from(verifiedEntities).where(and(eq(verifiedEntities.role, "institute"),
        inArray(verifiedEntities.id, instituteIds)))
      .orderBy(asc(verifiedEntities.name), asc(verifiedEntities.id)).limit(200) : Promise.resolve([]),
    db.select({
      id: providerInstituteCollaborations.id,
      providerId: providerInstituteCollaborations.providerId,
      instituteId: providerInstituteCollaborations.instituteId,
      instituteName: verifiedEntities.name,
      status: providerInstituteCollaborations.status,
      instituteDecisionReason: providerInstituteCollaborations.instituteDecisionReason,
      denaDecisionReason: providerInstituteCollaborations.denaDecisionReason,
      createdAt: providerInstituteCollaborations.createdAt,
      updatedAt: providerInstituteCollaborations.updatedAt,
    }).from(providerInstituteCollaborations).innerJoin(verifiedEntities, and(
      eq(verifiedEntities.id, providerInstituteCollaborations.instituteId),
      eq(verifiedEntities.role, "institute"),
    )).where(inArray(providerInstituteCollaborations.providerId, providerIds))
      .orderBy(desc(providerInstituteCollaborations.createdAt), desc(providerInstituteCollaborations.id)).limit(100),
  ]);
  return { institutes, collaborations };
}

export async function getInstituteCollaborations(userId: string) {
  const scopes = await getDb().select({ id: memberships.instituteId }).from(memberships)
    .where(and(eq(memberships.userId, userId), eq(memberships.role, "institute"),
      eq(memberships.status, "active")));
  const instituteIds = [...new Set(scopes.flatMap((item) => item.id ? [item.id] : []))];
  if (!instituteIds.length) return [];
  const providerEntity = alias(verifiedEntities, "collaboration_provider_entity");
  return getDb().select({
    id: providerInstituteCollaborations.id,
    providerId: providerInstituteCollaborations.providerId,
    providerName: providerEntity.name,
    instituteId: providerInstituteCollaborations.instituteId,
    status: providerInstituteCollaborations.status,
    createdAt: providerInstituteCollaborations.createdAt,
    instituteDecisionReason: providerInstituteCollaborations.instituteDecisionReason,
    denaDecisionReason: providerInstituteCollaborations.denaDecisionReason,
  }).from(providerInstituteCollaborations).innerJoin(providerEntity, and(
    eq(providerEntity.id, providerInstituteCollaborations.providerId),
    eq(providerEntity.role, "provider"),
  )).where(inArray(providerInstituteCollaborations.instituteId, instituteIds))
    .orderBy(asc(providerInstituteCollaborations.status), desc(providerInstituteCollaborations.createdAt))
    .limit(100);
}

export async function getDenaCollaborationQueue() {
  const providerEntity = alias(verifiedEntities, "collaboration_provider_entity");
  const instituteEntity = alias(verifiedEntities, "collaboration_institute_entity");
  return getDb().select({
    id: providerInstituteCollaborations.id,
    providerId: providerInstituteCollaborations.providerId,
    providerName: providerEntity.name,
    instituteId: providerInstituteCollaborations.instituteId,
    instituteName: instituteEntity.name,
    requestedAt: providerInstituteCollaborations.createdAt,
    instituteDecisionReason: providerInstituteCollaborations.instituteDecisionReason,
  }).from(providerInstituteCollaborations)
    .innerJoin(providerEntity, and(
      eq(providerEntity.id, providerInstituteCollaborations.providerId),
      eq(providerEntity.role, "provider"),
    )).innerJoin(instituteEntity, and(
      eq(instituteEntity.id, providerInstituteCollaborations.instituteId),
      eq(instituteEntity.role, "institute"),
    )).where(eq(providerInstituteCollaborations.status, "awaiting_dena"))
    .orderBy(asc(providerInstituteCollaborations.createdAt), asc(providerInstituteCollaborations.id)).limit(100);
}

export async function createProviderCollaboration(
  userId: string, input: { providerId: string; instituteId: string; clientRequestId: string },
) {
  return getDb().transaction(async (tx) => {
    const [providerMembership] = await tx.select({ id: memberships.id }).from(memberships)
      .where(and(eq(memberships.userId, userId), eq(memberships.role, "provider"),
        eq(memberships.providerId, input.providerId), eq(memberships.status, "active")))
      .limit(1).for("share");
    if (!providerMembership) throw new CollaborationWorkflowError("provider_unavailable");

    const [providerEntity] = await tx.select({ id: verifiedEntities.id })
      .from(verifiedEntities).where(and(eq(verifiedEntities.id, input.providerId),
        eq(verifiedEntities.role, "provider"))).limit(1);
    if (!providerEntity) throw new CollaborationWorkflowError("provider_unavailable");
    const [instituteEntity] = await tx.select({ id: verifiedEntities.id })
      .from(verifiedEntities).where(and(eq(verifiedEntities.id, input.instituteId),
        eq(verifiedEntities.role, "institute"))).limit(1);
    if (!instituteEntity) throw new CollaborationWorkflowError("institute_unavailable");
    const providerRole = alias(memberships, "provider_collaboration_institute_overlap");
    const [independentInstitute] = await tx.select({ id: memberships.id }).from(memberships)
      .where(and(eq(memberships.role, "institute"),
        eq(memberships.instituteId, input.instituteId), eq(memberships.status, "active"),
        ne(memberships.userId, userId),
        notExists(tx.select({ id: providerRole.id }).from(providerRole).where(and(
          eq(providerRole.userId, memberships.userId),
          eq(providerRole.role, "provider"),
          eq(providerRole.providerId, input.providerId),
        ))))).limit(1).for("share");
    if (!independentInstitute) throw new CollaborationWorkflowError("institute_unavailable");

    const [existingRequest] = await tx.select({
      id: providerInstituteCollaborations.id,
      instituteId: providerInstituteCollaborations.instituteId,
      requestedByUserId: providerInstituteCollaborations.requestedByUserId,
      status: providerInstituteCollaborations.status,
    }).from(providerInstituteCollaborations).where(and(
      eq(providerInstituteCollaborations.providerId, input.providerId),
      eq(providerInstituteCollaborations.clientRequestId, input.clientRequestId),
    )).limit(1).for("update");
    if (existingRequest) {
      if (existingRequest.instituteId !== input.instituteId ||
        existingRequest.requestedByUserId !== userId) {
        throw new CollaborationWorkflowError("request_conflict");
      }
      return { id: existingRequest.id, status: existingRequest.status, replayed: true };
    }

    const [created] = await tx.insert(providerInstituteCollaborations).values({
      providerId: input.providerId,
      instituteId: input.instituteId,
      requestedByUserId: userId,
      clientRequestId: input.clientRequestId,
    }).onConflictDoNothing().returning({
      id: providerInstituteCollaborations.id,
      status: providerInstituteCollaborations.status,
    });
    if (!created) throw new CollaborationWorkflowError("request_conflict");
    await tx.insert(providerInstituteCollaborationEvents).values({
      collaborationId: created.id, actorUserId: userId, kind: "requested",
    });
    await tx.insert(auditLogs).values(auditLogRecord({
      actorId: userId, actorRole: "provider", action: "provider.collaboration.requested",
      entityType: "PROVIDER_COLLABORATION", entityId: created.id,
    }));
    return { ...created, replayed: false };
  });
}

export async function decideInstituteCollaboration(
  userId: string, collaborationId: string, decision: CollaborationDecision,
) {
  return getDb().transaction(async (tx) => {
    const [record] = await tx.select().from(providerInstituteCollaborations)
      .where(eq(providerInstituteCollaborations.id, collaborationId)).limit(1).for("update");
    if (!record) throw new CollaborationWorkflowError("not_found");
    const [reviewer] = await tx.select({ id: memberships.id }).from(memberships)
      .where(and(eq(memberships.userId, userId), eq(memberships.role, "institute"),
        eq(memberships.instituteId, record.instituteId), eq(memberships.status, "active")))
      .limit(1).for("share");
    if (!reviewer) throw new CollaborationWorkflowError("reviewer_unavailable");
    const [conflictingProvider] = await tx.select({ id: memberships.id }).from(memberships)
      .where(and(eq(memberships.userId, userId), eq(memberships.role, "provider"),
        eq(memberships.providerId, record.providerId)));
    if (conflictingProvider || record.requestedByUserId === userId) {
      throw new CollaborationWorkflowError("conflicted_reviewer");
    }
    if (record.status !== "requested") throw new CollaborationWorkflowError("invalid_transition");

    const status = decision.action === "approve" ? "awaiting_dena" as const : "institute_rejected" as const;
    const eventKind = decision.action === "approve" ? "institute_approved" as const : "institute_rejected" as const;
    await tx.update(providerInstituteCollaborations).set({
      status,
      instituteReviewedByUserId: userId,
      instituteReviewedAt: new Date(),
      instituteDecisionReason: decision.reason,
      updatedAt: new Date(),
    }).where(eq(providerInstituteCollaborations.id, record.id));
    await tx.insert(providerInstituteCollaborationEvents).values({
      collaborationId: record.id, actorUserId: userId, kind: eventKind, reason: decision.reason,
    });
    await tx.insert(auditLogs).values(auditLogRecord({
      actorId: userId, actorRole: "institute",
      action: decision.action === "approve" ? "institute.provider_collaboration.accepted"
        : "institute.provider_collaboration.rejected",
      entityType: "PROVIDER_COLLABORATION", entityId: record.id,
    }));
    return { id: record.id, status };
  });
}

export async function decideDenaCollaboration(
  userId: string, collaborationId: string, decision: CollaborationDecision,
) {
  return getDb().transaction(async (tx) => {
    const [record] = await tx.select().from(providerInstituteCollaborations)
      .where(eq(providerInstituteCollaborations.id, collaborationId)).limit(1).for("update");
    if (!record) throw new CollaborationWorkflowError("not_found");
    const [admin] = await tx.select({ id: memberships.id }).from(memberships)
      .where(and(eq(memberships.userId, userId), eq(memberships.role, "admin"),
        eq(memberships.status, "active"))).limit(1).for("share");
    if (!admin) throw new CollaborationWorkflowError("reviewer_unavailable");
    const [conflictingMembership] = await tx.select({ id: memberships.id }).from(memberships)
      .where(and(eq(memberships.userId, userId), or(
        and(eq(memberships.role, "provider"), eq(memberships.providerId, record.providerId)),
        and(eq(memberships.role, "institute"), eq(memberships.instituteId, record.instituteId)),
      )));
    if (record.requestedByUserId === userId || record.instituteReviewedByUserId === userId ||
      conflictingMembership) throw new CollaborationWorkflowError("conflicted_reviewer");
    if (record.status !== "awaiting_dena") throw new CollaborationWorkflowError("invalid_transition");

    const status = decision.action === "approve" ? "approved" as const : "dena_rejected" as const;
    const eventKind = decision.action === "approve" ? "dena_approved" as const : "dena_rejected" as const;
    await tx.update(providerInstituteCollaborations).set({
      status,
      denaReviewedByUserId: userId,
      denaReviewedAt: new Date(),
      denaDecisionReason: decision.reason,
      updatedAt: new Date(),
    }).where(eq(providerInstituteCollaborations.id, record.id));
    await tx.insert(providerInstituteCollaborationEvents).values({
      collaborationId: record.id, actorUserId: userId, kind: eventKind, reason: decision.reason,
    });
    await tx.insert(auditLogs).values(auditLogRecord({
      actorId: userId, actorRole: "admin",
      action: decision.action === "approve" ? "admin.provider_collaboration.approved"
        : "admin.provider_collaboration.rejected",
      entityType: "PROVIDER_COLLABORATION", entityId: record.id,
    }));
    return { id: record.id, status };
  });
}
