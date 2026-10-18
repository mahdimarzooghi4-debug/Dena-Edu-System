import { NextResponse } from "next/server";
import { enforceLiveKitServiceCallQuotas } from "../../../../../server/institute/livekit-usage";
import { secureServiceCallQuotaWorkerToken } from "../../../../../server/institute/service-call-quota-worker";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "no-store" };

export async function POST(request: Request) {
  if (!secureServiceCallQuotaWorkerToken(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "Not found" }, { status: 404, headers: noStore });
  }
  try {
    const result = await enforceLiveKitServiceCallQuotas();
    return NextResponse.json(result, { headers: noStore });
  } catch {
    return NextResponse.json({ error: "Unavailable" }, { status: 503, headers: noStore });
  }
}
