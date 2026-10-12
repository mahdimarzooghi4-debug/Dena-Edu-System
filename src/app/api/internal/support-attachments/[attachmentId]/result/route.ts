import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import {
  recordSupportAttachmentScan,
  secureSupportAttachmentScannerToken,
  verifySupportAttachmentScanSignature,
} from "../../../../../../server/support/attachments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "private, no-store, max-age=0" };
type Params = { params: Promise<{ attachmentId: string }> };
const reportSchema = z.object({
  sha256: z.string().regex(/^[0-9a-f]{64}$/),
  scannedAt: z.string().datetime(),
  clean: z.boolean(),
  signature: z.string().regex(/^[0-9a-f]{64}$/),
}).strict();

export async function POST(request: NextRequest, { params }: Params) {
  if (!secureSupportAttachmentScannerToken(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: noStore });
  }
  const { attachmentId } = await params;
  if (!z.uuid().safeParse(attachmentId).success) return NextResponse.json({ error: "Invalid report" }, {
    status: 400, headers: noStore,
  });
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > 4096) return NextResponse.json({ error: "Payload too large" }, {
    status: 413, headers: noStore,
  });
  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid report" }, { status: 400, headers: noStore });
  }
  const parsed = reportSchema.safeParse(body);
  if (!parsed.success || !verifySupportAttachmentScanSignature({
    attachmentId,
    ...parsed.data,
  })) return NextResponse.json({ error: "Invalid report" }, {
    status: 400, headers: noStore,
  });
  const recorded = await recordSupportAttachmentScan({
    attachmentId,
    sha256: parsed.data.sha256,
    scannedAt: parsed.data.scannedAt,
    clean: parsed.data.clean,
  });
  if (!recorded) return NextResponse.json({ error: "Not found or already processed" }, {
    status: 409, headers: noStore,
  });
  return NextResponse.json({ recorded: true }, { headers: noStore });
}
