import { and, eq, sql } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { getServerAccessContext } from "@/server/access/actor";
import { privateMediaAssets } from "@/db/schema";
import { hasStudentEntitlement } from "@/server/student/entitlement";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "private, no-store, max-age=0" };

/**
 * Return only currently authorized source labels for the signed-in student.
 * Storage keys, transcripts and extracted content are never returned.
 */
export async function GET(request: NextRequest) {
  const actor = await getServerAccessContext();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, {
    status: 401, headers: noStore,
  });
  if (!actor.memberships.some((entry) => entry.role === "student")) {
    return NextResponse.json({ error: "Not found" }, { status: 404, headers: noStore });
  }
  const parsed = z.uuid().safeParse(request.nextUrl.searchParams.get("courseId"));
  if (!parsed.success) return NextResponse.json({ error: "Course unavailable" }, {
    status: 404, headers: noStore,
  });
  const courseId = parsed.data;
  if (!await hasStudentEntitlement(actor.userId, courseId)) {
    return NextResponse.json({ error: "Course unavailable" }, { status: 404, headers: noStore });
  }

  const sources = await getDb().select({
    assetId: privateMediaAssets.id,
    title: privateMediaAssets.title,
  }).from(privateMediaAssets).where(and(
    eq(privateMediaAssets.courseId, courseId),
    eq(privateMediaAssets.status, "ready"),
    sql`EXISTS (
      SELECT 1
      FROM dena_ai_content_permission_events AS granted
      WHERE granted.asset_id = ${privateMediaAssets.id}
        AND granted.course_id = ${privateMediaAssets.courseId}
        AND granted.decision = 'granted'
        AND NOT EXISTS (
          SELECT 1
          FROM dena_ai_content_permission_events AS newer
          WHERE newer.asset_id = granted.asset_id
            AND newer.course_id = granted.course_id
            AND (newer.created_at, newer.id) > (granted.created_at, granted.id)
        )
    )`,
  ));
  return NextResponse.json({ sources }, { headers: noStore });
}
