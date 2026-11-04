import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getServerAccessContext } from "../../../../server/access/actor";
import { buttonClassName } from "../../../../components/ui/button";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "ایجاد دوره | دنا",
  robots: { index: false, follow: false },
};

export default async function NewInstituteCoursePage() {
  if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET ||
      !process.env.BETTER_AUTH_URL) redirect("/login");
  const actor = await getServerAccessContext();
  if (!actor) redirect("/login");
  if (!actor.memberships.some((membership) => membership.role === "institute")) {
    notFound();
  }

  return (
    <main id="main-content" dir="rtl" className="min-h-screen bg-[#f8f7fc]">
      <header className="flex min-h-[72px] items-center justify-between gap-4 border-b border-[#e5e1ed] bg-white px-5 py-4 md:px-8">
        <div>
          <p className="text-xs text-[#7e7a94]">دوره‌ها &gt; ایجاد دوره</p>
          <h1 className="mt-1 text-xl font-extrabold text-[#1e1a33]">ایجاد دوره جدید</h1>
        </div>
        <Link href="/institute/courses" className="rounded-lg border border-[#e5e1ed] bg-[#f8f7fc] px-4 py-2 text-sm font-bold text-[#382973] hover:bg-[#eeeaff]">
          بازگشت به دوره‌ها
        </Link>
      </header>

      <div className="p-5 md:p-8">
        <form className="space-y-6 rounded-xl border border-[#e5e1ed] bg-white p-5 md:p-7" aria-describedby="course-create-status">
          <div className="grid gap-5 md:grid-cols-2">
            <label className="space-y-2 text-sm font-bold text-[#1e1a33]">
              <span>مدرس دوره</span>
              <select disabled className="min-h-11 w-full rounded-lg border border-[#e5e1ed] bg-[#f8f7fc] px-3 text-right font-normal text-[#7e7a94]">
                <option>انتخاب مدرس...</option>
              </select>
            </label>
            <label className="space-y-2 text-sm font-bold text-[#1e1a33]">
              <span>نام دوره</span>
              <input disabled type="text" placeholder="مانند ریاضی دهم تجربی" className="min-h-11 w-full rounded-lg border border-[#e5e1ed] bg-[#f8f7fc] px-3 text-right font-normal placeholder:text-[#7e7a94]" />
            </label>
          </div>

          <label className="block space-y-2 text-sm font-bold text-[#1e1a33]">
            <span>توضیحات دوره</span>
            <textarea disabled rows={5} placeholder="جزئیات، سرفصل‌ها و اهداف دوره را بنویسید..." className="w-full resize-y rounded-lg border border-[#e5e1ed] bg-[#f8f7fc] p-3 text-right font-normal placeholder:text-[#7e7a94]" />
          </label>

          <div className="grid gap-5 md:grid-cols-2">
            <label className="space-y-2 text-sm font-bold text-[#1e1a33]">
              <span>رشته تحصیلی</span>
              <select disabled className="min-h-11 w-full rounded-lg border border-[#e5e1ed] bg-[#f8f7fc] px-3 text-right font-normal text-[#7e7a94]">
                <option>انتخاب رشته تحصیلی</option>
              </select>
            </label>
            <label className="space-y-2 text-sm font-bold text-[#1e1a33]">
              <span>پایه تحصیلی</span>
              <select disabled className="min-h-11 w-full rounded-lg border border-[#e5e1ed] bg-[#f8f7fc] px-3 text-right font-normal text-[#7e7a94]">
                <option>انتخاب پایه تحصیلی</option>
              </select>
            </label>
          </div>

          <p id="course-create-status" role="status" className="rounded-lg border border-[#f0dfb3] bg-[#fff9eb] px-4 py-3 text-sm leading-7 text-[#7e6330]">
            فرم مطابق طرح فیگما آماده شده است. ثبت دوره هنوز در API و مدل دادهٔ این پنل پیاده‌سازی نشده؛ برای جلوگیری از ثبت ناقص، فیلدها و دکمهٔ ذخیره فعلاً غیرفعال هستند.
          </p>

          <div className="flex flex-wrap gap-3">
            <button type="button" disabled title="ثبت دوره هنوز در API این پنل پیاده‌سازی نشده است" className="inline-flex min-h-10 cursor-not-allowed items-center justify-center rounded-lg bg-[#5b4ce2]/50 px-5 py-2 text-sm font-bold text-white">
              ذخیره
            </button>
            <Link href="/institute/courses" className={buttonClassName("secondary")}>انصراف</Link>
          </div>
        </form>
      </div>
    </main>
  );
}
