import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { getServerAccessContext } from "../../../../server/access/actor";
import { getInstituteCourseSessionAssets } from "../../../../server/institute/dashboard";
import { getInstituteCourseDetail } from "../../../../server/institute/course-detail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "جزئیات جلسه | دنا",
  robots: { index: false, follow: false },
};

const statusLabels = {
  ready: "بارگذاری شده",
  withdrawn: "برداشته شده",
} as const;

export default async function InstituteSessionDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ sessionId: string }>;
  searchParams: Promise<{ courseId?: string }>;
}) {
  if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET ||
      !process.env.BETTER_AUTH_URL) redirect("/login");
  const actor = await getServerAccessContext();
  if (!actor) redirect("/login");

  const [{ sessionId }, { courseId }] = await Promise.all([params, searchParams]);
  if (!z.uuid().safeParse(sessionId).success ||
      !courseId || !z.uuid().safeParse(courseId).success) notFound();

  const instituteIds = [...new Set(actor.memberships.flatMap((membership) =>
    membership.role === "institute" ? [membership.instituteId] : []))];
  if (!instituteIds.length) notFound();

  const course = await getInstituteCourseDetail(instituteIds, courseId);
  if (!course) notFound();
  const assets = await getInstituteCourseSessionAssets(instituteIds, courseId);
  const asset = assets.find((item) => item.assetId === sessionId);
  if (!asset) notFound();

  const statusClass = asset.status === "ready"
    ? "bg-[#e6f7f0] text-[#10b981]"
    : "bg-[#f8f7fc] text-[#7e7a94]";

  return (
    <main id="main-content" dir="rtl" className="min-h-screen bg-[#f8f7fc]">
      <header className="flex min-h-[72px] items-center justify-between gap-4 border-b border-[#e5e1ed] bg-white px-5 py-4 md:px-8">
        <div>
          <p className="text-xs text-[#7e7a94]">
            <Link href="/institute/sessions" className="hover:text-[#5b4ce2]">جلسات و محتوا</Link>
            <span aria-hidden="true"> &gt; </span>{course.title}
          </p>
          <h1 className="mt-1 text-xl font-extrabold text-[#1e1a33]">جزئیات جلسه</h1>
        </div>
        <Link href="/account" className="rounded-lg border border-[#e5e1ed] bg-[#f8f7fc] px-4 py-2 text-sm font-bold text-[#382973] hover:bg-[#eeeaff]">حساب من</Link>
      </header>

      <div className="space-y-5 p-5 md:p-8">
        <section className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-extrabold text-[#1e1a33]">{asset.title}</h2>
            <p className="mt-2 text-sm text-[#7e7a94]">{course.title}</p>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" disabled title="ویرایش جلسه هنوز در API این پنل پشتیبانی نمی‌شود"
              className="cursor-not-allowed rounded-lg bg-[#5b4ce2]/50 px-4 py-2 text-sm font-bold text-white">ویرایش جلسه</button>
            <Link href={`/institute/sessions?courseId=${courseId}`}
              className="rounded-lg border border-[#e5e1ed] bg-white px-4 py-2 text-sm font-bold text-[#382973] hover:bg-[#eeeaff]">بازگشت به لیست</Link>
          </div>
        </section>

        <section className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.8fr)]">
          <div className="space-y-5">
            <article className="rounded-xl border border-[#e5e1ed] bg-white p-5 md:p-6">
              <h3 className="text-lg font-extrabold text-[#1e1a33]">اطلاعات کلی جلسه</h3>
              <dl className="mt-5 grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg bg-[#f8f7fc] p-4">
                  <dt className="text-xs text-[#7e7a94]">عنوان محتوا</dt>
                  <dd className="mt-2 font-bold text-[#1e1a33]">{asset.title}</dd>
                </div>
                <div className="rounded-lg bg-[#f8f7fc] p-4">
                  <dt className="text-xs text-[#7e7a94]">دوره آموزشی</dt>
                  <dd className="mt-2 font-bold text-[#1e1a33]">{course.title}</dd>
                </div>
                <div className="rounded-lg bg-[#f8f7fc] p-4">
                  <dt className="text-xs text-[#7e7a94]">وضعیت محتوا</dt>
                  <dd className={`mt-2 inline-flex rounded px-2 py-1 text-sm font-bold ${statusClass}`}>{statusLabels[asset.status]}</dd>
                </div>
                <div className="rounded-lg bg-[#f8f7fc] p-4">
                  <dt className="text-xs text-[#7e7a94]">تاریخ ثبت</dt>
                  <dd className="mt-2 font-bold text-[#1e1a33]">{asset.createdAt.toLocaleDateString("fa-IR")}</dd>
                </div>
              </dl>
            </article>

            <article className="rounded-xl border border-[#e5e1ed] bg-white p-5 md:p-6">
              <h3 className="text-lg font-extrabold text-[#1e1a33]">محتوای آموزشی</h3>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-[#f8f7fc] p-4">
                <div>
                  <p className="font-bold text-[#1e1a33]">{asset.title}</p>
                  <p className="mt-1 text-sm text-[#7e7a94]">ویدئوی ثبت‌شده برای دوره</p>
                </div>
                <span className={`rounded px-2 py-1 text-xs font-bold ${statusClass}`}>{statusLabels[asset.status]}</span>
              </div>
            </article>
          </div>

          <aside className="space-y-5">
            <section className="rounded-xl border border-[#e5e1ed] bg-white p-5 md:p-6">
              <h3 className="text-lg font-extrabold text-[#1e1a33]">آزمون مرتبط</h3>
              <p className="mt-3 text-sm leading-7 text-[#7e7a94]">آزمون جداگانه‌ای برای این جلسه در داده‌های موجود ثبت نشده است.</p>
            </section>
            <section className="rounded-xl border border-[#e5e1ed] bg-white p-5 md:p-6">
              <h3 className="text-lg font-extrabold text-[#1e1a33]">آمار بازدید جلسه</h3>
              <p className="mt-3 text-sm leading-7 text-[#7e7a94]">آمار تماشا و دانلود در مدل فعلی ذخیره نمی‌شود.</p>
            </section>
          </aside>
        </section>

        <p role="note" className="rounded-lg border border-[#f0dfb3] bg-[#fff9eb] px-4 py-3 text-xs leading-6 text-[#7e6330]">
          در سامانه فعلی، محتوای این صفحه از اطلاعات واقعی ویدئوی دوره ساخته شده است. شماره و مدت جلسه، مدرس، جزوه، آزمون اختصاصی و آمار بازدید تا زمان پشتیبانی مدل و API نمایش داده نمی‌شوند.
        </p>
      </div>
    </main>
  );
}
