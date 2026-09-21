import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getServerAccessContext } from "../../../../../../server/access/actor";
import { validSameOrigin } from "../../../../../../server/access/role-application-contracts";
import { IngestError } from "../../../../../../server/media/ingest";
import {
  MIN_MULTIPART_BYTES, multipartPlanningEnabled, reserveMultipartPlan,
} from "../../../../../../server/media/multipart-control";
import { MAX_MULTIPART_BYTES } from "../../../../../../server/media/multipart";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "no-store" };
const reservation = z.object({
  title: z.string().trim().min(3).max(160),
  clientRequestId: z.uuid(),
  expectedBytes: z.number().int().min(MIN_MULTIPART_BYTES).max(MAX_MULTIPART_BYTES),
  sha256: z.string().regex(/^[0-9a-f]{64}$/),
}).strict();

/** DRY RUN: returns no signed parts, provider URLs or storage upload ID. */
export async function POST(request: NextRequest,
  { params }: { params: Promise<{ courseId: string }> },
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
  const { courseId } = await params;
  if (!z.uuid().safeParse(courseId).success) return NextResponse.json({
    error: "Not found",
  }, { status: 404, headers: noStore });
  if (!multipartPlanningEnabled()) return NextResponse.json({
    error: "Planning unavailable",
  }, { status: 503, headers: noStore });
  const parsed = reservation.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({
    error: "Invalid plan metadata",
  }, { status: 400, headers: noStore });
  try {
    const result = await reserveMultipartPlan(actor.userId, courseId, parsed.data);
    return NextResponse.json(result, {
      status: result.replayed ? 200 : 201, headers: noStore,
    });
  } catch (error) {
    if (!(error instanceof IngestError)) throw error;
    return NextResponse.json({ error: error.kind }, {
      status: error.kind === "not_provider" ? 403 :
        error.kind === "not_available" ? 404 : 409,
      headers: noStore,
    });
  }
}
