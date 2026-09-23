import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import {
  completeAttestedIngest, secureWorkerToken,
} from "../../../../../../../server/media/ingest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "no-store" };

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ uploadId: string }> },
) {
  // This is a service-to-service callback, NOT a Better Auth user route.
  // Never expose a callable worker token to browsers or provider accounts.
  if (!secureWorkerToken(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, {
      status: 401, headers: noStore,
    });
  }
  const { uploadId } = await params;
  if (!z.uuid().safeParse(uploadId).success) return NextResponse.json({
    error: "Not found",
  }, { status: 404, headers: noStore });
  const body: unknown = await request.json().catch(() => null);
  const parsed = z.object({ leaseToken: z.uuid() }).strict().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, {
      status: 400, headers: noStore,
    });
  }
  const result = await completeAttestedIngest(uploadId, parsed.data.leaseToken);
  return result === "ready"
    ? NextResponse.json({ uploadId, status: "ready" }, { headers: noStore })
    : NextResponse.json({ error: result }, {
      status: result === "not_found" ? 404 :
        result === "conflict" ? 409 : 503,
      headers: noStore,
    });
}
