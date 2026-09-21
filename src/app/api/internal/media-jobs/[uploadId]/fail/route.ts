import { NextResponse } from "next/server";
import { z } from "zod";
import { secureWorkerToken } from "../../../../../../server/media/ingest";
import { failProcessingJob } from "../../../../../../server/media/processing-queue";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "no-store" };
const body = z.object({
  leaseToken: z.uuid(), reason: z.string().trim().min(3).max(500),
}).strict();
export async function POST(
  request: Request,
  { params }: { params: Promise<{ uploadId: string }> },
) {
  if (!secureWorkerToken(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "Not found" }, {
      status: 404, headers: noStore,
    });
  }
  const { uploadId } = await params;
  if (!z.uuid().safeParse(uploadId).success) return NextResponse.json({
    error: "Not found",
  }, { status: 404, headers: noStore });
  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid failure" }, {
    status: 400, headers: noStore,
  });
  const status = await failProcessingJob(
    uploadId, parsed.data.leaseToken, parsed.data.reason,
  );
  return NextResponse.json(status === "conflict" ? { error: status }
    : { uploadId, status }, {
    status: status === "conflict" ? 409 : 200, headers: noStore,
  });
}
