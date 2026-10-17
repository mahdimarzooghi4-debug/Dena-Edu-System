import Link from "next/link";
import type { Metadata } from "next";
import { and, eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { MultipartPlanningForm } from "../../../../../../components/provider/multipart-planning-form";
import { Card } from "../../../../../../components/ui/card";
import { getDb } from "../../../../../../db";
import {
  courses, educatorInstituteAffiliations, independentEducatorProfiles, supervisionGrants,
} from "../../../../../../db/schema";
import { getServerAccessContext } from "../../../../../../server/access/actor";
import { multipartPlanningEnabled } from "../../../../../../server/media/multipart-control";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "برنامه‌ریزی ویدئوی حجیم | دنا",
  robots: { index: false, follow: false },
};

export default async function IndependentEducatorMediaPage({
  params,
}: { params: Promise<{ courseId: string }> }) {
  if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET ||
      !process.env.BETTER_AUTH_URL) redirect("/login");
  const actor = await getServerAccessContext();
  if (!actor) redirect("/login");
  const { courseId } = await params;
  if (!z.uuid().safeParse(courseId).success) notFound();
  const [course] = await getDb().select({
    id: courses.id, title: courses.title,
    publicationStatus: courses.publicationStatus,
    affiliationStatus: educatorInstituteAffiliations.status,
    supervisionStatus: supervisionGrants.status,
  }).from(courses).innerJoin(independentEducatorProfiles, and(
    eq(independentEducatorProfiles.id, courses.independentEducatorProfileId),
    eq(independentEducatorProfiles.userId, actor.userId),
  )).innerJoin(educatorInstituteAffiliations, and(
    eq(educatorInstituteAffiliations.educatorProfileId,
      independentEducatorProfiles.id),
    eq(educatorInstituteAffiliations.instituteId, courses.responsibleInstituteId),
  )).innerJoin(supervisionGrants, and(
    eq(supervisionGrants.courseId, courses.id),
    eq(supervisionGrants.independentEducatorProfileId, independentEducatorProfiles.id),
    eq(supervisionGrants.instituteId, courses.responsibleInstituteId),
  )).where(and(
    eq(courses.id, courseId), eq(courses.ownerType, "independent_educator"),
  )).limit(1);
  if (!course || !actor.memberships.some(m => m.role === "student")) notFound();
  const canCreate = course.publicationStatus === "draft" &&
    course.affiliationStatus === "approved" && course.supervisionStatus === "approved";
  return (
    <main id="main-content" className="mx-auto min-h-screen max-w-3xl px-5 py-8 md:py-14">
      <Link href="/account/independent-educator"
        className="text-sm font-bold text-dena-brand hover:underline">
        بازگشت به دوره‌های من
      </Link>
      <Card className="mt-6 rounded-[24px] p-6 md:p-10">
        <p className="text-sm font-bold text-dena-brand">مدرس مستقل زیرنظر مؤسسه</p>
        <h1 className="mt-3 text-2xl font-extrabold">برنامه‌ریزی ویدئوی حجیم</h1>
        <p className="mt-3 text-sm leading-8 text-dena-muted">{course.title}</p>
        <p className="my-5 text-sm leading-8 text-dena-muted">
          این کنترل‌پلین فقط طرح بی‌اثر آپلود را ثبت می‌کند؛ هیچ فایل، نشست ذخیره‌سازی
          یا مجوز بارگذاری صادر نمی‌شود.
        </p>
        {multipartPlanningEnabled()
          ? <MultipartPlanningForm courseId={courseId} apiRoot="/api/independent-educator"
              canCreate={canCreate} />
          : <p role="status" className="rounded-xl bg-dena-bg p-5 text-sm leading-8 text-dena-muted">
            برنامه‌ریزی آپلود حجیم در این محیط فعال نیست.
          </p>}
      </Card>
    </main>
  );
}
