import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getServerIdentity } from "../../../../../server/access/actor";
import { validSameOrigin } from "../../../../../server/access/role-application-contracts";
import {
  InstituteServiceCallError, requireServiceCallJoinAccess,
} from "../../../../../server/institute/service-calls";
import {
  createLiveKitJoinToken, LiveKitConfigError, readLiveKitServerConfig,
} from "../../../../../server/institute/livekit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "private, no-store, max-age=0" };

export async function POST(request: NextRequest,
  { params }: { params: Promise<{ callId: string }> }) {
  if (!validSameOrigin(request.headers.get("origin"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: noStore });
  }
  const actor = await getServerIdentity();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, {
    status: 401, headers: noStore,
  });
  const { callId } = await params;
  if (!z.uuid().safeParse(callId).success) return NextResponse.json({ error: "Not found" }, {
    status: 404, headers: noStore,
  });
  try {
    const access = await requireServiceCallJoinAccess(actor.userId, callId);
    const config = readLiveKitServerConfig();
    const grant = await createLiveKitJoinToken({ config, callId: access.callId, userId: actor.userId });
    return NextResponse.json({ url: config.url, token: grant.token, expiresAt: grant.expiresAt }, {
      headers: noStore,
    });
  } catch (error) {
    if (error instanceof LiveKitConfigError) return NextResponse.json({
      error: "Call service unavailable",
    }, { status: 503, headers: noStore });
    if (error instanceof InstituteServiceCallError) return NextResponse.json({
      error: "Call not available",
    }, { status: 404, headers: noStore });
    throw error;
  }
}
