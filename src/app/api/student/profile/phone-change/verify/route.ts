import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getServerIdentity } from "../../../../../../server/access/actor";
import { validSameOrigin } from "../../../../../../server/access/role-application-contracts";
import {
  StudentPhoneChangeError, verifyStudentPhoneChange,
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
    const result = await verifyStudentPhoneChange(actor.userId, body?.code);
    if (!result.verified) return NextResponse.json({ error: result.reason }, {
      status: result.reason === "phone_unavailable" ? 409 : 400, headers: noStore,
    });
    return NextResponse.json({ verified: true }, { headers: noStore });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid code" }, { status: 400, headers: noStore });
    }
    if (!(error instanceof StudentPhoneChangeError)) throw error;
    const status = error.kind === "student_unavailable" ? 403
      : error.kind === "code_expired" ? 410
      : error.kind === "sms_unavailable" ? 503
      : error.kind === "phone_unavailable" ? 409 : 400;
    return NextResponse.json({ error: error.kind }, { status, headers: noStore });
  }
}
