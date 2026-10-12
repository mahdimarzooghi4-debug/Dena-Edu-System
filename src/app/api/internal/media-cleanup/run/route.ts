import { NextResponse } from "next/server";
import { z } from "zod";
import { runQuarantineCleanup, secureCleanupToken } from "../../../../../server/media/cleanup";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "no-store" };
export async function POST(request: Request) {
  if (!secureCleanupToken(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "Not found" }, {
      status: 404, headers: noStore,
    });
  }
  const parsed = z.object({ limit: z.number().int().min(1).max(10) })
    .strict().safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, {
    status: 400, headers: noStore,
  });
  const result = await runQuarantineCleanup(parsed.data.limit);
  if (!result) return NextResponse.json({ error: "Unavailable" }, {
    status: 503, headers: noStore,
  });
  return NextResponse.json(result, { headers: noStore });
}
