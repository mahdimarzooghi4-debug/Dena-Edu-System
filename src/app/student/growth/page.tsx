import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Card } from "../../../components/ui/card";
import { StudentShell } from "../../../components/student/student-shell";
import { getServerAccessContext } from "../../../server/access/actor";
import { getStudentAssessmentGrowth } from "../../../server/student/growth-trend";
import { getStudentProgressOverview } from "../../../server/student/progress-overview";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "مسیر رشد | دنا",
  robots: { index: false, follow: false },
};

function percent(value: number) {
  return `${new Intl.NumberFormat("fa-IR", {
    maximumFractionDigits: 1,
  }).format(value)}٪`;
}

function date(value: string) {
  return new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium" })
    .format(new Date(value));
}

function AssessmentTrend({
  title,
  points,
}: {
  title: string;
  points: Awaited<ReturnType<typeof getStudentAssessmentGrowth>>[number]["points"];
}) {
  const chartPoints = points.map((point, index) => {
    const x = points.length === 1 ? 320 : 44 +
      (index / (points.length - 1)) * 552;
    const y = 18 + ((100 - point.percentage) / 100) * 124;
    return { x, y, ...point };
  });
  const path = chartPoints.map((point, index) =>
    `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`,
  ).join(" ");

  return (
    <Card className="space-y-5 rounded-[22px] p-5 md:p-7">
      <div>
        <h3 className="text-lg font-extrabold leading-8">{title}</h3>
        {points.length < 2 && (
          <p className="mt-1 text-sm leading-7 text-dena-muted">
            برای این ارزیابی فعلاً یک تلاش ثبت‌شده داری؛ روند با تلاش‌های بعدی شکل می‌گیرد.
          </p>
        )}
      </div>

      <figure role="img" aria-label={`روند درصد پاسخ درست در ارزیابی ${title}`}>
        <svg viewBox="0 0 640 170" role="img" aria-hidden="true"
          className="h-44 w-full overflow-visible">
          <line x1="44" y1="18" x2="596" y2="18"
            stroke="currentColor" opacity="0.14" />
          <line x1="44" y1="80" x2="596" y2="80"
            stroke="currentColor" opacity="0.14" />
          <line x1="44" y1="142" x2="596" y2="142"
            stroke="currentColor" opacity="0.14" />
          <text x="36" y="22" textAnchor="end" fontSize="12"
            fill="currentColor">۱۰۰٪</text>
          <text x="36" y="146" textAnchor="end" fontSize="12"
            fill="currentColor">۰٪</text>
          {path && <path d={path} fill="none" stroke="currentColor"
            className="text-dena-brand" strokeWidth="3" strokeLinecap="round"
            strokeLinejoin="round" />}
          {chartPoints.map((point) => (
            <circle key={point.attemptNumber} cx={point.x} cy={point.y} r="5"
              fill="currentColor" className="text-dena-brand">
              <title>{`تلاش ${point.attemptNumber}: ${percent(point.percentage)}`}</title>
            </circle>
          ))}
        </svg>
        <figcaption className="sr-only">
          درصد پاسخ درست هر تلاش در همین ارزیابی، به ترتیب شمارهٔ تلاش.
        </figcaption>
      </figure>

      <ol className="space-y-2" aria-label="جزئیات تلاش‌های ثبت‌شده">
        {points.map((point) => (
          <li key={point.attemptNumber}
            className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-dena-bg px-4 py-3 text-sm">
            <span className="font-bold">
              تلاش {point.attemptNumber.toLocaleString("fa-IR")} · {date(point.submittedAt)}
            </span>
            <span className="text-dena-deep">
              {point.correctCount.toLocaleString("fa-IR")} از {point.questionCount.toLocaleString("fa-IR")} پاسخ درست · {percent(point.percentage)}
            </span>
            <span className="text-xs text-dena-muted">
              {point.outcome === "completed" ? "ارزیابی تکمیل شد" : "نیاز به مرور"}
            </span>
          </li>
        ))}
      </ol>
    </Card>
  );
}

