import { createHash, createHmac, timingSafeEqual, randomUUID } from "node:crypto";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "../../db";
import {
  memberships, technicalSupportAttachments, technicalSupportNotifications,
  technicalSupportTickets,
} from "../../db/schema";
import { canReadTechnicalTicket } from "../../domain/access/policy";
import { toAccessContext } from "../access/membership";
import { configuredPrivateMediaOrigin } from "../student/private-media";

export const MAX_SUPPORT_ATTACHMENT_BYTES = 10 * 1024 * 1024;
export const MAX_SUPPORT_ATTACHMENTS_PER_TICKET = 3;
const allowedTypes = new Set(["application/pdf", "image/jpeg", "image/png"]);

async function readBoundedSupportAttachment(
  response: Response,
  expectedBytes: number,
  expectedType: string,
) {
  const declared = response.headers.get("content-length");
  const contentType = response.headers.get("content-type")?.split(";")[0].trim().toLowerCase();
  if (response.status !== 200 || !response.body ||
      !declared || !/^(?:0|[1-9]\d*)$/.test(declared) ||
      Number(declared) !== expectedBytes || expectedBytes > MAX_SUPPORT_ATTACHMENT_BYTES ||
      contentType !== expectedType) {
    await response.body?.cancel();
    return null;
  }
  const reader = response.body.getReader();
  const chunks: Buffer[] = [];
  let total = 0;
  try {
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      total += part.value.byteLength;
      if (total > expectedBytes || total > MAX_SUPPORT_ATTACHMENT_BYTES) {
        await reader.cancel();
        return null;
      }
      chunks.push(Buffer.from(part.value));
    }
    if (total !== expectedBytes) return null;
    return Buffer.concat(chunks);
  } catch {
    await reader.cancel().catch(() => {});
    return null;
  } finally {
    reader.releaseLock();
  }
}

export type SupportAttachmentType = "application/pdf" | "image/jpeg" | "image/png";
export type SupportAttachmentStatus = "uploading" | "quarantined" | "failed" | "ready" | "rejected";

export function sniffSupportAttachment(bytes: Buffer): SupportAttachmentType | null {
  if (bytes.subarray(0, 5).toString("ascii") === "%PDF-") return "application/pdf";
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
    return "image/png";
  }
  return null;
}

export function validateSupportAttachment(input: {
  fileName: string;
  contentType: string;
  bytes: Buffer;
}) {
  if (!allowedTypes.has(input.contentType) || input.bytes.length < 1 ||
      input.bytes.length > MAX_SUPPORT_ATTACHMENT_BYTES ||
      sniffSupportAttachment(input.bytes) !== input.contentType) return null;
  const fileName = input.fileName.trim()
    .replace(/[\u0000-\u001f\u007f/\\]/g, "_")
    .slice(0, 180);
  if (!fileName) return null;
  return {
    fileName,
    contentType: input.contentType as SupportAttachmentType,
    byteSize: input.bytes.length,
    sha256: createHash("sha256").update(input.bytes).digest("hex"),
  };
}

function scannerConfig() {
  const token = process.env.DENA_SUPPORT_ATTACHMENT_SCANNER_TOKEN;
  const hmacKey = process.env.DENA_SUPPORT_ATTACHMENT_SCAN_HMAC_KEY;
  const origin = configuredPrivateMediaOrigin();
  if (process.env.DENA_SUPPORT_ATTACHMENT_SCANNER_ENABLED !== "1" ||
      !token || token.length < 32 || !hmacKey || hmacKey.length < 32 ||
      !origin || token === origin.token || hmacKey === origin.token || token === hmacKey) {
    return null;
  }
  return { token, hmacKey, origin };
}

export function supportAttachmentUploadAvailable() {
  return process.env.DENA_SUPPORT_ATTACHMENTS_ENABLED === "1" && scannerConfig() !== null;
}

export function secureSupportAttachmentScannerToken(value: string | null) {
  const config = scannerConfig();
  if (!config || !value?.startsWith("Bearer ")) return false;
  const provided = Buffer.from(value.slice(7));
  const expected = Buffer.from(config.token);
  return provided.length === expected.length && timingSafeEqual(provided, expected);
}

export function createSupportAttachmentScanSignature(input: {
  attachmentId: string;
  sha256: string;
  scannedAt: string;
  clean: boolean;
}, key = process.env.DENA_SUPPORT_ATTACHMENT_SCAN_HMAC_KEY ?? "") {
  return createHmac("sha256", key).update([
    input.attachmentId, input.sha256, input.scannedAt, String(input.clean),
  ].join("\n")).digest("hex");
}

export function verifySupportAttachmentScanSignature(input: {
  attachmentId: string;
  sha256: string;
  scannedAt: string;
  clean: boolean;
  signature: string;
}, now = Date.now()) {
  const config = scannerConfig();
  const scannedAt = Date.parse(input.scannedAt);
  if (!config || !/^[0-9a-f]{64}$/.test(input.sha256) ||
      !/^[0-9a-f]{64}$/.test(input.signature) || !Number.isFinite(scannedAt) ||
      scannedAt < now - 5 * 60_000 || scannedAt > now + 30_000) return false;
  const expected = Buffer.from(createSupportAttachmentScanSignature(input, config.hmacKey));
  const provided = Buffer.from(input.signature);
  return provided.length === expected.length && timingSafeEqual(provided, expected);
}

