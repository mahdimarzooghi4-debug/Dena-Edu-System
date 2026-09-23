import { and, eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getDb } from "../../../../../../db";
import { coursePracticeQuestions, courses, memberships, privateMediaAssets, supervisionGrants } from "../../../../../../db/schema";
import { getServerAccessContext } from "../../../../../../server/access/actor";
import { validSameOrigin } from "../../../../../../server/access/role-application-contracts";
import { configuredPrivateMediaOrigin } from "../../../../../../server/student/private-media";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "no-store" };
const input = z.object({ action: z.literal("publish") }).strict();

/** Free-course publication only; must be supervised by the very same institute
 * and requested by an active provider within the same scope.
 */
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
  const { courseId } = await params;
  if (!z.uuid().safeParse(courseId).success) return NextResponse.json({
    error: "Not found",
  }, { status: 404, headers: noStore });
  const parsed = input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, {
    status: 400, headers: noStore,
  });
  // Free-video launch is unavailable until private delivery is configured.
  if (!configuredPrivateMediaOrigin()) return NextResponse.json({
    error: "Private media unavailable",
  }, { status: 503, headers: noStore });
  const result = await getDb().transaction(async (tx) => {
    const [course] = await tx.select().from(courses)
      .where(eq(courses.id, courseId)).limit(1).for("update");
    if (!course || !actor.memberships.some((entry) => entry.role === "provider"
        && entry.providerId === course.providerId)) return null;
    const [provider] = await tx.select({ id: memberships.id })
      .from(memberships).where(and(
        eq(memberships.userId, actor.userId),
        eq(memberships.role, "provider"),
        eq(memberships.providerId, course.providerId),
        eq(memberships.status, "active"),
      )).limit(1).for("share");
    if (!provider) return null;
    const [grant] = await tx.select().from(supervisionGrants).where(and(
      eq(supervisionGrants.courseId, course.id),
      eq(supervisionGrants.providerId, course.providerId),
      eq(supervisionGrants.instituteId, course.responsibleInstituteId),
      eq(supervisionGrants.status, "approved"),
    )).limit(1).for("share");
    if (!grant?.approvedByInstituteUserId || !grant.approvedAt ||
        course.publicationStatus === "archived") return null;
    const [approver] = await tx.select({ id: memberships.id })
      .from(memberships).where(and(
        eq(memberships.userId, grant.approvedByInstituteUserId),
        eq(memberships.role, "institute"),
        eq(memberships.instituteId, course.responsibleInstituteId),
        eq(memberships.status, "active"),
      )).limit(1).for("share");
    if (!approver) return null;
    const [video] = await tx.select({ id: privateMediaAssets.id })
      .from(privateMediaAssets).where(and(
        eq(privateMediaAssets.courseId, course.id),
        eq(privateMediaAssets.status, "ready"),
      )).limit(1).for("share");
    if (!video) return null;
    const [practice] = await tx.select({
      reviewStatus: coursePracticeQuestions.reviewStatus,
    }).from(coursePracticeQuestions).where(
      eq(coursePracticeQuestions.courseId, course.id),
    ).limit(1).for("share");
    if (practice?.reviewStatus === "pending") {
      return { blocked: "practice_review_pending" as const };
    }
    if (course.publicationStatus === "published") {
      return { courseId, publicationStatus: "published" as const, replayed: true };
    }
    await tx.update(courses).set({
      publicationStatus: "published", publishedAt: new Date(),
    }).where(eq(courses.id, courseId));
    return { courseId, publicationStatus: "published" as const, replayed: false };
  });
  if (result && "blocked" in result) {
    return NextResponse.json({ error: result.blocked }, {
      status: 409, headers: noStore,
    });
  }
  return result ? NextResponse.json(result, { headers: noStore })
    : NextResponse.json({ error: "Not found" }, {
      status: 404, headers: noStore,
    });
}
