import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getServerAccessContext } from "../../../server/access/actor";
import { getInstituteDashboardCourses, getInstituteStudents } from "../../../server/institute/dashboard";
import { getInstituteStudentGrowth, getInstituteStudentProfile } from "../../../server/institute/students";
import { StudentGrowthFilters } from "../../../components/institute/student-growth-filters";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "مسیر رشد دانش‌آموزان | دنا",
  robots: { index: false, follow: false },
};

const fa = (value: number) => value.toLocaleString("fa-IR");
const growthStages = [
  "شروع دوره",
  "ارزیابی / آزمون یادگیری",
  "افت",
  "نیاز به مرور",
  "مرور دوباره",
  "بازیابی",
  "اکنون",
];

export default async function InstituteLearningPage({
  searchParams,
}: {
  searchParams: Promise<{ studentId?: string; courseId?: string }>;
}) {
  if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET ||
      !process.env.BETTER_AUTH_URL) redirect("/login");
  const actor = await getServerAccessContext();
  if (!actor) redirect("/login");
  const instituteIds = [...new Set(actor.memberships.flatMap((membership) =>
    membership.role === "institute" ? [membership.instituteId] : []))];
  if (!instituteIds.length) notFound();

  const params = await searchParams;
  const [courseResult, students] = await Promise.all([
    getInstituteDashboardCourses(instituteIds),
    getInstituteStudents(instituteIds),
  ]);
  const selectedStudentId = params.studentId ?? students[0]?.studentId ?? "";
  if (selectedStudentId && !students.some((student) => student.studentId === selectedStudentId)) {
    notFound();
  }

  const profile = selectedStudentId
    ? await getInstituteStudentProfile(instituteIds, selectedStudentId)
    : null;
  if (selectedStudentId && !profile) notFound();
  const approvedCourseIds = new Set(courseResult.courses
    .filter((course) => course.supervisionStatus === "approved")
    .map((course) => course.courseId));
  const availableCourses = (profile?.courses ?? [])
    .filter((course) => approvedCourseIds.has(course.courseId));
  const selectedCourseId = params.courseId ?? availableCourses[0]?.courseId ?? "";
  if (selectedCourseId && !availableCourses.some((course) => course.courseId === selectedCourseId)) {
    notFound();
  }
  const growth = selectedStudentId && selectedCourseId
    ? await getInstituteStudentGrowth(instituteIds, selectedStudentId, selectedCourseId)
    : null;
  if (selectedCourseId && !growth) notFound();

  const plotEvents = growth?.events.filter((event) => event.progress !== null) ?? [];
  const points = plotEvents.map((event, index) => {
    const x = plotEvents.length < 2
      ? 50
      : 24 + (index / (plotEvents.length - 1)) * 952;
    const y = 212 - ((event.progress ?? 0) / 100) * 170;
    return { x, y, event };
  });
  const pointString = points.map((point) => `${point.x},${point.y}`).join(" ");

  const latestAttempt = growth?.latestAssessment ?? null;
  const attemptLabel = latestAttempt
    ? latestAttempt.status === "submitted" ? "ارسال شده" : "در حال انجام"
    : "تلاشی ثبت نشده است";
  const currentProgressLabel = growth
    ? growth.totalVideos
      ? `${fa(growth.completedVideos)} از ${fa(growth.totalVideos)} ویدئو تکمیل شده`
      : "ویدئوی آماده‌ای برای این دوره ثبت نشده"
    : "داده‌ای برای نمایش موجود نیست";

  return (
    <main id="main-content" dir="rtl" className="min-h-screen bg-[#f8f7fc]">
      <header className="flex min-h-[72px] items-center justify-between gap-4 border-b border-[#e8e6f0] bg-white px-5 py-4 md:px-8">
        <form action="/institute/students" method="get" role="search"
          className="flex w-full max-w-[260px] items-center gap-2 rounded-lg bg-[#f8f7fc] px-3 py-2">
          <span aria-hidden="true" className="text-[#767093]">⌕</span>
          <input name="query" type="search" placeholder="جستجو..."
            aria-label="جست‌وجوی دانش‌آموز"
            className="min-w-0 flex-1 bg-transparent text-right text-[13px] outline-none placeholder:text-[#767093]" />
        </form>
        <h1 className="text-sm font-bold text-[#5b4ce2]">مسیر رشد دانش‌آموزان</h1>
      </header>

      <div className="space-y-6 p-5 md:p-8">
        <section className="space-y-5">
          <StudentGrowthFilters
            students={students.map(({ studentId, name }) => ({ studentId, name }))}
            selectedStudentId={selectedStudentId}
            courses={availableCourses.map(({ courseId, title }) => ({ courseId, title }))}
            selectedCourseId={selectedCourseId}
          />
          <h2 className="text-xl font-extrabold text-[#2a254b]">مسیر رشد دانش‌آموزان</h2>
        </section>

        <section aria-label="نمودار مراحل رشد دانش‌آموز"
          className="space-y-5 rounded-xl border border-[#e8e6f0] bg-white p-5 md:p-6">
          <h3 className="text-base font-bold text-[#2a254b]">نمودار مراحل رشد دانش‌آموز</h3>

          {growth ? (
            <>
              <div className="space-y-3 rounded-lg bg-[#f8f7fc] p-4 md:p-5">
                <div className="h-[190px] overflow-hidden rounded-md bg-white p-2 md:h-[220px] md:p-4">
                  {growth.totalVideos > 0 && points.length > 1 ? (
                    <svg viewBox="0 0 1000 240" preserveAspectRatio="none"
                      className="h-full w-full"
                      role="img"
                      aria-label={`نمودار تکمیل ویدئوهای ${growth.courseTitle}: ${fa(growth.completedVideos)} از ${fa(growth.totalVideos)}`}>
                      <polyline points={pointString} fill="none" stroke="#5b4ce2"
                        strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
                      {points.filter(({ event }) => event.kind === "assessment").map((point, index) => (
                        <circle key={`assessment-${index}`} cx={point.x} cy={point.y} r="5"
                          fill="#5b4ce2" stroke="white" strokeWidth="2" vectorEffect="non-scaling-stroke">
                          <title>{point.event.title}</title>
                        </circle>
                      ))}
                      {points.filter(({ event }) => event.kind === "video").map((point, index) => (
                        <circle key={`video-${index}`} cx={point.x} cy={point.y} r="3.5"
                          fill="#5b4ce2" stroke="white" strokeWidth="1.5" vectorEffect="non-scaling-stroke">
                          <title>{point.event.title}</title>
                        </circle>
                      ))}
                    </svg>
                  ) : (
                    <div className="grid h-full place-items-center px-4 text-center text-sm leading-7 text-[#767093]">
                      {growth.totalVideos === 0
                        ? "برای این دوره ویدئوی آماده‌ای جهت رسم پیشرفت وجود ندارد."
                        : "هنوز تکمیل ویدئویی ثبت نشده است؛ روند پس از ثبت فعالیت نمایش داده می‌شود."}
                    </div>
                  )}
                </div>
                <div dir="ltr" className="flex flex-wrap justify-between gap-x-3 gap-y-2 px-1 text-[10px] text-[#767093] md:text-[11px]">
                  {growthStages.map((stage, index) => (
                    <span key={stage} dir="rtl" className={index === growthStages.length - 1 ? "font-bold text-[#5b4ce2]" : ""}>{stage}</span>
                  ))}
                </div>
                <p className="text-right text-xs leading-6 text-[#767093]">
                  خط نمودار نسبت تکمیل ویدئوهای آماده را نشان می‌دهد؛ آزمون‌ها فقط به‌عنوان رویداد ثبت‌شده علامت‌گذاری می‌شوند.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <Metric label="وضعیت تلاش" value={attemptLabel} />
                <Metric label="آخرین آزمون یادگیری" value={latestAttempt?.title ?? "آزمونی ثبت نشده است"} />
                <Metric label="وضعیت فعلی" value={currentProgressLabel} emphasis />
              </div>
              <p role="note" className="text-xs leading-6 text-[#767093]">
                نمره، پاسخ‌ها و نتیجهٔ آزمون در این نمای مؤسسه نمایش داده نمی‌شوند. مراحل «افت»، «نیاز به مرور» و «بازیابی» فقط وقتی قابل تعیین‌اند که شاخص مجاز و دادهٔ کافی برای آن‌ها تعریف شده باشد.
              </p>
            </>
          ) : (
            <div className="rounded-lg bg-[#f8f7fc] px-5 py-10 text-center">
              <h4 className="font-bold text-[#2a254b]">برای نمایش مسیر رشد، ابتدا دانش‌آموز و دوره را انتخاب کنید.</h4>
              <p className="mt-2 text-sm leading-7 text-[#767093]">
                {students.length ? "دانش‌آموز ثبت‌نام‌شده‌ای در دوره‌های مورد تأیید این مؤسسه وجود ندارد." : "ثبت‌نامی برای نمایش در دوره‌های تحت نظارت تأییدشده ثبت نشده است."}
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function Metric({ label, value, emphasis = false }: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <div className="min-h-[88px] rounded-lg border border-[#e8e6f0] bg-[#f8f7fc] p-4">
      <p className="text-xs text-[#767093]">{label}</p>
      <p className={`mt-2 text-sm font-bold ${emphasis ? "text-[#5b4ce2]" : "text-[#2a254b]"}`}>{value}</p>
    </div>
  );
}
