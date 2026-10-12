import { createHash, randomBytes } from "node:crypto";
import { and, eq, isNull, sql } from "drizzle-orm";
import { getDb } from "../../db";
import { auditLogs, memberships, organizationApiKeys, rateLimit, verifiedEntities } from "../../db/schema";

function secretHash(secret: string) {
  return createHash("sha256").update(secret).digest("hex");
}

function newSecret() {
  const material = randomBytes(32).toString("base64url");
  return `dena_org_${material}`;
}

export async function listOrganizationApiKeys(actorUserId: string, organizationId: string) {
  const rows = await getDb().select({
    id: organizationApiKeys.id,
    prefix: organizationApiKeys.prefix,
    label: organizationApiKeys.label,
    createdAt: organizationApiKeys.createdAt,
    lastUsedAt: organizationApiKeys.lastUsedAt,
    revokedAt: organizationApiKeys.revokedAt,
  }).from(organizationApiKeys).innerJoin(memberships, and(
    eq(memberships.organizationId, organizationApiKeys.organizationId),
    eq(memberships.userId, actorUserId),
    eq(memberships.role, "organization"),
    eq(memberships.status, "active"),
  )).where(eq(organizationApiKeys.organizationId, organizationId))
    .orderBy(organizationApiKeys.createdAt);
  return rows;
}

export async function createOrganizationApiKey(input: {
  actorUserId: string;
  organizationId: string;
  label: string;
  rotateFromKeyId?: string;
}) {
  const db = getDb();
  const secret = newSecret();
  const secretHashValue = secretHash(secret);
  const prefix = secret.slice(0, "dena_org_".length + 8);
  const created = await db.transaction(async (tx) => {
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
    if (!membership) return null;

    let rotatedFromKeyId: string | null = null;
    if (input.rotateFromKeyId) {
      const [old] = await tx.select({ id: organizationApiKeys.id })
        .from(organizationApiKeys).where(and(
          eq(organizationApiKeys.id, input.rotateFromKeyId),
          eq(organizationApiKeys.organizationId, input.organizationId),
          isNull(organizationApiKeys.revokedAt),
        )).limit(1).for("update");
      if (!old) return null;
      rotatedFromKeyId = old.id;
      await tx.update(organizationApiKeys).set({ revokedAt: new Date() })
        .where(eq(organizationApiKeys.id, old.id));
    }

    const [row] = await tx.insert(organizationApiKeys).values({
      organizationId: input.organizationId,
      secretHash: secretHashValue,
      prefix,
      label: input.label,
      createdByUserId: input.actorUserId,
      rotatedFromKeyId,
    }).returning({ id: organizationApiKeys.id });
    await tx.insert(auditLogs).values({
      actorId: input.actorUserId,
      actorRole: "organization",
      action: rotatedFromKeyId ? "organization.api_key.rotated" : "organization.api_key.created",
      entityType: "ORGANIZATION_API_KEY",
      entityId: row.id,
    });
    return row;
  });
  if (!created) return null;
  return { ...created, secret, prefix };
}

export async function revokeOrganizationApiKey(input: {
  actorUserId: string;
  organizationId: string;
  keyId: string;
}) {
  return getDb().transaction(async (tx) => {
    const [membership] = await tx.select({ id: memberships.id }).from(memberships)
      .where(and(
        eq(memberships.userId, input.actorUserId),
        eq(memberships.organizationId, input.organizationId),
        eq(memberships.role, "organization"),
        eq(memberships.status, "active"),
      )).limit(1).for("share");
    if (!membership) return false;
    const [revoked] = await tx.update(organizationApiKeys).set({ revokedAt: new Date() })
      .where(and(
        eq(organizationApiKeys.id, input.keyId),
        eq(organizationApiKeys.organizationId, input.organizationId),
        isNull(organizationApiKeys.revokedAt),
      )).returning({ id: organizationApiKeys.id });
    if (!revoked) return false;
    await tx.insert(auditLogs).values({
      actorId: input.actorUserId,
      actorRole: "organization",
      action: "organization.api_key.revoked",
      entityType: "ORGANIZATION_API_KEY",
      entityId: revoked.id,
    });
    return true;
  });
}

export async function authenticateOrganizationApiKey(secret: string) {
  const hash = secretHash(secret);
  const [key] = await getDb().select({
    id: organizationApiKeys.id,
    organizationId: organizationApiKeys.organizationId,
    createdByUserId: organizationApiKeys.createdByUserId,
  }).from(organizationApiKeys).innerJoin(verifiedEntities, and(
    eq(verifiedEntities.id, organizationApiKeys.organizationId),
    eq(verifiedEntities.role, "organization"),
  )).where(and(
    eq(organizationApiKeys.secretHash, hash),
    isNull(organizationApiKeys.revokedAt),
  )).limit(1);
  if (!key) return null;
  return { keyId: key.id, organizationId: key.organizationId, createdByUserId: key.createdByUserId };
}

export async function reserveOrganizationApiKeyRequest(keyId: string) {
  const now = Date.now();
  const minuteAgo = now - 60_000;
  const [allowed] = await getDb().insert(rateLimit).values({
    key: `organization-api:${keyId}`, count: 1, lastRequest: now,
  }).onConflictDoUpdate({
    target: rateLimit.key,
    set: {
      count: sql`CASE WHEN ${rateLimit.lastRequest} <= ${minuteAgo} THEN 1 ELSE ${rateLimit.count} + 1 END`,
      lastRequest: now,
    },
    setWhere: sql`${rateLimit.lastRequest} <= ${minuteAgo} OR ${rateLimit.count} < 60`,
  }).returning({ id: rateLimit.id });
  return Boolean(allowed);
}
