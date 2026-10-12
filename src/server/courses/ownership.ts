import type { courses } from "../../db/schema";

type CourseOwnerProjection = Pick<typeof courses.$inferSelect, "ownerType" | "providerId">;

/** Narrow legacy provider-only flows explicitly. New owner types must get an
 * authorization path of their own instead of inheriting provider privileges. */
export function isVerifiedProviderCourse<T extends CourseOwnerProjection>(
  course: T,
): course is T & { ownerType: "verified_provider"; providerId: string } {
  return course.ownerType === "verified_provider" && course.providerId !== null;
}
