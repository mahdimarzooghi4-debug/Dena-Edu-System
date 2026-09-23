import { and, asc, eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getDb } from "../../../../../../db";
import { courses, mediaIngests } from "../../../../../../db/schema";
import { getServerAccessContext } from "../../../../../../server/access/actor";
import { validSameOrigin } from "../../../../../../server/access/role-application-contracts";
import {
  ingestAvailable, IngestError, MAX_PILOT_UPLOAD_BYTES, reserveIngest,
} from "../../../../../../server/media/ingest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "no-store" };
const input = z.object({
  title: z.string().trim().min(3).max(120),
  clientRequestId: z.uuid(),
  expectedBytes: z.number().int().min(16).max(MAX_PILOT_UPLOAD_BYTES),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
}).strict();

async function ownProvider(userId: string, courseId: string,
  providerIds: string[]): Promise<boolean> {
  const [course] = await getDb().select({
    providerId: courses.providerId,
  }).from(courses).where(eq(courses.id, courseId)).limit(1);
  return Boolean(course && providerIds.includes(course.providerId));
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ courseId: string }> },
) {
  const actor = await getServerAccessContext();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, {
    status: 401, headers: noStore,
  });
  const { courseId } = await params;
  if (!z.uuid().safeParse(courseId).success ||
      !await ownProvider(actor.userId, courseId, actor.memberships.flatMap(
        (role) => role.role === "provider" ? [role.providerId] : []))) {
    return NextResponse.json({ error: "Not found" }, {
      status: 404, headers: noStore,
    });
  }
  const uploads = await getDb().select({
    uploadId: mediaIngests.id,
    assetId: mediaIngests.assetId,
    title: mediaIngests.title,
    status: mediaIngests.status,
    createdAt: mediaIngests.createdAt,
  }).from(mediaIngests).where(and(
    eq(mediaIngests.courseId, courseId),
    eq(mediaIngests.createdByUserId, actor.userId),
  )).orderBy(asc(mediaIngests.createdAt)).limit(20);
  return NextResponse.json({ uploads }, { headers: noStore });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string }> },
) {
  if (!validSameOrigin(request.headers.get("origin"))) return NextResponse.json({
    error: "Forbidden",
  }, { status: 403, headers: noStore });
  const actor = await getServerAccessContext();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, {
    status: 401, headers: noStore,
  });
  const { courseId } = await params;
  if (!z.uuid().safeParse(courseId).success) return NextResponse.json({
    error: "Not found",
  }, { status: 404, headers: noStore });
  const parsed = input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, {
    status: 400, headers: noStore,
  });
  if (!ingestAvailable()) return NextResponse.json({
    error: "Private ingest unavailable",
  }, { status: 503, headers: noStore });
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
