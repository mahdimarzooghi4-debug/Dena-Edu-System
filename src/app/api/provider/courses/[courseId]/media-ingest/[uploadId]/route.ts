import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getServerAccessContext } from "../../../../../../../server/access/actor";
import { validSameOrigin } from "../../../../../../../server/access/role-application-contracts";
import {
  receiveQuarantinedUpload,
} from "../../../../../../../server/media/ingest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "no-store" };

/** Only bounded raw MP4 requests, not multipart, URLs or arbitrary origin keys. */
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
  if (!actor.memberships.some((m) => m.role === "provider")) {
    return NextResponse.json({ error: "Forbidden" }, {
      status: 403, headers: noStore,
    });
  }
  const { courseId, uploadId } = await params;
  if (!z.uuid().safeParse(courseId).success ||
      !z.uuid().safeParse(uploadId).success) {
    return NextResponse.json({ error: "Not found" }, {
      status: 404, headers: noStore,
    });
  }
  const state = await receiveQuarantinedUpload(
    actor.userId, courseId, uploadId, request,
  );
  const status = state === "quarantined" ? 202 :
    state === "invalid" ? 400 : state === "conflict" ? 409 :
      state === "unavailable" ? 503 : 404;
  return NextResponse.json(state === "quarantined"
    ? { uploadId, status: state }
    : { error: state }, { status, headers: noStore });
}
