import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getServerAccessContext } from "../../../../../server/access/actor";
import { validSameOrigin } from "../../../../../server/access/role-application-contracts";
import { readFormDataAtMost, RequestBodyLimitError } from "../../../../../server/http/bounded-request-body";
import {
  MAX_SUPPORT_ATTACHMENT_BYTES, MAX_SUPPORT_ATTACHMENTS_PER_TICKET,
  listServiceOrderAttachments, supportAttachmentUploadAvailable, uploadServiceOrderAttachment,
} from "../../../../../server/support/attachments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "private, no-store, max-age=0" };

export async function GET(_request: NextRequest, { params }: { params: Promise<{ orderId: string }> }) {
  const actor = await getServerAccessContext();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: noStore });
  const { orderId } = await params;
  if (!z.uuid().safeParse(orderId).success) return NextResponse.json({ error: "Not found" }, { status: 404, headers: noStore });
  const attachments = await listServiceOrderAttachments(actor.userId, orderId);
  if (!attachments) return NextResponse.json({ error: "Not found" }, { status: 404, headers: noStore });
  return NextResponse.json({ attachments, uploadAvailable: supportAttachmentUploadAvailable() }, { headers: noStore });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ orderId: string }> }) {
  const actor = await getServerAccessContext();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: noStore });
  if (!validSameOrigin(request.headers.get("origin"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: noStore });
  }
  const { orderId } = await params;
  if (!z.uuid().safeParse(orderId).success) return NextResponse.json({ error: "Not found" }, { status: 404, headers: noStore });
  // Do not disclose scanner configuration to unauthorized tenants or orders.
  const existing = await listServiceOrderAttachments(actor.userId, orderId);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404, headers: noStore });
  if (!supportAttachmentUploadAvailable()) return NextResponse.json({ error: "Attachment storage or scanner is unavailable" }, { status: 503, headers: noStore });

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  const maxRequestBytes = MAX_SUPPORT_ATTACHMENT_BYTES * MAX_SUPPORT_ATTACHMENTS_PER_TICKET + 16_384;
  if (!Number.isFinite(contentLength) || contentLength > maxRequestBytes) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413, headers: noStore });
  }
  let form: FormData;
  try { form = await readFormDataAtMost(request, maxRequestBytes); } catch (error) {
    if (error instanceof RequestBodyLimitError) return NextResponse.json({ error: "Payload too large" }, { status: 413, headers: noStore });
    return NextResponse.json({ error: "Invalid request" }, { status: 400, headers: noStore });
  }
  const files = form.getAll("files");
  if ([...form.keys()].some((key) => key !== "files") || files.length < 1 ||
      files.length > MAX_SUPPORT_ATTACHMENTS_PER_TICKET || files.some((file) =>
        !(file instanceof File) || file.size < 1 || file.size > MAX_SUPPORT_ATTACHMENT_BYTES)) {
    return NextResponse.json({ error: "Invalid attachments" }, { status: 400, headers: noStore });
  }
  const remaining = MAX_SUPPORT_ATTACHMENTS_PER_TICKET - existing.filter((file) => file.status !== "failed").length;
  if (files.length > remaining) return NextResponse.json({ error: "Attachment limit reached" }, { status: 409, headers: noStore });

  const uploaded = [];
  for (const file of files as File[]) {
    const result = await uploadServiceOrderAttachment(actor.userId, orderId, {
      fileName: file.name,
      contentType: file.type,
      bytes: Buffer.from(await file.arrayBuffer()),
    });
    if (result === "unavailable") return NextResponse.json({ error: "Attachment storage or scanner is unavailable" }, { status: 503, headers: noStore });
    if (result === "invalid") return NextResponse.json({ error: "Unsupported or invalid file" }, { status: 400, headers: noStore });
    if (result === "limit") return NextResponse.json({ error: "Attachment limit reached" }, { status: 409, headers: noStore });
    if (result === "not_found") return NextResponse.json({ error: "Not found" }, { status: 404, headers: noStore });
    uploaded.push(result);
  }
  return NextResponse.json({ attachments: uploaded }, { status: 201, headers: noStore });
}
