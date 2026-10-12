import { and, desc, eq, sql } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import {
  courses, denaAiContentPermissionEvents, memberships, privateMediaAssets,
} from "@/db/schema";
import { getServerAccessContext } from "@/server/access/actor";
import { validSameOrigin } from "@/server/access/role-application-contracts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "private, no-store, max-age=0" };
const uuid = z.uuid();
const decisionSchema = z.discriminatedUnion("decision", [
  z.object({
    decision: z.literal("granted"),
    assetId: uuid,
    requestId: uuid,
    rightsReviewRef: z.string().trim().min(8).max(200),
  }).strict(),
  z.object({
    decision: z.literal("revoked"),
    assetId: uuid,
    requestId: uuid,
    reason: z.string().trim().min(3).max(500),
  }).strict(),
]);

type RouteContext = { params: Promise<{ courseId: string }> };

async function scopedInstituteCourse(userId: string, courseId: string) {
  const [row] = await getDb().select({ id: courses.id })
    .from(courses)
    .innerJoin(memberships, and(
      eq(memberships.userId, userId),
      eq(memberships.role, "institute"),
      eq(memberships.status, "active"),
      eq(memberships.instituteId, courses.responsibleInstituteId),
    ))
    .where(eq(courses.id, courseId))
    .limit(1);
  return row ?? null;
}

/** List video titles and the latest permission state; never returns storage keys. */
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
      !await scopedInstituteCourse(actor.userId, courseId)) {
    return NextResponse.json({ error: "Not found" }, { status: 404, headers: noStore });
  }

  const assets = await getDb().select({
    assetId: privateMediaAssets.id,
    title: privateMediaAssets.title,
    mediaStatus: privateMediaAssets.status,
    permissionDecision: sql<string | null>`(
      SELECT event.decision
      FROM dena_ai_content_permission_events AS event
      WHERE event.asset_id = ${privateMediaAssets.id}
        AND event.course_id = ${privateMediaAssets.courseId}
      ORDER BY event.created_at DESC, event.id DESC
      LIMIT 1
    )`,
    changedAt: sql<Date | null>`(
      SELECT event.created_at
      FROM dena_ai_content_permission_events AS event
      WHERE event.asset_id = ${privateMediaAssets.id}
        AND event.course_id = ${privateMediaAssets.courseId}
      ORDER BY event.created_at DESC, event.id DESC
      LIMIT 1
    )`,
  }).from(privateMediaAssets)
    .where(eq(privateMediaAssets.courseId, courseId))
    .orderBy(desc(privateMediaAssets.createdAt))
    .limit(100);
  return NextResponse.json({ assets }, { headers: noStore });
}

/** Append a grant/revocation. Replays are idempotent by actor + requestId. */
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
  const parsed = decisionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid permission event" }, {
    status: 400, headers: noStore,
  });

  const input = parsed.data;
  const result = await getDb().transaction(async (tx) => {
    const [prior] = await tx.select({
      courseId: denaAiContentPermissionEvents.courseId,
      assetId: denaAiContentPermissionEvents.assetId,
      decision: denaAiContentPermissionEvents.decision,
      rightsReviewRef: denaAiContentPermissionEvents.rightsReviewRef,
      reason: denaAiContentPermissionEvents.reason,
    }).from(denaAiContentPermissionEvents)
      .where(and(
        eq(denaAiContentPermissionEvents.actorUserId, actor.userId),
        eq(denaAiContentPermissionEvents.requestId, input.requestId),
      ))
      .limit(1);
    if (prior) {
      const same = prior.courseId === courseId && prior.assetId === input.assetId &&
        prior.decision === input.decision &&
        prior.rightsReviewRef === (input.decision === "granted" ? input.rightsReviewRef : null) &&
        prior.reason === (input.decision === "revoked" ? input.reason : null);
      return same ? { kind: "replayed" as const } : { kind: "request_conflict" as const };
    }

    const [asset] = await tx.select({
      id: privateMediaAssets.id,
      instituteId: courses.responsibleInstituteId,
    })
      .from(courses)
      .innerJoin(memberships, and(
        eq(memberships.userId, actor.userId),
        eq(memberships.role, "institute"),
        eq(memberships.status, "active"),
        eq(memberships.instituteId, courses.responsibleInstituteId),
      ))
      .innerJoin(privateMediaAssets, and(
        eq(privateMediaAssets.courseId, courses.id),
        eq(privateMediaAssets.id, input.assetId),
        ...(input.decision === "granted"
          ? [eq(privateMediaAssets.status, "ready" as const)]
          : []),
      ))
      .where(and(
        eq(courses.id, courseId),
        ...(input.decision === "granted"
          ? [eq(courses.ownerType, "institute" as const)]
          : []),
      ))
      .limit(1);
    if (!asset) return { kind: "not_available" as const };

    await tx.insert(denaAiContentPermissionEvents).values({
      courseId,
      assetId: input.assetId,
      instituteId: asset.instituteId,
      actorUserId: actor.userId,
      requestId: input.requestId,
      decision: input.decision,
      rightsReviewRef: input.decision === "granted" ? input.rightsReviewRef : null,
      reason: input.decision === "revoked" ? input.reason : null,
    });
    return { kind: "created" as const };
  });

  if (result.kind === "request_conflict") return NextResponse.json({
    error: "Request id already used for another permission event",
  }, { status: 409, headers: noStore });
  if (result.kind === "not_available") return NextResponse.json({
    error: "Course or video unavailable",
  }, { status: 404, headers: noStore });
  return NextResponse.json({ ok: true, replayed: result.kind === "replayed" }, {
    status: result.kind === "created" ? 201 : 200,
    headers: noStore,
  });
}
