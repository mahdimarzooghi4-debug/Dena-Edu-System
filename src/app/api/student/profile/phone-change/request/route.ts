import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getServerIdentity } from "../../../../../../server/access/actor";
import { validSameOrigin } from "../../../../../../server/access/role-application-contracts";
import {
  requestStudentPhoneChange, StudentPhoneChangeError,
} from "../../../../../../server/student/phone-change";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "private, no-store, max-age=0" };

export async function POST(request: NextRequest) {
  if (!validSameOrigin(request.headers.get("origin"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: noStore });
  }
  const actor = await getServerIdentity();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: noStore });
  try {
    const body = await request.json().catch(() => null);
    const result = await requestStudentPhoneChange(actor.userId, body?.phoneNumber);
    return NextResponse.json({ challenge: result }, { headers: noStore });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid phone number" }, { status: 400, headers: noStore });
    }
    if (!(error instanceof StudentPhoneChangeError)) throw error;
    const status = error.kind === "student_unavailable" ? 403
      : error.kind === "rate_limited" ? 429
      : error.kind === "sms_unavailable" ? 503
      : error.kind === "same_phone" ? 409 : 409;
    return NextResponse.json({ error: error.kind }, { status, headers: noStore });
  }
}
