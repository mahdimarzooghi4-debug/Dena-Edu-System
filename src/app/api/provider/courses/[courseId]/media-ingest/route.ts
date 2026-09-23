import { and, desc, eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getDb } from "../../../../../../db";
import { courses, mediaIngests, memberships } from "../../../../../../db/schema";
import { getServerAccessContext } from "../../../../../../server/access/actor";
import { validSameOrigin } from "../../../../../../server/access/role-application-contracts";
import {
  ingestAvailable, IngestError, MAX_PILOT_UPLOAD_BYTES, reserveIngest,
} from "../../../../../../server/media/ingest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "no-store" };
const uuid = z.uuid();
const reservation = z.object({
  title: z.string().trim().min(3).max(160),
  clientRequestId: uuid,
  expectedBytes: z.number().int().min(16).max(MAX_PILOT_UPLOAD_BYTES),
  sha256: z.string().regex(/^[0-9a-f]{64}$/),
}).strict();

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ courseId: string }> },
) {
  const actor = await getServerAccessContext();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, {
    status: 401, headers: noStore,
  });
  const { courseId } = await params;
  if (!uuid.safeParse(courseId).success) return NextResponse.json({
    error: "Not found",
  }, { status: 404, headers: noStore });
  const [course] = await getDb().select({
    providerId: courses.providerId,
  }).from(courses).where(eq(courses.id, courseId)).limit(1);
  if (!course || !actor.memberships.some((m) =>
    m.role === "provider" && m.providerId === course.providerId)) {
    return NextResponse.json({ error: "Not found" }, { status: 404, headers: noStore });
  }
  const active = await getDb().select({ id: memberships.id }).from(memberships)
    .where(and(
      eq(memberships.userId, actor.userId),
      eq(memberships.role, "provider"),
      eq(memberships.providerId, course.providerId),
      eq(memberships.status, "active"),
    )).limit(1);
  if (!active.length) return NextResponse.json({ error: "Not found" }, {
    status: 404, headers: noStore,
  });
  const uploads = await getDb().select({
    uploadId: mediaIngests.id,
    assetId: mediaIngests.assetId,
    title: mediaIngests.title,
    status: mediaIngests.status,
    expectedBytes: mediaIngests.expectedBytes,
    createdAt: mediaIngests.createdAt,
  }).from(mediaIngests).where(and(
    eq(mediaIngests.courseId, courseId),
    eq(mediaIngests.createdByUserId, actor.userId),
  )).orderBy(desc(mediaIngests.createdAt)).limit(20);
  return NextResponse.json({ uploads }, { headers: noStore });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string }> },
) {
  if (!validSameOrigin(request.headers.get("origin"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: noStore });
  }
  const actor = await getServerAccessContext();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, {
    status: 401, headers: noStore,
  });
  if (!actor.memberships.some((m) => m.role === "provider")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: noStore });
  }
  const { courseId } = await params;
  if (!uuid.safeParse(courseId).success) return NextResponse.json({
    error: "Not found",
  }, { status: 404, headers: noStore });
  if (!ingestAvailable()) return NextResponse.json({
    error: "Private ingest unavailable",
  }, { status: 503, headers: noStore });
  const parsed = reservation.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid upload metadata" }, {
    status: 400, headers: noStore,
  });
  try {
    const result = await reserveIngest(actor.userId, courseId, parsed.data);
    return NextResponse.json(result, {
      status: result.replayed ? 200 : 201, headers: noStore,
    });
  } catch (error) {
    if (!(error instanceof IngestError)) throw error;
    const status = error.kind === "not_provider" ? 403 :
      error.kind === "not_available" ? 404 : 409;
    return NextResponse.json({ error: error.kind }, { status, headers: noStore });
  }
}
