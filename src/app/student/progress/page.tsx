import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Card } from "../../../components/ui/card";
import { buttonClassName } from "../../../components/ui/button";
import { SectionHeading } from "../../../components/ui/section-heading";
import { getServerAccessContext } from "../../../server/access/actor";
import { getStudentProgressOverview } from "../../../server/student/progress-overview";
import { nextStudentCourseAction } from "../../../server/student/next-action";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "پیگیری شخصی ویدئوها | دنا",
  robots: { index: false, follow: false },
};

export default async function StudentProgressPage() {
  if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET ||
      !process.env.BETTER_AUTH_URL) redirect("/login");
  const actor = await getServerAccessContext();
  if (!actor) redirect("/login");
  if (!actor.memberships.some((item) => item.role === "student")) notFound();

  const overview = await getStudentProgressOverview(actor.userId);
  return (
    <main id="main-content"
      className="mx-auto min-h-screen max-w-5xl space-y-8 px-5 py-8 md:px-10 md:py-12">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <Link href="/student"
          className="text-sm font-bold text-dena-brand hover:underline">
          بازگشت به خانه دانش‌آموز
        </Link>
        <Link href="/student/courses" className={buttonClassName("secondary")}>
          دوره‌های رایگان
        </Link>
      </header>

      <section className="rounded-[20px] bg-dena-lavender px-6 py-7 md:px-8">
        <p className="text-sm font-bold text-dena-brand">پیگیری شخصی یادگیری</p>
        <h1 className="mt-2 text-[27px] font-extrabold leading-relaxed text-dena-deep md:text-[31px]">
          ویدئوهایی که خودت انجام‌شده علامت زده‌ای
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-8">
          این شمارش از علامت‌های واقعی حساب تو می‌آید و فقط ویدئوهای آمادهٔ
          دوره‌هایی را شامل می‌شود که در حال حاضر به آن‌ها دسترسی داری.
          علامت شخصی، اثبات تماشای کامل، نتیجهٔ آزمون یا مدرک آموزشی نیست.
        </p>
      </section>

      <section aria-labelledby="my-progress-overview" className="space-y-4">
        <SectionHeading id="my-progress-overview"
          note="فقط دوره‌های نمایش‌داده‌شده در همین صفحه">
          نمای کلی علامت‌های شخصی
        </SectionHeading>
        <Card className="max-w-md">
          <p className="text-sm text-dena-muted">
            ویدئوهای علامت‌خورده از ویدئوهای آمادهٔ قابل دسترس
          </p>
          <p className="mt-2 text-[29px] font-extrabold text-dena-brand">
            {overview.displayedMarkedVideos.toLocaleString("fa-IR")} از{" "}
            {overview.displayedReadyVideos.toLocaleString("fa-IR")}
          </p>
          <p className="mt-1 text-xs leading-7 text-dena-muted">
            این عدد فقط مجموع حداکثر ۲۰ دورهٔ زیر است؛ نمره یا
            درصد تماشای واقعی محسوب نمی‌شود.
          </p>
        </Card>
        <Card className="max-w-md">
          <p className="text-sm text-dena-muted">
            تمرین‌های چهارگزینه‌ای تأییدشده که خودت پاسخ داده‌ای
          </p>
          <p className="mt-2 text-[29px] font-extrabold text-dena-brand">
            {overview.displayedAnsweredPractices.toLocaleString("fa-IR")} از{" "}
            {overview.displayedApprovedPractices.toLocaleString("fa-IR")}
          </p>
          <p className="mt-1 text-xs leading-7 text-dena-muted">
            فقط تمرین‌های تأییدشدهٔ دوره‌های قابل‌دسترسی همین صفحه؛
            این شمار نمرهٔ رسمی یا گواهی آموزشی نیست.
          </p>
        </Card>
      </section>

      <section aria-labelledby="my-progress-courses" className="space-y-4">
        <SectionHeading id="my-progress-courses">
          پیگیری شخصی به تفکیک دوره
        </SectionHeading>
        {overview.courses.length === 0 ? (
          <Card className="space-y-4">
            <h2 className="text-lg font-extrabold">
              فعلاً دورهٔ قابل دسترسی برای پیگیری نداری
            </h2>
            <p className="text-sm leading-8 text-dena-muted">
              ممکن است هنوز ثبت‌نام نکرده باشی یا انتشار، نظارت،
              عضویت یا محتوای آمادهٔ دوره تغییر کرده باشد.
            </p>
            <Link href="/student/courses" className={buttonClassName("secondary")}>
              دیدن دوره‌های رایگان
            </Link>
          </Card>
        ) : (
          <ul className="grid gap-4 md:grid-cols-2">
            {overview.courses.map((course) => (
              <li key={course.courseId}
                className="space-y-4 rounded-2xl border border-dena-border bg-white p-6">
                <h2 className="text-lg font-extrabold leading-8">
                  {course.title}
                </h2>
                <p className="text-sm font-semibold text-dena-deep">
                  علامت‌خورده به انتخاب تو:{" "}
                  {course.markedVideos.toLocaleString("fa-IR")} از{" "}
                  {course.readyVideos.toLocaleString("fa-IR")} ویدئوی آماده
                </p>
                <p className="text-xs leading-7 text-dena-muted">
                  فقط ویدئوهای آمادهٔ فعلی همین دوره؛ ویدئوی برداشته‌شده
                  یا دورهٔ لغوشده در این شمارش نیست.
                </p>
                <div className="space-y-2 rounded-xl bg-dena-bg p-4 text-sm leading-8"
                  aria-label="وضعیت تمرین کوتاه این دوره">
                  <p className="font-bold">تمرین کوتاه همین دوره</p>
                  {course.practice.state === "not_available" ? (
                    <p className="text-dena-muted">
                      تمرین تأییدشده‌ای برای نمایش وجود ندارد.
                    </p>
                  ) : course.practice.state === "not_attempted" ? (
                    <p className="text-dena-muted">
                      تمرین تأییدشده موجود است؛ هنوز پاسخ نداده‌ای.
                    </p>
                  ) : (
                    <p className="text-dena-deep">
                      پاسخ خودت ثبت شده است؛ گزینهٔ{" "}
                      {(course.practice.selectedOption + 1).toLocaleString("fa-IR")}.
                      {" "}{course.practice.correct
                        ? "پاسخ همین تمرین درست بود."
                        : "پاسخ همین تمرین درست نبود."}
                    </p>
                  )}
                </div>
                <Link href={nextStudentCourseAction(
                  course.courseId, course.readyVideos,
                  course.markedVideos, course.practice.state,
                ).href} className={buttonClassName()}>
                  {nextStudentCourseAction(
                    course.courseId, course.readyVideos,
                    course.markedVideos, course.practice.state,
                  ).label}
                </Link>
              </li>
            ))}
          </ul>
        )}
        {overview.hasMore && (
          <p className="text-sm leading-7 text-dena-muted">
            این نما فقط ۲۰ دورهٔ اخیرِ قابل دسترسی را جمع‌بندی می‌کند؛
            عدد بالای صفحه شامل دوره‌های بعدی نیست.
          </p>
        )}
      </section>

      <Card>
        <h2 className="text-lg font-extrabold">تمرین و آزمون</h2>
        <p className="mt-3 text-sm leading-8 text-dena-muted">
          تمرین چهارگزینه‌ایِ یک‌سؤالی در صفحهٔ تماشای دوره‌های دارای سؤال
          موجود است؛ آزمون رسمی، مدرک، سنجش زمان تماشا و گزارش رسمی
          یادگیری هنوز عملیاتی نیستند.
        </p>
      </Card>
    </main>
  );
}
