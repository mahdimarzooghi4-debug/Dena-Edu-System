import { NextResponse } from "next/server";
import { getServerAccessContext } from "../../../../server/access/actor";
import { getStudentProgressOverview } from "../../../../server/student/progress-overview";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "private, no-store, max-age=0" };

/** No student ID comes from query parameters: always derive from live session. */
export async function GET() {
  const actor = await getServerAccessContext();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, {
    status: 401, headers: noStore,
  });
  if (!actor.memberships.some((item) => item.role === "student")) {
    return NextResponse.json({ error: "Forbidden" }, {
      status: 403, headers: noStore,
    });
  }
  return NextResponse.json(await getStudentProgressOverview(actor.userId), {
    headers: noStore,
  });
}
