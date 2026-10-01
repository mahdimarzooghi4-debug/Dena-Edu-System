import { NextResponse, type NextRequest } from "next/server";
import {
  listSupportAttachmentScanQueue,
  secureSupportAttachmentScannerToken,
} from "../../../../../server/support/attachments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "private, no-store, max-age=0" };

export async function GET(request: NextRequest) {
  if (!secureSupportAttachmentScannerToken(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: noStore });
  }
  const attachments = await listSupportAttachmentScanQueue();
  if (!attachments) return NextResponse.json({ error: "Unavailable" }, {
    status: 503, headers: noStore,
  });
  return NextResponse.json({ attachments }, { headers: noStore });
}
