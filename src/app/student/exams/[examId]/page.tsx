import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { StudentExamStartAction } from "@/components/student/student-exam-start-action";
import { StudentShell } from "@/components/student/student-shell";
import { getServerAccessContext } from "@/server/access/actor";
import { getStudentExamCatalog } from "@/server/assessments/exam-management";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "جزئیات آزمون | دنا", robots: { index: false, follow: false } };

export default async function StudentExamDetailsPage({
  params,
}: { params: Promise<{ examId: string }> }) {
  if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET || !process.env.BETTER_AUTH_URL) redirect("/login");
  const actor = await getServerAccessContext();
  if (!actor) redirect("/login");
  if (!actor.memberships.some((item) => item.role === "student")) notFound();
  const { examId } = await params;
  if (!z.uuid().safeParse(examId).success) notFound();
  const catalog = await getStudentExamCatalog(actor.userId);
  const exam = catalog?.exams.find((item) => item.id === examId);
  if (!exam) notFound();

  const now = new Date();
  const canStart = exam.status === "published" && now >= exam.startsAt && now < exam.endsAt &&
    (exam.attemptStatus === "in_progress" || (exam.attemptNumber ?? 0) < exam.attemptLimit);
  const backHref = exam.courseId
    ? "/student/assessments?courseId=" + encodeURIComponent(exam.courseId)
    : "/student/assessments";

  return <StudentShell active="assessments" title="جزئیات آزمون">
    <main className="mx-auto max-w-4xl space-y-6">
      <Link href={backHref} className="text-sm font-bold text-dena-brand hover:underline">بازگشت به تمرین‌ها و آزمون‌ها</Link>
      <section className="space-y-5 rounded-[24px] border border-dena-border bg-white p-6 md:p-8">
        <header>
          <p className="text-sm font-bold text-dena-brand">
            {exam.examType === "dena_coordinated" ? "آزمون هماهنگ دنا" : "آزمون برنامه‌ریزی‌شده"}
          </p>
          <h1 className="mt-2 text-2xl font-extrabold leading-10 text-dena-deep md:text-3xl">{exam.title}</h1>
          <p className="mt-2 text-sm text-dena-muted">دوره مرتبط: {exam.courseId && exam.courseTitle
            ? <Link href={"/student/courses/" + encodeURIComponent(exam.courseId)} className="font-bold text-dena-brand hover:underline">{exam.courseTitle}</Link>
            : "آزمون هماهنگ دنا"}</p>
        </header>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl bg-dena-bg p-4"><p className="text-xs text-dena-muted">وضعیت</p>
            <p className="mt-1 font-bold text-dena-deep">{exam.attemptStatus === "in_progress" ? "در حال انجام" : exam.status === "published" && canStart ? "آماده انجام" : exam.status !== "published" ? "در انتظار انتشار" : now < exam.startsAt ? "هنوز شروع نشده" : now >= exam.endsAt ? "مهلت آزمون پایان یافته" : "آماده‌سازی"}</p></div>
          <div className="rounded-2xl bg-dena-bg p-4"><p className="text-xs text-dena-muted">تعداد پرسش</p>
            <p className="mt-1 font-bold text-dena-deep">{exam.questionCount.toLocaleString("fa-IR")} سؤال</p></div>
          <div className="rounded-2xl bg-dena-bg p-4"><p className="text-xs text-dena-muted">مدت آزمون</p>
            <p className="mt-1 font-bold text-dena-deep">{exam.durationMinutes.toLocaleString("fa-IR")} دقیقه</p></div>
          <div className="rounded-2xl bg-dena-bg p-4"><p className="text-xs text-dena-muted">بازه شرکت</p>
            <p className="mt-1 text-sm font-bold leading-7 text-dena-deep">
              {new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Tehran" }).format(exam.startsAt)}
              {" تا "}
              {new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Tehran" }).format(exam.endsAt)}
            </p></div>
        </div>
        <div className="space-y-2">
          <h2 className="font-bold text-dena-deep">راهنمای آزمون</h2>
          <p className="whitespace-pre-wrap text-sm leading-8 text-dena-muted">{exam.instructions}</p>
        </div>
        <p className="text-xs leading-6 text-dena-muted">
          هر پاسخ پس از انتخاب ذخیره می‌شود. با پایان زمان، پاسخ‌های ذخیره‌شده ثبت می‌شوند.
          {exam.attemptNumber !== null && <> تلاش {exam.attemptNumber.toLocaleString("fa-IR")} از {exam.attemptLimit.toLocaleString("fa-IR")}.</>}
        </p>
        {exam.attemptId ? <Link href={"/student/exams/" + encodeURIComponent(exam.id) + "/attempt/" + encodeURIComponent(exam.attemptId)}
          className="inline-flex min-h-11 items-center rounded-xl bg-dena-brand px-5 text-sm font-bold text-white hover:bg-dena-deep">ادامه آزمون</Link>
          : canStart ? <StudentExamStartAction examId={exam.id}
            label={exam.attemptNumber ? "شروع تلاش بعدی" : "شروع آزمون"} />
          : <p className="rounded-xl bg-dena-lavender p-4 text-sm font-bold leading-7 text-dena-deep">
            {exam.status !== "published" ? "این آزمون هنوز منتشر نشده است." :
              (exam.attemptNumber ?? 0) >= exam.attemptLimit ? "دفعات مجاز شرکت در آزمون به پایان رسیده است." :
                now < exam.startsAt ? "آزمون در زمان شروع اعلام‌شده در دسترس خواهد بود." : "مهلت شرکت در این آزمون پایان یافته است."}
          </p>}
      </section>
    </main>
  </StudentShell>;
}
