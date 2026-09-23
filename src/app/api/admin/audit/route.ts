import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { getServerAccessContext } from "../../../../server/access/actor";
import { getDb } from "../../../../db";
import { auditLogs } from "../../../../db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const actor = await getServerAccessContext();

  if (!actor) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!actor.memberships.some((item) => item.role === "admin")) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const rows = await getDb()
    .select({
      action: auditLogs.action,
      actorRole: auditLogs.actorRole,
      entityType: auditLogs.entityType,
      entityId: auditLogs.entityId,
      createdAt: auditLogs.createdAt,
    })
    .from(auditLogs)
    .orderBy(desc(auditLogs.createdAt))
    .limit(50);

  return NextResponse.json({ items: rows });
}
