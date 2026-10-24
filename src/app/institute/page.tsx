import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { buttonClassName } from "../../components/ui/button";
import { getServerAccessContext } from "../../server/access/actor";
import { getInstituteDashboardCourses } from "../../server/institute/dashboard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "خانه مؤسسه | دنا",
  robots: { index: false, follow: false },
};

const supervisionLabels = {
  requested: "در انتظار تصمیم مؤسسه",
  approved: "نظارت همین دوره تأیید شده",
  revoked: "نظارت رد یا لغو شده",
} as const;
const publicationLabels = {
  draft: "پیش‌نویس",
  published: "منتشرشده",
  archived: "بایگانی‌شده",
} as const;
const practiceLabels = {
  not_created: "ثبت نشده",
  pending: "در انتظار بازبینی مستقل مؤسسه",
  approved: "تأییدشده برای نمایش به دانش‌آموز",
  rejected: "ردشده و از دانش‌آموز پنهان",
} as const;

export default async function InstituteHomePage() {
  if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET ||
      !process.env.BETTER_AUTH_URL) redirect("/login");
  const actor = await getServerAccessContext();
  if (!actor) redirect("/login");
  const instituteIds = [...new Set(actor.memberships.flatMap((item) =>
    item.role === "institute" ? [item.instituteId] : []))];
  if (!instituteIds.length) notFound();

  const { courses, hasMore } = await getInstituteDashboardCourses(instituteIds);
  // Only within the same visible, currently institute-scoped 20-course slice.
  const pendingPractices = courses.filter((course) =>
    course.supervisionStatus === "approved" &&
    course.practiceReviewStatus === "pending").length;
  const pendingLearningAssessments = courses
    .filter((course) => course.supervisionStatus === "approved" &&
      course.publicationStatus === "draft")
    .reduce((total, course) => total +
      course.learningAssessmentReviews.pending, 0);
  const pendingSupervision = courses.filter((course) =>
    course.supervisionStatus === "requested").length;
  const publishedCourses = courses.filter((course) =>
    course.supervisionStatus === "approved" &&
    course.publicationStatus === "published").length;
  const activeEnrollments = courses.reduce((total, course) =>
    total + course.activeEnrollmentCount, 0);
  const itemsNeedingAttention = pendingSupervision + pendingPractices +
    pendingLearningAssessments;
  const stats = [
    {
      label: "دوره‌های منتشرشده در فهرست نظارت",
      value: publishedCourses,
      detail: "از حداکثر ۲۰ دورهٔ اخیر",
      symbol: "▤",
      tone: "bg-[#eeeaff] text-[#5b4ce2]",
    },
    {
      label: "ثبت‌نام‌های فعال همین دوره‌ها",
      value: activeEnrollments,
      detail: "ممکن است یک دانش‌آموز چند ثبت‌نام داشته باشد",
      symbol: "◉",
      tone: "bg-[#e8f5ef] text-[#24845a]",
    },
    {
      label: "درخواست‌های نظارت",
      value: pendingSupervision,
      detail: "در انتظار تصمیم مؤسسه",
      symbol: "◷",
      tone: "bg-[#fff3df] text-[#b7791f]",
    },
    {
      label: "موارد نیازمند بررسی",
      value: itemsNeedingAttention,
      detail: "تمرین، ارزیابی یادگیری و نظارت",
      symbol: "!",
      tone: "bg-[#fff0f0] text-[#c04c4c]",
    },
  ];
  return (
    <main id="main-content" dir="rtl" className="min-h-screen bg-[#f8f7fc]">
      <header className="flex min-h-[72px] items-center justify-between border-b border-[#e5e1ed] bg-white px-5 py-4 md:px-8">
        <div>
          <h1 className="text-xl font-extrabold text-[#1e1a33]">داشبورد</h1>
          <p className="mt-1 text-xs text-[#7e7a94]">نمای کلی عملیات مؤسسه</p>
        </div>
        <Link href="/account" className="rounded-lg border border-[#e5e1ed] bg-[#f8f7fc] px-4 py-2 text-sm font-bold text-[#382973] hover:bg-[#eeeaff]">
          حساب من
        </Link>
      </header>

      <div className="space-y-6 p-5 md:space-y-6 md:p-8">
        <section aria-label="آمار مؤسسه" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => (
            <article key={stat.label} className="flex min-h-[124px] items-center gap-4 rounded-xl border border-[#e5e1ed] bg-white p-5">
              <span aria-hidden="true" className={`grid size-11 shrink-0 place-items-center rounded-lg text-lg font-black ${stat.tone}`}>
                {stat.symbol}
              </span>
              <div className="min-w-0">
                <h2 className="text-[13px] leading-6 text-[#7e7a94]">{stat.label}</h2>
                <p className="mt-1 text-[22px] font-extrabold leading-8 text-[#1e1a33]">
                  {stat.value.toLocaleString("fa-IR")}
                </p>
                <p className="text-[11px] leading-5 text-[#7e7a94]">{stat.detail}</p>
              </div>
            </article>
          ))}
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <div className="rounded-xl border border-[#e5e1ed] bg-white p-5 md:p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <span className="rounded-md bg-[#fff3df] px-2 py-1 text-xs font-bold text-[#b7791f]">
                {itemsNeedingAttention.toLocaleString("fa-IR")} مورد
              </span>
              <h2 className="text-base font-extrabold text-[#1e1a33]">موارد نیازمند توجه</h2>
            </div>
            <ul className="space-y-3">
              {pendingSupervision > 0 && (
                <li>
                  <Link href="/institute/providers" className="flex items-center justify-between gap-3 rounded-lg bg-[#f8f7fc] p-3 text-sm hover:bg-[#eeeaff]">
                    <span className="rounded bg-[#fff3df] px-2 py-1 text-[11px] font-bold text-[#b7791f]">بررسی</span>
                    <span className="text-right text-[#1e1a33]">{pendingSupervision.toLocaleString("fa-IR")} درخواست نظارت در انتظار تصمیم</span>
                  </Link>
                </li>
              )}
              {pendingPractices > 0 && (
                <li>
                  <Link href="/institute/assessments" className="flex items-center justify-between gap-3 rounded-lg bg-[#f8f7fc] p-3 text-sm hover:bg-[#eeeaff]">
                    <span className="rounded bg-[#fff3df] px-2 py-1 text-[11px] font-bold text-[#b7791f]">بررسی</span>
                    <span className="text-right text-[#1e1a33]">{pendingPractices.toLocaleString("fa-IR")} دوره با تمرین در انتظار بازبینی</span>
                  </Link>
                </li>
              )}
              {pendingLearningAssessments > 0 && (
                <li>
                  <Link href="/institute/assessments" className="flex items-center justify-between gap-3 rounded-lg bg-[#f8f7fc] p-3 text-sm hover:bg-[#eeeaff]">
                    <span className="rounded bg-[#fff3df] px-2 py-1 text-[11px] font-bold text-[#b7791f]">بررسی</span>
                    <span className="text-right text-[#1e1a33]">{pendingLearningAssessments.toLocaleString("fa-IR")} ارزیابی یادگیری در انتظار بازبینی</span>
                  </Link>
                </li>
              )}
              {itemsNeedingAttention === 0 && (
                <li className="rounded-lg bg-[#f8f7fc] p-4 text-sm leading-7 text-[#7e7a94]">
                  در داده‌های همین فهرست، موردی برای بررسی وجود ندارد.
                </li>
              )}
            </ul>
            <p className="mt-4 text-xs leading-6 text-[#7e7a94]">
              موارد فقط از دوره‌های مرتبط با عضویت فعال شما و همین ۲۰ دورهٔ اخیر محاسبه شده‌اند.
            </p>
          </div>

          <div className="rounded-xl border border-[#e5e1ed] bg-white p-5 md:p-6">
            <h2 className="mb-4 text-base font-extrabold text-[#1e1a33]">نمای کلی فهرست دوره‌ها</h2>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3 border-b border-[#e5e1ed] pb-3">
                <span className="font-bold text-[#1e1a33]">دوره‌های نمایش‌داده‌شده</span>
                <span className="text-[#5b4ce2]">{hasMore ? "۲۰+" : courses.length.toLocaleString("fa-IR")}</span>
              </div>
              <div className="flex items-center justify-between gap-3 border-b border-[#e5e1ed] pb-3">
                <span className="font-bold text-[#1e1a33]">سؤال‌های تمرینی در انتظار بازبینی</span>
                <span className="text-[#5b4ce2]">{pendingPractices.toLocaleString("fa-IR")}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="font-bold text-[#1e1a33]">ارزیابی‌های یادگیری در انتظار بازبینی</span>
                <span className="text-[#5b4ce2]">{pendingLearningAssessments.toLocaleString("fa-IR")}</span>
              </div>
            </div>
            <p className="mt-5 rounded-lg bg-[#f8f7fc] p-3 text-xs leading-6 text-[#7e7a94]">
              آمار دانش‌آموزان کل مؤسسه و رویدادهای اخیر در داده‌های این داشبورد در دسترس نیست.
            </p>
          </div>
        </section>

        <section aria-labelledby="institute-quick-actions" className="rounded-xl border border-[#e5e1ed] bg-white p-5 md:p-6">
          <h2 id="institute-quick-actions" className="mb-4 text-[15px] font-extrabold text-[#1e1a33]">دسترسی سریع عملیاتی</h2>
          <div className="flex flex-wrap gap-3">
            <Link href="/institute/courses" className={buttonClassName("secondary")}>مشاهدهٔ دوره‌ها</Link>
            <Link href="/institute/question-bank" className={buttonClassName("secondary")}>مدیریت بانک سؤال</Link>
            <Link href="/institute/providers" className={buttonClassName()}>بررسی درخواست‌های نظارت</Link>
          </div>
        </section>

        <section aria-labelledby="institute-courses" className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 id="institute-courses" className="text-lg font-extrabold text-[#1e1a33]">دوره‌ها و وضعیت تصمیم نظارت</h2>
              <p className="mt-1 text-xs text-[#7e7a94]">دوره‌های مرتبط با مؤسسه‌های دارای عضویت فعال شما</p>
            </div>
            <Link href="/institute/courses" className="text-sm font-bold text-[#5b4ce2] hover:underline">مشاهدهٔ همهٔ دوره‌ها</Link>
          </div>
        {courses.length === 0 ? (
          <div className="space-y-4 rounded-xl border border-[#e5e1ed] bg-white p-6">
            <h2 className="text-lg font-extrabold">
              هنوز درخواست نظارتی در این محدوده ثبت نشده است
            </h2>
            <p className="text-sm leading-8 text-dena-muted">
              درخواست‌های جدید فقط بعد از ثبت دوره توسط ارائه‌دهنده
              در فهرست مؤسسه نمایان می‌شوند.
            </p>
            <Link href="/institute/providers"
              className={buttonClassName("secondary")}>
              مشاهده صف بررسی نظارت
            </Link>
          </div>
        ) : (
          <ul className="grid gap-4 xl:grid-cols-2">
            {courses.map((course) => (
              <li key={course.courseId}
                className="space-y-3 rounded-xl border border-[#e5e1ed] bg-white p-5 md:p-6">
                <h3 className="text-lg font-extrabold leading-8 text-[#1e1a33]">
                  {course.title}
                </h3>
                <p className="text-sm font-semibold text-dena-deep">
                  نظارت: {supervisionLabels[course.supervisionStatus]}
                </p>
                <p className="text-sm text-dena-muted">
                  انتشار: {publicationLabels[course.publicationStatus]}
                </p>
                <p className="text-sm text-dena-muted">
                  ویدئوهای آماده: {course.readyVideos.toLocaleString("fa-IR")}
                </p>
                <p className="text-sm text-dena-muted">
                  ثبت‌نام فعال: {course.activeEnrollmentCount.toLocaleString("fa-IR")}
                </p>
                <p className="text-sm text-dena-muted">
                  سؤال تمرینی: {practiceLabels[course.practiceReviewStatus]}
                </p>
                <div className="space-y-1 rounded-lg bg-[#f8f7fc] p-4 text-sm">
                  <p className="font-bold">ارزیابی‌های یادگیری</p>
                  <p className="text-dena-muted">
                    در انتظار بازبینی: {course.learningAssessmentReviews.pending.toLocaleString("fa-IR")}
                    {" · "}تأییدشده: {course.learningAssessmentReviews.approved.toLocaleString("fa-IR")}
                    {" · "}ردشده: {course.learningAssessmentReviews.rejected.toLocaleString("fa-IR")}
                  </p>
                </div>
                <Link href={`/institute/courses/${course.courseId}`}
                  className={buttonClassName()}>
                  پروندهٔ وضعیت همین دوره
                </Link>
                {course.supervisionStatus === "approved" && (
                  <Link href={`/institute/courses/${course.courseId}/practice`}
                    className={buttonClassName("secondary")}>
                    {course.practiceReviewStatus === "pending"
                      ? "بازبینی سؤال در انتظار تصمیم"
                      : "مشاهدهٔ وضعیت تمرین دوره"}
                  </Link>
                )}
                {course.supervisionStatus === "approved" && (
                  <Link href={`/institute/courses/${course.courseId}/assessments`}
                    className={buttonClassName("secondary")}>
                    {course.learningAssessmentReviews.pending > 0 &&
                      course.publicationStatus === "draft"
                      ? "بررسی ارزیابیِ در انتظار تصمیم"
                      : "مشاهدهٔ ارزیابی‌های یادگیری"}
                  </Link>
                )}
                {course.supervisionStatus === "requested" && (
                  <Link href="/institute/providers"
                    className={buttonClassName("secondary")}>
                    بررسی درخواست در صف مؤسسه
                  </Link>
                )}
              </li>
            ))}
          </ul>
        )}
        {hasMore && (
          <p className="text-sm text-dena-muted">
            تنها ۲۰ درخواست اخیر در این صفحه نشان داده می‌شود؛
            صف مستقل نظارت فهرست جداگانه‌ای دارد.
          </p>
        )}
        </section>

        <aside className="rounded-xl border border-[#e5e1ed] bg-white p-5 text-xs leading-7 text-[#7e7a94]">
          <h2 className="text-sm font-extrabold text-[#1e1a33]">دربارهٔ این آمار</h2>
          <p className="mt-2">
          شمار ثبت‌نام فعال فقط تعداد عضویت‌های فعال دوره است و هیچ هویت یا پروندهٔ
          فردی نشان نمی‌دهد. این صفحه نتیجهٔ آزمون یا مدرک آموزشی ارائه نمی‌کند؛
          تأیید مؤسسه نیز جایگزین مجوز رسمی آموزشی نیست.
          </p>
        </aside>
      </div>
    </main>
  );
}
