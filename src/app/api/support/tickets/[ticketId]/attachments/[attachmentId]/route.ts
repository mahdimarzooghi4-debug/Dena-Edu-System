import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getServerAccessContext } from "../../../../../../../server/access/actor";
import { downloadReadySupportAttachment } from "../../../../../../../server/support/attachments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "private, no-store, max-age=0" };
type Params = { params: Promise<{ ticketId: string; attachmentId: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET ||
      !process.env.BETTER_AUTH_URL) return NextResponse.json({ error: "Unauthorized" }, {
    status: 401, headers: noStore,
  });
  const actor = await getServerAccessContext();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, {
    status: 401, headers: noStore,
  });
  const { ticketId, attachmentId } = await params;
  if (!z.uuid().safeParse(ticketId).success ||
      !z.uuid().safeParse(attachmentId).success) return NextResponse.json({ error: "Not found" }, {
    status: 404, headers: noStore,
  });
  const file = await downloadReadySupportAttachment(actor.userId, ticketId, attachmentId);
  if (!file) return NextResponse.json({ error: "Not found" }, {
    status: 404, headers: noStore,
  });
  return new Response(new Uint8Array(file.bytes), {
    headers: {
      ...noStore,
      "Content-Type": file.contentType,
      "Content-Length": String(file.bytes.length),
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(file.fileName)}`,
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "sandbox",
    },
  });
}