export default async function StudentGrowthPage() {
  if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET ||
      !process.env.BETTER_AUTH_URL) redirect("/login");

  const actor = await getServerAccessContext();
  if (!actor) redirect("/login");
  if (!actor.memberships.some((entry) => entry.role === "student")) notFound();

  const [series, progress] = await Promise.all([
    getStudentAssessmentGrowth(actor.userId),
    getStudentProgressOverview(actor.userId),
  ]);
  return (
    <StudentShell active="growth" title="مسیر رشد">
      <div className="space-y-6">
        <section className="rounded-[22px] bg-dena-lavender px-6 py-7 md:px-8">
          <p className="text-sm font-bold text-dena-brand">مسیر رشد دنا</p>
          <h1 className="mt-2 text-2xl font-extrabold text-dena-deep md:text-3xl">
            روند یادگیری‌ات را در طول زمان ببین
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-8 text-dena-muted">
پیشرفت جلسات آموزشی، تمرین‌ها، نتایج آزمون‌ها و عملکرد درسی در کنار هم نمایش داده می‌شوند. نمودار ارزیابی‌ها فقط تلاش‌های ثبت‌شدهٔ خودت را در همان ارزیابی مقایسه می‌کند و نمرهٔ رسمی نیست.
          </p>
        </section>


        <section className="space-y-4" aria-labelledby="student-growth-courses">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 id="student-growth-courses" className="text-xl font-extrabold text-dena-deep">پیشرفت دوره‌های من</h2>
              <p className="mt-1 text-sm text-dena-muted">تکمیل جلسه‌ها به انتخاب خودت ثبت می‌شود.</p>
            </div>
            <span className="text-xs text-dena-muted">{progress.courses.length.toLocaleString("fa-IR")} دورهٔ در دسترس</span>
          </div>
          {progress.courses.length === 0 ? (
            <Card className="rounded-[22px] p-5 text-sm leading-7 text-dena-muted">
              هنوز دورهٔ فعال و محتوای آماده‌ای برای نمایش در مسیر رشد وجود ندارد.
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {progress.courses.slice(0, 4).map((course) => {
                const percent = course.readyVideos
                  ? Math.round(course.markedVideos / course.readyVideos * 100) : 0;
                return <Card key={course.courseId} className="space-y-4 rounded-[22px] p-5">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-extrabold text-dena-deep">{course.title}</h3>
                    <span className="text-sm font-bold text-dena-brand">{percent.toLocaleString("fa-IR")}٪</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-dena-lavender" role="progressbar"
                    aria-label={`درصد جلسه‌های تکمیل‌شده به انتخاب خودت در ${course.title}`}
                    aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}>
                    <div className="h-full rounded-full bg-dena-mint" style={{ width: `${percent}%` }} />
                  </div>
                  <p className="text-xs leading-6 text-dena-muted">
                    {course.markedVideos.toLocaleString("fa-IR")} از {course.readyVideos.toLocaleString("fa-IR")} جلسه به‌صورت خوداظهاری تکمیل‌شده علامت خورده است.
                  </p>
                  <Link href={`/student/courses/${course.courseId}`} className="text-sm font-bold text-dena-brand hover:underline">
                    مشاهده دوره
                  </Link>
                </Card>;
              })}
            </div>
          )}
          <p className="text-xs leading-6 text-dena-muted">
            علامت تکمیل فقط انتخاب خود دانش‌آموز است و زمان تماشا، یادگیری یا نمرهٔ رسمی را اثبات نمی‌کند.
          </p>
        </section>

        {series.length === 0 ? (
          <Card className="space-y-3 rounded-[22px] p-6 md:p-8">
            <h2 className="text-lg font-extrabold">هنوز تلاش ثبت‌شده‌ای برای نمایش نیست</h2>
            <p className="text-sm leading-8 text-dena-muted">
              فقط تلاش‌های ارسال‌شده برای ارزیابی‌های تأییدشدهٔ دوره‌های فعلیِ قابل‌دسترسی نمایش داده می‌شوند.
            </p>
          </Card>
        ) : (
          <section aria-label="روندهای ارزیابی" className="space-y-5">
            {series.map((item) => (
              <div key={item.assessmentId} className="space-y-3">
                <p className="text-sm font-bold text-dena-muted">دوره: {item.courseTitle}</p>
                <AssessmentTrend title={item.assessmentTitle} points={item.points} />
              </div>
            ))}
            <p className="text-xs leading-7 text-dena-muted">
              این نما حداکثر ۲۰ دورهٔ دارای دسترسی فعلی و ۱۰۰ تلاش ثبت‌شدهٔ اخیر را بررسی می‌کند؛ تلاش‌های در حال انجام و ارزیابی‌های تأییدنشده در آن نیستند.
            </p>
          </section>
        )}
      </div>
    </StudentShell>
  );
}
