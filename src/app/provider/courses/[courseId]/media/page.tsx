import Link from "next/link";
import type { Metadata } from "next";
import { and, eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { Card } from "../../../../../components/ui/card";
import { MediaIngestForm } from "../../../../../components/provider/media-ingest-form";
import { getDb } from "../../../../../db";
import { courses, supervisionGrants } from "../../../../../db/schema";
import { getServerAccessContext } from "../../../../../server/access/actor";
import { ingestAvailable } from "../../../../../server/media/ingest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "دریافت ویدئوی آزمایشی | دنا",
  robots: { index: false, follow: false },
};

export default async function ProviderMediaPage({
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
    providerId: courses.providerId,
    publicationStatus: courses.publicationStatus,
    supervisionStatus: supervisionGrants.status,
  }).from(courses).innerJoin(supervisionGrants, and(
    eq(supervisionGrants.courseId, courses.id),
    eq(supervisionGrants.providerId, courses.providerId),
    eq(supervisionGrants.instituteId, courses.responsibleInstituteId),
  )).where(eq(courses.id, courseId)).limit(1);
  if (!course || !actor.memberships.some((m) =>
      m.role === "provider" && m.providerId === course.providerId)) notFound();
  const canSubmit = ingestAvailable() &&
    course.publicationStatus === "draft" &&
    course.supervisionStatus === "approved";
  return (
    <main id="main-content" className="mx-auto min-h-screen max-w-3xl px-5 py-8 md:py-14">
      <Link href="/provider/supervision"
        className="text-sm font-bold text-dena-brand hover:underline">
        بازگشت به دوره‌های من
      </Link>
      <Card className="mt-6 rounded-[24px] p-6 md:p-10">
        <p className="text-sm font-bold text-dena-brand">ارائه‌دهنده مجاز</p>
        <h1 className="mt-3 text-2xl font-extrabold">دریافت آزمایشی ویدئو</h1>
        <p className="mt-3 text-sm leading-8 text-dena-muted">{course.title}</p>
        <p className="mb-7 mt-3 text-sm leading-8 text-dena-muted">
          در این مرحله فقط فایل MP4 کوچک در قرنطینه دریافت می‌شود.
          هیچ فایلی صرفاً با آپلود «آماده» یا برای دانش‌آموز منتشر نمی‌شود.
          این پروکسی آزمایشی راهکار آپلود حجیم یا CDN نهایی نیست.
        </p>
        {canSubmit
          ? <MediaIngestForm courseId={courseId} />
          : <p role="status" className="rounded-xl bg-dena-bg p-5 text-sm leading-8 text-dena-muted">
            دریافت ویدئو در این محیط یا برای وضعیت فعلی دوره فعال نیست.
            دوره باید پیش‌نویس، مورد تأیید مؤسسه و متصل به origin خصوصی باشد.
          </p>}
      </Card>
    </main>
  );
}
