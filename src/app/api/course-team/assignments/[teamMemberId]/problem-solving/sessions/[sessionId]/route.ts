import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getServerIdentity } from "@/server/access/identity";
import { validSameOrigin } from "@/server/access/role-application-contracts";
import {
  decideSupporterSession,
  supporterSessionDecision,
} from "@/server/course-team/problem-solving";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "private, no-store, max-age=0" };

type Params = {
  params: Promise<{ teamMemberId: string; sessionId: string }>;
};

export async function PATCH(request: NextRequest, { params }: Params) {
  if (!validSameOrigin(request.headers.get("origin"))) {
    return NextResponse.json({ error: "Forbidden" }, {
      status: 403, headers: noStore,
    });
  }

  const identity = await getServerIdentity();
  if (!identity) {
    return NextResponse.json({ error: "Unauthorized" }, {
      status: 401, headers: noStore,
    });
  }

  const { teamMemberId, sessionId } = await params;
  if (!z.uuid().safeParse(teamMemberId).success ||
      !z.uuid().safeParse(sessionId).success) {
    return NextResponse.json({ error: "Not found" }, {
      status: 404, headers: noStore,
    });
  }

  const parsed = supporterSessionDecision.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid decision" }, {
      status: 400, headers: noStore,
    });
  }

  const result = await decideSupporterSession(
    identity.userId, teamMemberId, sessionId, parsed.data.status,
  );
  if (!result) {
    return NextResponse.json({ error: "Not found or invalid state" }, {
      status: 404, headers: noStore,
    });
  }

  return NextResponse.json(result, { headers: noStore });
}
