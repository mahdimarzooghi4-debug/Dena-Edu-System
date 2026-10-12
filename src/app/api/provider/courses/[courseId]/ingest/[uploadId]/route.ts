import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getServerAccessContext } from "../../../../../../../server/access/actor";
import { validSameOrigin } from "../../../../../../../server/access/role-application-contracts";
import { receiveQuarantinedUpload } from "../../../../../../../server/media/ingest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "no-store" };

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string; uploadId: string }> },
) {
  if (!validSameOrigin(request.headers.get("origin"))) return NextResponse.json({
    error: "Forbidden",
  }, { status: 403, headers: noStore });
  const actor = await getServerAccessContext();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, {
    status: 401, headers: noStore,
  });
  const { courseId, uploadId } = await params;
  if (!z.uuid().safeParse(courseId).success ||
      !z.uuid().safeParse(uploadId).success) return NextResponse.json({
    error: "Not found",
  }, { status: 404, headers: noStore });
  if (!actor.memberships.some((role) => role.role === "provider")) {
    return NextResponse.json({ error: "Forbidden" }, {
      status: 403, headers: noStore,
    });
  }
  const result = await receiveQuarantinedUpload(actor.userId, courseId,
    uploadId, request);
  return result === "quarantined"
    ? NextResponse.json({ uploadId, status: result }, {
      status: 202, headers: noStore,
    })
    : NextResponse.json({
      error: result,
    }, { status: result === "not_found" ? 404 :
      result === "invalid" ? 400 :
      result === "conflict" ? 409 : 503, headers: noStore });
}
