import { createHash } from "node:crypto";
import { and, desc, eq, sql } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import {
  courses, denaAiContentPermissionEvents, denaAiVideoTranscriptChunks,
  memberships, privateMediaAssets,
} from "@/db/schema";
import { getServerAccessContext } from "@/server/access/actor";
import { validSameOrigin } from "@/server/access/role-application-contracts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "private, no-store, max-age=0" };
const uuid = z.uuid();
const transcriptSchema = z.object({
  assetId: uuid,
  transcript: z.string().trim().min(80).max(20000),
}).strict();
type RouteContext = { params: Promise<{ courseId: string }> };

function splitTranscript(value: string): string[] {
  const normalized = value.replace(/\r\n?/gu, "\n")
    .replace(/[ \t]+/gu, " ").replace(/\n{3,}/gu, "\n\n").trim();
  const chunks: string[] = [];
  let current = "";
  for (const word of normalized.split(/\s+/u)) {
    const next = current ? current + " " + word : word;
    if (next.length > 900 && current) {
      chunks.push(current);
      current = word;
    } else current = next;
  }
  if (current) chunks.push(current);
  return chunks;
}

async function instituteCourse(userId: string, courseId: string) {
  const [row] = await getDb().select({ id: courses.id })
    .from(courses)
    .innerJoin(memberships, and(
      eq(memberships.userId, userId),
      eq(memberships.role, "institute"),
      eq(memberships.status, "active"),
      eq(memberships.instituteId, courses.responsibleInstituteId),
    ))
    .where(and(eq(courses.id, courseId), eq(courses.ownerType, "institute")))
    .limit(1);
  return row ?? null;
}

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const actor = await getServerAccessContext();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, {
    status: 401, headers: noStore,
  });
  if (!actor.memberships.some((entry) => entry.role === "institute")) {
    return NextResponse.json({ error: "Not found" }, { status: 404, headers: noStore });
  }
  const { courseId } = await params;
  if (!uuid.safeParse(courseId).success ||
      !await instituteCourse(actor.userId, courseId)) {
    return NextResponse.json({ error: "Not found" }, { status: 404, headers: noStore });
  }
  const assets = await getDb().select({
    assetId: privateMediaAssets.id,
    chunkCount: sql<number>`count(${denaAiVideoTranscriptChunks.id})::int`,
  }).from(privateMediaAssets)
    .leftJoin(denaAiVideoTranscriptChunks, and(
      eq(denaAiVideoTranscriptChunks.assetId, privateMediaAssets.id),
      eq(denaAiVideoTranscriptChunks.courseId, privateMediaAssets.courseId),
    ))
    .where(eq(privateMediaAssets.courseId, courseId))
    .groupBy(privateMediaAssets.id)
    .limit(100);
  return NextResponse.json({ assets }, { headers: noStore });
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  if (!validSameOrigin(request.headers.get("origin"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: noStore });
  }
  const actor = await getServerAccessContext();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, {
    status: 401, headers: noStore,
  });
  if (!actor.memberships.some((entry) => entry.role === "institute")) {
    return NextResponse.json({ error: "Not found" }, { status: 404, headers: noStore });
  }
  const { courseId } = await params;
  if (!uuid.safeParse(courseId).success) {
    return NextResponse.json({ error: "Not found" }, { status: 404, headers: noStore });
  }
  const parsed = transcriptSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid transcript" }, {
    status: 400, headers: noStore,
  });

  const normalized = parsed.data.transcript.replace(/\r\n?/gu, "\n")
    .replace(/[ \t]+/gu, " ").replace(/\n{3,}/gu, "\n\n").trim();
  const chunks = splitTranscript(normalized);
  const sourceSha256 = createHash("sha256").update(normalized, "utf8").digest("hex");
  const result = await getDb().transaction(async (tx) => {
    await tx.execute(sql`SELECT id FROM dena_private_media_assets
      WHERE id = ${parsed.data.assetId} AND course_id = ${courseId}
      FOR UPDATE`);
    const [asset] = await tx.select({ id: privateMediaAssets.id })
      .from(privateMediaAssets)
      .innerJoin(courses, and(
        eq(courses.id, privateMediaAssets.courseId),
        eq(courses.ownerType, "institute"),
      ))
      .innerJoin(memberships, and(
        eq(memberships.userId, actor.userId),
        eq(memberships.role, "institute"),
        eq(memberships.status, "active"),
        eq(memberships.instituteId, courses.responsibleInstituteId),
      ))
      .where(and(
        eq(privateMediaAssets.id, parsed.data.assetId),
        eq(privateMediaAssets.courseId, courseId),
        eq(privateMediaAssets.status, "ready"),
      ))
      .limit(1);
    if (!asset) return { kind: "unavailable" as const };

    const [permission] = await tx.select({
      decision: denaAiContentPermissionEvents.decision,
    }).from(denaAiContentPermissionEvents)
      .where(and(
        eq(denaAiContentPermissionEvents.assetId, asset.id),
        eq(denaAiContentPermissionEvents.courseId, courseId),
      ))
      .orderBy(desc(denaAiContentPermissionEvents.createdAt),
        desc(denaAiContentPermissionEvents.id))
      .limit(1);
    if (permission?.decision !== "granted") return { kind: "unavailable" as const };

    await tx.delete(denaAiVideoTranscriptChunks).where(and(
      eq(denaAiVideoTranscriptChunks.assetId, asset.id),
      eq(denaAiVideoTranscriptChunks.courseId, courseId),
    ));
    await tx.insert(denaAiVideoTranscriptChunks).values(chunks.map((chunkText, chunkIndex) => ({
      assetId: asset.id,
      courseId,
      createdByUserId: actor.userId,
      chunkIndex,
      chunkText,
      sourceSha256,
    })));
    return { kind: "created" as const, chunkCount: chunks.length };
  });

  if (result.kind === "unavailable") return NextResponse.json({
    error: "Course, video, or AI permission unavailable",
  }, { status: 404, headers: noStore });
  return NextResponse.json({
    saved: true, chunkCount: result.chunkCount, sourceSha256,
  }, { status: 201, headers: noStore });
}
