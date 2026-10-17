import { and, eq } from "drizzle-orm";
import { getDb } from "../../db";
import {
  coursePracticeQuestions, courses, educatorInstituteAffiliations,
  independentEducatorProfiles, memberships, privateMediaAssets, supervisionGrants,
} from "../../db/schema";

export type IndependentEducatorPublicationFailure =
  | "not_available" | "practice_review_pending";

export class IndependentEducatorPublicationError extends Error {
  constructor(readonly kind: IndependentEducatorPublicationFailure) { super(kind); }
}

/** Publish a supervised free course, serializing against affiliation revocation. */
export async function publishIndependentEducatorCourse(userId: string, courseId: string) {
  return getDb().transaction(async (tx) => {
    const [candidate] = await tx.select({
      profileId: courses.independentEducatorProfileId,
      instituteId: courses.responsibleInstituteId,
    }).from(courses).where(and(
      eq(courses.id, courseId), eq(courses.ownerType, "independent_educator"),
    )).limit(1);
    if (!candidate?.profileId) throw new IndependentEducatorPublicationError("not_available");

    // Revocation locks affiliation before transferring course rows. Match that
    // lock order so publishing cannot slip through after a revoke commits.
    const [affiliation] = await tx.select({ id: educatorInstituteAffiliations.id })
      .from(educatorInstituteAffiliations).where(and(
        eq(educatorInstituteAffiliations.educatorProfileId, candidate.profileId),
        eq(educatorInstituteAffiliations.instituteId, candidate.instituteId),
        eq(educatorInstituteAffiliations.status, "approved"),
      )).limit(1).for("share");
    const [student] = await tx.select({ id: memberships.id })
      .from(memberships).innerJoin(independentEducatorProfiles, and(
        eq(independentEducatorProfiles.id, candidate.profileId),
        eq(independentEducatorProfiles.userId, memberships.userId),
      )).where(and(
        eq(memberships.userId, userId), eq(memberships.role, "student"),
        eq(memberships.status, "active"),
      )).limit(1).for("share");
    if (!affiliation || !student) {
      throw new IndependentEducatorPublicationError("not_available");
    }

    const [course] = await tx.select().from(courses).where(and(
      eq(courses.id, courseId), eq(courses.ownerType, "independent_educator"),
      eq(courses.independentEducatorProfileId, candidate.profileId),
      eq(courses.responsibleInstituteId, candidate.instituteId),
    )).limit(1).for("update");
    if (!course || course.publicationStatus === "archived") {
      throw new IndependentEducatorPublicationError("not_available");
    }

    const [grant] = await tx.select().from(supervisionGrants).where(and(
      eq(supervisionGrants.courseId, course.id),
      eq(supervisionGrants.ownerType, "independent_educator"),
      eq(supervisionGrants.independentEducatorProfileId, candidate.profileId),
      eq(supervisionGrants.instituteId, candidate.instituteId),
      eq(supervisionGrants.status, "approved"),
    )).limit(1).for("share");
    if (!grant?.approvedByInstituteUserId || !grant.approvedAt) {
      throw new IndependentEducatorPublicationError("not_available");
    }
    const [approver] = await tx.select({ id: memberships.id })
      .from(memberships).where(and(
        eq(memberships.userId, grant.approvedByInstituteUserId),
        eq(memberships.role, "institute"),
        eq(memberships.instituteId, candidate.instituteId),
        eq(memberships.status, "active"),
      )).limit(1).for("share");
    const [video] = await tx.select({ id: privateMediaAssets.id })
      .from(privateMediaAssets).where(and(
        eq(privateMediaAssets.courseId, course.id),
        eq(privateMediaAssets.status, "ready"),
      )).limit(1).for("share");
    if (!approver || !video) {
      throw new IndependentEducatorPublicationError("not_available");
    }
    const [practice] = await tx.select({
      reviewStatus: coursePracticeQuestions.reviewStatus,
    }).from(coursePracticeQuestions).where(
      eq(coursePracticeQuestions.courseId, course.id),
    ).limit(1).for("share");
    if (practice?.reviewStatus === "pending") {
      throw new IndependentEducatorPublicationError("practice_review_pending");
    }
    if (course.publicationStatus === "published") {
      return { courseId, publicationStatus: "published" as const, replayed: true };
    }
    await tx.update(courses).set({
      publicationStatus: "published", publishedAt: new Date(),
    }).where(eq(courses.id, course.id));
    return { courseId, publicationStatus: "published" as const, replayed: false };
  });
}
