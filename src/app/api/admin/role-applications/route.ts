import { asc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "../../../../db";
import { roleApplications } from "../../../../db/schema";
import { getServerAccessContext } from "../../../../server/access/actor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const cache = { "Cache-Control": "no-store" };

export async function GET() {
  const actor = await getServerAccessContext();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, {
    status: 401, headers: cache,
  });
  if (!actor.memberships.some((membership) => membership.role === "admin")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: cache });
  }
  const pending = await getDb().select({
    id: roleApplications.id,
    userId: roleApplications.userId,
    role: roleApplications.requestedRole,
    proposedName: roleApplications.proposedName,
    statement: roleApplications.statement,
    createdAt: roleApplications.createdAt,
  }).from(roleApplications)
    .where(eq(roleApplications.status, "pending"))
    .orderBy(asc(roleApplications.createdAt)).limit(50);
  return NextResponse.json({ pending }, { headers: cache });
}
