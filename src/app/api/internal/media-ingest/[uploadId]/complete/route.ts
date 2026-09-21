import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import {
  completeAttestedIngest, secureWorkerToken,
} from "../../../../../../server/media/ingest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "no-store" };

/** Private worker-to-server signal, NEVER provider-controlled content/claims.
 * The server independently verifies a separately signed attestation,
 * the current DB lease and final private object metadata.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ uploadId: string }> },
) {
  if (!secureWorkerToken(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "Not found" }, {
      status: 404, headers: noStore,
    });
  }
  const { uploadId } = await params;
  if (!z.uuid().safeParse(uploadId).success) {
    return NextResponse.json({ error: "Not found" }, {
      status: 404, headers: noStore,
    });
  }
  const input: unknown = await request.json().catch(() => null);
  const parsed = z.object({ leaseToken: z.uuid() }).strict().safeParse(input);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid notification" }, {
      status: 400, headers: noStore,
    });
  }
  const result = await completeAttestedIngest(uploadId, parsed.data.leaseToken);
  const status = result === "ready" ? 200 : result === "not_found" ? 404 :
    result === "unavailable" ? 503 : 409;
  return NextResponse.json(result === "ready"
    ? { uploadId, status: "ready" }
    : { error: result }, { status, headers: noStore });
}
