import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import {
  getQuarantinedSupportAttachment,
  secureSupportAttachmentScannerToken,
} from "../../../../../../server/support/attachments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "private, no-store, max-age=0" };
type Params = { params: Promise<{ attachmentId: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  if (!secureSupportAttachmentScannerToken(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: noStore });
  }
  const { attachmentId } = await params;
  if (!z.uuid().safeParse(attachmentId).success) return NextResponse.json({ error: "Not found" }, {
    status: 404, headers: noStore,
  });
  const file = await getQuarantinedSupportAttachment(attachmentId);
  if (!file) return NextResponse.json({ error: "Not found" }, {
    status: 404, headers: noStore,
  });
  return new Response(new Uint8Array(file.bytes), {
    headers: {
      ...noStore,
      "Content-Type": file.contentType,
      "Content-Length": String(file.bytes.length),
      "X-Content-Type-Options": "nosniff",
      "Content-Disposition": "attachment",
    },
  });
}