async function currentActor(db: Pick<ReturnType<typeof getDb>, "select">, userId: string) {
  const rows = await db.select().from(memberships).where(and(
    eq(memberships.userId, userId), eq(memberships.status, "active"),
  )).for("update");
  return toAccessContext(userId, rows);
}

export async function uploadSupportAttachment(userId: string, ticketId: string, input: {
  fileName: string; contentType: string; bytes: Buffer;
}) {
  const config = scannerConfig();
  if (process.env.DENA_SUPPORT_ATTACHMENTS_ENABLED !== "1" || !config) return "unavailable" as const;
  const file = validateSupportAttachment(input);
  if (!file) return "invalid" as const;
  const attachmentId = randomUUID();
  const reserved = await getDb().transaction(async (tx) => {
    const [ticket] = await tx.select({
      id: technicalSupportTickets.id,
      requesterUserId: technicalSupportTickets.requesterUserId,
      assignedToUserId: technicalSupportTickets.assignedToUserId,
    }).from(technicalSupportTickets).where(eq(technicalSupportTickets.id, ticketId))
      .for("update").limit(1);
    if (!ticket) return "not_found" as const;
    const actor = await currentActor(tx, userId);
    if (!actor || !canReadTechnicalTicket(actor, {
      ticketId: ticket.id,
      requesterUserId: ticket.requesterUserId,
    })) return "not_found" as const;
    const [{ count }] = await tx.select({
      count: sql<number>`count(*)::int`,
    }).from(technicalSupportAttachments).where(and(
      eq(technicalSupportAttachments.ticketId, ticketId),
      inArray(technicalSupportAttachments.status,
        ["uploading", "quarantined", "ready", "rejected"]),
    ));
    if (count >= MAX_SUPPORT_ATTACHMENTS_PER_TICKET) return "limit" as const;
    await tx.insert(technicalSupportAttachments).values({
      id: attachmentId,
      ticketId,
      uploadedByUserId: userId,
      fileName: file.fileName,
      contentType: file.contentType,
      byteSize: file.byteSize,
      sha256: file.sha256,
      objectKey: attachmentId,
      status: "uploading",
    });
    return ticket;
  });
  if (typeof reserved === "string") return reserved;
  try {
    const response = await fetch(new URL(`/quarantine/${attachmentId}`, config.origin.origin), {
      method: "PUT",
      redirect: "error",
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${config.origin.token}`,
        "Content-Type": file.contentType,
        "X-Dena-Sha256": file.sha256,
      },
      body: new Uint8Array(input.bytes),
      signal: AbortSignal.timeout(20_000),
    });
    await response.body?.cancel();
    if (response.status !== 201) throw new Error("private quarantine unavailable");
    await getDb().transaction(async (tx) => {
      await tx.update(technicalSupportAttachments).set({ status: "quarantined" })
        .where(and(
          eq(technicalSupportAttachments.id, attachmentId),
          eq(technicalSupportAttachments.status, "uploading"),
        ));
      const recipient = userId === reserved.requesterUserId
        ? reserved.assignedToUserId
        : reserved.requesterUserId;
      if (recipient && recipient !== userId) await tx.insert(technicalSupportNotifications).values({
        recipientUserId: recipient,
        ticketId,
        kind: "attachment_added",
      });
    });
    return { id: attachmentId, status: "quarantined" as const };
  } catch {
    await getDb().update(technicalSupportAttachments).set({ status: "failed" })
      .where(eq(technicalSupportAttachments.id, attachmentId));
    return "unavailable" as const;
  }
}

export async function listSupportTicketAttachments(userId: string, ticketId: string) {
  const db = getDb();
  const actor = await currentActor(db, userId);
  if (!actor) return null;
  const [ticket] = await db.select().from(technicalSupportTickets)
    .where(eq(technicalSupportTickets.id, ticketId)).limit(1);
  if (!ticket || !canReadTechnicalTicket(actor, {
    ticketId: ticket.id,
    requesterUserId: ticket.requesterUserId,
  })) return null;
  return db.select({
    id: technicalSupportAttachments.id,
    fileName: technicalSupportAttachments.fileName,
    contentType: technicalSupportAttachments.contentType,
    byteSize: technicalSupportAttachments.byteSize,
    status: technicalSupportAttachments.status,
    createdAt: technicalSupportAttachments.createdAt,
  }).from(technicalSupportAttachments)
    .where(eq(technicalSupportAttachments.ticketId, ticketId))
    .orderBy(asc(technicalSupportAttachments.createdAt));
}

export async function downloadReadySupportAttachment(
  userId: string, ticketId: string, attachmentId: string,
) {
  const config = configuredPrivateMediaOrigin();
  if (!config) return null;
  const db = getDb();
  const actor = await currentActor(db, userId);
  if (!actor) return null;
  const [attachment] = await db.select({
    id: technicalSupportAttachments.id,
    requesterUserId: technicalSupportTickets.requesterUserId,
    fileName: technicalSupportAttachments.fileName,
    contentType: technicalSupportAttachments.contentType,
    byteSize: technicalSupportAttachments.byteSize,
    sha256: technicalSupportAttachments.sha256,
    status: technicalSupportAttachments.status,
  }).from(technicalSupportAttachments)
    .innerJoin(technicalSupportTickets,
      eq(technicalSupportTickets.id, technicalSupportAttachments.ticketId))
    .where(and(
      eq(technicalSupportAttachments.id, attachmentId),
      eq(technicalSupportAttachments.ticketId, ticketId),
    )).limit(1);
  if (!attachment || attachment.status !== "ready" ||
      !canReadTechnicalTicket(actor, {
        ticketId,
        requesterUserId: attachment.requesterUserId,
      })) return null;
  try {
    const response = await fetch(new URL(`/quarantine/${attachmentId}`, config.origin), {
      redirect: "error", cache: "no-store",
      headers: { Authorization: `Bearer ${config.token}` },
      signal: AbortSignal.timeout(10_000),
    });
    const bytes = await readBoundedSupportAttachment(
      response, attachment.byteSize, attachment.contentType,
    );
    if (!bytes ||
        createHash("sha256").update(bytes).digest("hex") !== attachment.sha256 ||
        sniffSupportAttachment(bytes) !== attachment.contentType) return null;
    return { bytes, fileName: attachment.fileName, contentType: attachment.contentType };
  } catch {
    return null;
  }
}

export async function listSupportAttachmentScanQueue() {
  if (!scannerConfig()) return null;
  return getDb().select({
    id: technicalSupportAttachments.id,
    contentType: technicalSupportAttachments.contentType,
    byteSize: technicalSupportAttachments.byteSize,
    sha256: technicalSupportAttachments.sha256,
    createdAt: technicalSupportAttachments.createdAt,
  }).from(technicalSupportAttachments)
    .where(eq(technicalSupportAttachments.status, "quarantined"))
    .orderBy(asc(technicalSupportAttachments.createdAt)).limit(20);
}

export async function getQuarantinedSupportAttachment(attachmentId: string) {
  const config = scannerConfig();
  if (!config) return null;
  const [attachment] = await getDb().select({
    id: technicalSupportAttachments.id,
    contentType: technicalSupportAttachments.contentType,
    byteSize: technicalSupportAttachments.byteSize,
    sha256: technicalSupportAttachments.sha256,
    status: technicalSupportAttachments.status,
  }).from(technicalSupportAttachments)
    .where(eq(technicalSupportAttachments.id, attachmentId)).limit(1);
  if (!attachment || attachment.status !== "quarantined") return null;
  try {
    const response = await fetch(new URL(`/quarantine/${attachmentId}`, config.origin.origin), {
      redirect: "error", cache: "no-store",
      headers: { Authorization: `Bearer ${config.origin.token}` },
      signal: AbortSignal.timeout(10_000),
    });
    const bytes = await readBoundedSupportAttachment(
      response, attachment.byteSize, attachment.contentType,
    );
    if (!bytes ||
        createHash("sha256").update(bytes).digest("hex") !== attachment.sha256 ||
        sniffSupportAttachment(bytes) !== attachment.contentType) return null;
    return { bytes, contentType: attachment.contentType };
  } catch {
    return null;
  }
}

export async function recordSupportAttachmentScan(input: {
  attachmentId: string;
  sha256: string;
  scannedAt: string;
  clean: boolean;
}) {
  const scannedAt = new Date(input.scannedAt);
  if (Math.abs(Date.now() - scannedAt.getTime()) > 5 * 60_000) return false;
  return getDb().transaction(async (tx) => {
    const [attachment] = await tx.select({
      ticketId: technicalSupportAttachments.ticketId,
      uploadedByUserId: technicalSupportAttachments.uploadedByUserId,
      sha256: technicalSupportAttachments.sha256,
      status: technicalSupportAttachments.status,
      requesterUserId: technicalSupportTickets.requesterUserId,
      assignedToUserId: technicalSupportTickets.assignedToUserId,
    }).from(technicalSupportAttachments).innerJoin(technicalSupportTickets,
      eq(technicalSupportTickets.id, technicalSupportAttachments.ticketId))
      .where(eq(technicalSupportAttachments.id, input.attachmentId))
      .for("update").limit(1);
    if (!attachment || attachment.status !== "quarantined" ||
        attachment.sha256 !== input.sha256) return false;
    await tx.update(technicalSupportAttachments).set({
      status: input.clean ? "ready" : "rejected",
      scannedAt,
    }).where(eq(technicalSupportAttachments.id, input.attachmentId));
    const recipients = [...new Set([
      attachment.uploadedByUserId,
      attachment.requesterUserId,
      ...(attachment.assignedToUserId ? [attachment.assignedToUserId] : []),
    ])];
    await tx.insert(technicalSupportNotifications).values(recipients.map((recipientUserId) => ({
      recipientUserId,
      ticketId: attachment.ticketId,
      kind: "attachment_scanned",
    })));
    return true;
  });
}
