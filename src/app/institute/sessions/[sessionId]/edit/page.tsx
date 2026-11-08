import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { getServerAccessContext } from "../../../../../server/access/actor";
import { getInstituteCourseSessionAssets } from "../../../../../server/institute/dashboard";
import { getInstituteCourseDetail } from "../../../../../server/institute/course-detail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "ویرایش جلسه | دنا",
  robots: { index: false, follow: false },
};

const statusLabels = {
  ready: "بارگذاری شده",
  withdrawn: "برداشته شده",
} as const;

export default async function EditInstituteSessionPage({
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

  return (
    <main id="main-content" dir="rtl" className="min-h-screen bg-[#f8f7fc]">
      <header className="flex min-h-[72px] items-center justify-between gap-4 border-b border-[#e5e1ed] bg-white px-5 py-4 md:px-8">
        <div>
          <p className="text-xs text-[#7e7a94]">
            <Link href={`/institute/sessions?courseId=${courseId}`} className="hover:text-[#5b4ce2]">جلسات و محتوا</Link>
            <span aria-hidden="true"> &gt; </span>{course.title}
          </p>
          <h1 className="mt-1 text-xl font-extrabold text-[#1e1a33]">ویرایش جلسه</h1>
        </div>
        <Link href="/account" className="rounded-lg border border-[#e5e1ed] bg-[#f8f7fc] px-4 py-2 text-sm font-bold text-[#382973] hover:bg-[#eeeaff]">حساب من</Link>
      </header>

      <div className="mx-auto max-w-5xl space-y-5 p-5 md:p-8">
        <section className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-[#5b4ce2]">{course.title}</p>
            <h2 className="mt-1 text-2xl font-extrabold text-[#1e1a33]">ویرایش جلسه: {asset.title}</h2>
          </div>
          <div className="flex gap-2">
            <button type="button" disabled title="ذخیره جلسه هنوز در API پنل مؤسسه پشتیبانی نمی‌شود"
              className="cursor-not-allowed rounded-lg bg-[#5b4ce2]/50 px-4 py-2 text-sm font-bold text-white">ذخیره تغییرات</button>
            <Link href={`/institute/sessions/${sessionId}?courseId=${courseId}`}
              className="rounded-lg border border-[#e5e1ed] bg-white px-4 py-2 text-sm font-bold text-[#382973] hover:bg-[#eeeaff]">انصراف</Link>
          </div>
        </section>

        <section className="rounded-xl border border-[#e5e1ed] bg-white p-5 md:p-6">
          <h3 className="text-lg font-extrabold text-[#1e1a33]">بارگذاری فایل‌های جلسه</h3>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-dashed border-[#d7d2e5] bg-[#f8f7fc] p-5">
              <p className="text-sm font-bold text-[#1e1a33]">ویدیوی جلسه</p>
              <p className="mt-2 text-sm text-[#7e7a94]">{asset.title}</p>
              <p className="mt-1 text-xs text-[#7e7a94]">{statusLabels[asset.status]}</p>
              <button type="button" disabled title="بارگذاری فایل در API این پنل پیاده‌سازی نشده است"
                className="mt-4 w-full cursor-not-allowed rounded-lg border border-[#e5e1ed] bg-white px-4 py-3 text-sm font-bold text-[#aaa6b8]">بارگذاری ویدیوی جدید</button>
              <p className="mt-2 text-xs text-[#7e7a94]">حداکثر حجم ۵۰۰ مگابایت (MP4)</p>
            </div>
            <div className="rounded-xl border border-dashed border-[#d7d2e5] bg-[#f8f7fc] p-5">
              <p className="text-sm font-bold text-[#1e1a33]">فایل جزوه (PDF)</p>
              <p className="mt-2 text-sm text-[#7e7a94]">برای این محتوا جزوه‌ای ثبت نشده است.</p>
              <button type="button" disabled title="بارگذاری فایل در API این پنل پیاده‌سازی نشده است"
                className="mt-4 w-full cursor-not-allowed rounded-lg border border-[#e5e1ed] bg-white px-4 py-3 text-sm font-bold text-[#aaa6b8]">بارگذاری فایل جزوه (PDF)</button>
              <p className="mt-2 text-xs text-[#7e7a94]">حداکثر حجم ۵۰ مگابایت</p>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-[#e5e1ed] bg-white p-5 md:p-6">
          <h3 className="text-lg font-extrabold text-[#1e1a33]">مشخصات جلسه</h3>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm font-bold text-[#1e1a33]">
              عنوان محتوا
              <input value={asset.title} readOnly aria-readonly="true"
                className="min-h-11 w-full rounded-lg border border-[#e5e1ed] bg-[#f8f7fc] px-3 text-right font-normal text-[#1e1a33]" />
            </label>
            <label className="space-y-2 text-sm font-bold text-[#1e1a33]">
              ترتیب جلسه (عدد)
              <input value="—" readOnly aria-readonly="true"
                className="min-h-11 w-full rounded-lg border border-[#e5e1ed] bg-[#f8f7fc] px-3 text-right font-normal text-[#7e7a94]" />
              <span className="block text-xs font-normal text-[#7e7a94]">ترتیب جلسه در مدل فعلی ثبت نمی‌شود.</span>
            </label>
            <label className="space-y-2 text-sm font-bold text-[#1e1a33] md:col-span-2">
              توضیحات و درسنامه کوتاه
              <textarea value="" readOnly aria-readonly="true" placeholder="برای این محتوا توضیحی ثبت نشده است."
                className="min-h-28 w-full resize-y rounded-lg border border-[#e5e1ed] bg-[#f8f7fc] p-3 text-right text-sm font-normal text-[#1e1a33] placeholder:text-[#7e7a94]" />
            </label>
          </div>
        </section>

        <p role="note" className="rounded-lg border border-[#f0dfb3] bg-[#fff9eb] px-4 py-3 text-xs leading-6 text-[#7e6330]">
          این صفحه جزئیات واقعی ویدئوی دوره را نمایش می‌دهد. ویرایش عنوان، ترتیب، درسنامه و بارگذاری یا جایگزینی فایل‌ها تا زمان اضافه‌شدن مدل جلسه و API مربوطه غیرفعال است.
        </p>
      </div>
    </main>
  );
}
