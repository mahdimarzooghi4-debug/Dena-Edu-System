import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { getServerAccessContext } from "../../../../../server/access/actor";
import { getInstituteCourseDetail } from "../../../../../server/institute/course-detail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "ویرایش دوره | دنا",
  robots: { index: false, follow: false },
};

export default async function EditInstituteCoursePage({
  params,
}: { params: Promise<{ courseId: string }> }) {
  if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET ||
      !process.env.BETTER_AUTH_URL) redirect("/login");
  const actor = await getServerAccessContext();
  if (!actor) redirect("/login");
  const { courseId } = await params;
  if (!z.uuid().safeParse(courseId).success) notFound();
  const scopes = [...new Set(actor.memberships.flatMap((membership) =>
    membership.role === "institute" ? [membership.instituteId] : []))];
  if (!scopes.length) notFound();
  const course = await getInstituteCourseDetail(scopes, courseId);
  if (!course) notFound();

  return (
    <main id="main-content" dir="rtl" className="min-h-screen bg-[#f8f7fc]">
      <header className="flex min-h-[72px] items-center justify-between gap-4 border-b border-[#e5e1ed] bg-white px-5 py-4 md:px-8">
        <div>
          <p className="text-xs text-[#7e7a94]">دوره‌ها &gt; ویرایش دوره</p>
          <h1 className="mt-1 text-xl font-extrabold text-[#1e1a33]">ویرایش دوره — {course.title}</h1>
        </div>
        <Link href={`/institute/courses/${courseId}`} className="rounded-lg border border-[#e5e1ed] bg-[#f8f7fc] px-4 py-2 text-sm font-bold text-[#382973] hover:bg-[#eeeaff]">
          بازگشت به جزئیات
        </Link>
      </header>

      <div className="p-5 md:p-8">
        <form className="space-y-6 rounded-xl border border-[#e5e1ed] bg-white p-5 md:p-7" aria-describedby="course-edit-status">
          <div className="grid gap-5 md:grid-cols-2">
            <label className="space-y-2 text-sm font-bold text-[#1e1a33]">
              <span>مدرس دوره</span>
              <input disabled value={course.providerName ?? course.independentEducatorName ?? "مؤسسهٔ مسئول"} className="min-h-11 w-full rounded-lg border border-[#e5e1ed] bg-[#f8f7fc] px-3 text-right font-bold text-[#1e1a33] disabled:opacity-100" />
            </label>
            <label className="space-y-2 text-sm font-bold text-[#1e1a33]">
              <span>نام دوره</span>
              <input disabled value={course.title} className="min-h-11 w-full rounded-lg border border-[#e5e1ed] bg-[#f8f7fc] px-3 text-right font-bold text-[#1e1a33] disabled:opacity-100" />
            </label>
          </div>

          <label className="block space-y-2 text-sm font-bold text-[#1e1a33]">
            <span>توضیحات دوره</span>
            <textarea disabled rows={5} placeholder="توضیحات متنی برای این دوره ثبت نشده است." className="w-full resize-y rounded-lg border border-[#e5e1ed] bg-[#f8f7fc] p-3 text-right font-normal placeholder:text-[#7e7a94]" />
          </label>

          <div className="grid gap-5 md:grid-cols-2">
            <label className="space-y-2 text-sm font-bold text-[#1e1a33]">
              <span>رشته تحصیلی</span>
              <select disabled className="min-h-11 w-full rounded-lg border border-[#e5e1ed] bg-[#f8f7fc] px-3 text-right font-normal text-[#7e7a94]">
                <option>اطلاعات رشته در دسترس نیست</option>
              </select>
            </label>
            <label className="space-y-2 text-sm font-bold text-[#1e1a33]">
              <span>پایه تحصیلی</span>
              <select disabled className="min-h-11 w-full rounded-lg border border-[#e5e1ed] bg-[#f8f7fc] px-3 text-right font-normal text-[#7e7a94]">
                <option>اطلاعات پایه در دسترس نیست</option>
              </select>
            </label>
          </div>

          <p id="course-edit-status" role="status" className="rounded-lg border border-[#f0dfb3] bg-[#fff9eb] px-4 py-3 text-sm leading-7 text-[#7e6330]">
            اطلاعاتی که در مخزن ثبت شده‌اند نمایش داده می‌شوند. مدل دادهٔ فعلی توضیحات، رشته و پایه را نگه نمی‌دارد و API ویرایش دوره هم آماده نیست؛ برای جلوگیری از تغییر ناقص، فرم و ذخیره فعلاً غیرفعال هستند.
          </p>

          <div className="flex flex-wrap gap-3">
            <button type="button" disabled title="ذخیرهٔ ویرایش دوره هنوز در API این پنل پیاده‌سازی نشده است" className="inline-flex min-h-10 cursor-not-allowed items-center justify-center rounded-lg bg-[#5b4ce2]/50 px-5 py-2 text-sm font-bold text-white">
              ذخیره تغییرات
            </button>
            <Link href={`/institute/courses/${courseId}`} className="inline-flex min-h-10 items-center justify-center rounded-lg border border-[#e5e1ed] px-5 py-2 text-sm font-bold text-[#1e1a33] hover:bg-[#f8f7fc]">
              انصراف
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}
