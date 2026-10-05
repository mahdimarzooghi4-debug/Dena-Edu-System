import { and, asc, eq, exists, gt, ilike, or } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { z } from "zod";
import { getDb } from "../../db";
import {
  courses, independentEducatorProfiles, providerInstituteCollaborations,
  studentEnrollments, supervisionGrants, verifiedEntities,
} from "../../db/schema";
import { listedFreeCourse } from "./entitlement";

const catalogProvider = alias(verifiedEntities, "student_catalog_course_provider");
const catalogInstitute = alias(verifiedEntities, "student_catalog_course_institute");

const PAGE_SIZE = 20;
const cursorShape = z.object({
  title: z.string().min(1).max(160),
  id: z.uuid(),
  q: z.string().max(80),
  mine: z.boolean(),
}).strict();

export class InvalidCourseCatalogQuery extends Error {
  constructor() { super("invalid_catalog_query"); }
}

/** Cursor is untrusted pagination metadata, NOT an access capability. */
export function readCatalogQuery(searchParams: URLSearchParams) {
  if (["q", "mine", "cursor"].some((name) =>
    searchParams.getAll(name).length > 1)) throw new InvalidCourseCatalogQuery();
  const rawQuery = searchParams.get("q") ?? "";
  // Reject control bytes BEFORE trim, which would silently drop a trailing LF.
  if (rawQuery.length > 80 || /[\u0000-\u001f\u007f]/u.test(rawQuery)) {
    throw new InvalidCourseCatalogQuery();
  }
  const q = rawQuery.trim();
  const mineRaw = searchParams.get("mine");
  if (mineRaw !== null && mineRaw !== "1") throw new InvalidCourseCatalogQuery();
  const mine = mineRaw === "1";
  const raw = searchParams.get("cursor");
  if (raw === null) return { q, mine, cursor: null };
  if (raw.length === 0) throw new InvalidCourseCatalogQuery();
  if (raw.length > 2048 || !/^[A-Za-z0-9_-]+$/u.test(raw)) {
    throw new InvalidCourseCatalogQuery();
  }
  try {
    const parsed: unknown = JSON.parse(Buffer.from(raw, "base64url").toString("utf8"));
    const cursor = cursorShape.parse(parsed);
    if (cursor.q !== q || cursor.mine !== mine) {
      throw new InvalidCourseCatalogQuery();
    }
    return { q, mine, cursor };
  } catch {
    throw new InvalidCourseCatalogQuery();
  }
}

/** Literal substring search; user-supplied %, _ and backslash cannot
 * expand the PostgreSQL ILIKE pattern to unrelated course titles.
 */
export function escapeCatalogSearch(text: string) {
  return text.replace(/[\\%_]/gu, "\\$&");
}

export async function listStudentCatalog(
  studentUserId: string,
  query: ReturnType<typeof readCatalogQuery>,
) {
  const db = getDb();
  const ownActiveEnrollment = exists(db.select({ id: studentEnrollments.id })
    .from(studentEnrollments).where(and(
      eq(studentEnrollments.courseId, courses.id),
      eq(studentEnrollments.studentUserId, studentUserId),
      eq(studentEnrollments.status, "active"),
    )));
  const rows = await db.select({
    courseId: courses.id,
    title: courses.title,
    ownerType: courses.ownerType,
    providerId: courses.providerId,
    providerName: catalogProvider.name,
    independentEducatorName: independentEducatorProfiles.displayName,
    responsibleInstituteId: courses.responsibleInstituteId,
    instituteName: catalogInstitute.name,
    providerCollaborationApproved: exists(db.select({ id: providerInstituteCollaborations.id })
      .from(providerInstituteCollaborations).where(and(
        eq(providerInstituteCollaborations.providerId, courses.providerId),
        eq(providerInstituteCollaborations.instituteId, courses.responsibleInstituteId),
        eq(providerInstituteCollaborations.status, "approved"),
      ))),
    enrolled: ownActiveEnrollment,
  }).from(courses).innerJoin(
    supervisionGrants, eq(supervisionGrants.courseId, courses.id),
  ).leftJoin(catalogProvider, and(
    eq(catalogProvider.id, courses.providerId), eq(catalogProvider.role, "provider"),
  )).leftJoin(independentEducatorProfiles, eq(
    independentEducatorProfiles.id, courses.independentEducatorProfileId,
  )).innerJoin(catalogInstitute, and(
    eq(catalogInstitute.id, courses.responsibleInstituteId),
    eq(catalogInstitute.role, "institute"),
  )).where(and(
    listedFreeCourse(db),
    query.q ? ilike(courses.title, `%${escapeCatalogSearch(query.q)}%`) : undefined,
    query.mine ? ownActiveEnrollment : undefined,
    query.cursor ? or(
      gt(courses.title, query.cursor.title),
      and(eq(courses.title, query.cursor.title),
        gt(courses.id, query.cursor.id)),
    ) : undefined,
  )).orderBy(asc(courses.title), asc(courses.id)).limit(PAGE_SIZE + 1);

  const hasMore = rows.length > PAGE_SIZE;
  const visible = rows.slice(0, PAGE_SIZE);
  const last = visible.at(-1);
  return {
    courses: visible.map((row) => ({ ...row, free: true as const })),
    nextCursor: hasMore && last ? Buffer.from(JSON.stringify({
      title: last.title, id: last.courseId, q: query.q, mine: query.mine,
    })).toString("base64url") : null,
  };
}
