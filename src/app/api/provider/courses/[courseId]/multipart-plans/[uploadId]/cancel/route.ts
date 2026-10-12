import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getServerAccessContext } from "../../../../../../../../server/access/actor";
import { validSameOrigin } from "../../../../../../../../server/access/role-application-contracts";
import { IngestError } from "../../../../../../../../server/media/ingest";
import {
  cancelOwnMultipartPlan, multipartPlanningEnabled,
} from "../../../../../../../../server/media/multipart-control";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "no-store" };

/** Idempotent metadata cancellation; NO storage session exists to abort yet. */
export async function POST(request: NextRequest,
  { params }: { params: Promise<{ courseId: string; uploadId: string }> },
) {
  if (!validSameOrigin(request.headers.get("origin"))) return NextResponse.json({
    error: "Forbidden",
  }, { status: 403, headers: noStore });
  const actor = await getServerAccessContext();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, {
    status: 401, headers: noStore,
  });
  if (!actor.memberships.some(m => m.role === "provider")) {
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
  if (!multipartPlanningEnabled()) return NextResponse.json({
    error: "Planning unavailable",
  }, { status: 503, headers: noStore });
  const parsed = z.object({}).strict().safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) return NextResponse.json({
    error: "Invalid request",
  }, { status: 400, headers: noStore });
  try {
    const status = await cancelOwnMultipartPlan(actor.userId, courseId, uploadId);
    return status === "not_found" || status === "not_provider"
      ? NextResponse.json({ error: "Not found" }, {
        status: 404, headers: noStore,
      })
      : NextResponse.json({ uploadId, status }, { headers: noStore });
  } catch (error) {
    if (!(error instanceof IngestError)) throw error;
    return NextResponse.json({ error: "Planning unavailable" }, {
      status: 503, headers: noStore,
    });
  }
}
