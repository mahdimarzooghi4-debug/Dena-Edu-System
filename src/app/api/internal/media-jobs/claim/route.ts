import { NextResponse } from "next/server";
import { z } from "zod";
import { secureWorkerToken } from "../../../../../server/media/ingest";
import {
  deadLetterExpiredLeases, leaseProcessingJobs,
} from "../../../../../server/media/processing-queue";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "no-store" };
export async function POST(request: Request) {
  if (!secureWorkerToken(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "Not found" }, {
      status: 404, headers: noStore,
    });
  }
  const parsed = z.object({ limit: z.number().int().min(1).max(10) })
    .strict().safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid claim" }, {
    status: 400, headers: noStore,
  });
  await deadLetterExpiredLeases();
  const jobs = await leaseProcessingJobs(parsed.data.limit);
  return NextResponse.json({ jobs }, { headers: noStore });
}
