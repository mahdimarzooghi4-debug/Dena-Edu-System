import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "../../../../../../db";
import { privateMediaAssets } from "../../../../../../db/schema";
import { getServerAccessContext } from "../../../../../../server/access/actor";
import { hasStudentEntitlement } from "../../../../../../server/student/entitlement";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "no-store" };

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ courseId: string }> },
) {
  const actor = await getServerAccessContext();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, {
    status: 401, headers: noStore,
  });
  const { courseId } = await params;
  if (!z.uuid().safeParse(courseId).success ||
      !await hasStudentEntitlement(actor.userId, courseId)) {
    return NextResponse.json({ error: "Not found" }, {
      status: 404, headers: noStore,
    });
  }
  const rows = await getDb().select({
    assetId: privateMediaAssets.id, title: privateMediaAssets.title,
  }).from(privateMediaAssets).where(and(
    eq(privateMediaAssets.courseId, courseId),
    eq(privateMediaAssets.status, "ready"),
  )).limit(50);
  // NO objectKey, origin URL, token, CDN hostname, storage location or PII.
  return NextResponse.json({ courseId, assets: rows }, { headers: noStore });
}
