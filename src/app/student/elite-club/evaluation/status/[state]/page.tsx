import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { StudentShell } from "@/components/student/student-shell";
import { getServerAccessContext } from "@/server/access/actor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "وضعیت ارزیابی باشگاه | دنا",
  robots: { index: false, follow: false },
};

const previewStates = ["submitted", "pending", "completed", "result", "member-result"] as const;
const memberBenefits = ["حمایت رفاهی", "حمایت تدریس", "حمایت آموزشی", "حمایت کسب‌وکار"];
type PreviewState = (typeof previewStates)[number];

function CheckIcon() {
  return <svg viewBox="0 0 48 48" className="size-7" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m13 25 7 7 15-16" /></svg>;
}

function ClockIcon() {
  return <svg viewBox="0 0 48 48" className="size-7" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="24" cy="24" r="17" /><path d="M24 14v11l8 5" /></svg>;
}

function ResultMark() {
  return <span className="grid size-[72px] place-items-center rounded-full bg-[#eef2f7]" aria-hidden="true"><span className="grid size-12 place-items-center rounded-full bg-[#e2e8f0]"><span className="size-2 rounded-full bg-dena-brand" /></span></span>;
}

export default async function StudentEliteClubEvaluationStatusPage({
  params,
}: {
  params: Promise<{ state: string }>;
}) {
  if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET || !process.env.BETTER_AUTH_URL) redirect("/login");
  const actor = await getServerAccessContext();
  if (!actor) redirect("/login");
  if (!actor.memberships.some((entry) => entry.role === "student")) notFound();

  const { state } = await params;
  if (!previewStates.includes(state as PreviewState)) notFound();
  const preview = state as PreviewState;

  return (
    <StudentShell active="elite" title="باشگاه نخبگان">
      <div className="mx-auto flex min-h-[calc(100svh-230px)] max-w-2xl flex-col items-center justify-center gap-5 py-8 text-center lg:min-h-[calc(100vh-230px)]">
        <span className="rounded-full bg-dena-lavender px-3 py-1.5 text-xs font-bold text-dena-brand">پیش‌نمایش حالت ارزیابی</span>

        {preview === "submitted" && (
          <>
            <span className="grid size-16 place-items-center rounded-full bg-emerald-100 text-emerald-600"><CheckIcon /></span>
            <h2 className="text-2xl font-extrabold text-dena-deep">ارزیابی شما ثبت شد</h2>
            <p className="max-w-lg text-sm leading-7 text-dena-muted">نتیجه پس از تکمیل فرایند ارزیابی در همین بخش نمایش داده می‌شود. از شکیبایی شما سپاسگزاریم.</p>
            <Link href="/student/elite-club/evaluation/status/pending" className="text-sm font-bold text-dena-brand hover:underline">پیش‌نمایش حالت «در حال ارزیابی»</Link>
          </>
        )}

        {preview === "pending" && (
          <>
            <span className="grid size-16 place-items-center rounded-full bg-orange-50 text-orange-600"><ClockIcon /></span>
            <h2 className="text-2xl font-extrabold text-dena-deep">در حال ارزیابی</h2>
            <p className="max-w-lg text-sm leading-7 text-dena-muted">در نمونهٔ طراحی، ارزیابی پس از ثبت در حال بررسی است و نتیجه در همین بخش نمایش داده می‌شود.</p>
            <Link href="/student/elite-club/evaluation/status/completed" className="text-sm font-bold text-dena-brand hover:underline">پیش‌نمایش حالت «ارزیابی تکمیل شد»</Link>
          </>
        )}

        {preview === "completed" && (
          <>
            <span className="grid size-16 place-items-center rounded-full bg-dena-lavender text-dena-brand"><CheckIcon /></span>
            <h2 className="text-2xl font-extrabold text-dena-deep">ارزیابی تکمیل شد</h2>
            <p className="max-w-lg text-sm leading-7 text-dena-muted">در این نمونه، نتیجهٔ ارزیابی برای مشاهده آماده است.</p>
            <Link href="/student/elite-club/evaluation/status/result" className="inline-flex min-h-12 items-center justify-center rounded-xl bg-dena-brand px-6 text-sm font-bold text-white hover:bg-dena-brand/90">مشاهده نتیجه</Link>
          </>
        )}

        {preview === "member-result" && (
          <>
            <ResultMark />
            <h2 className="text-xl font-extrabold text-dena-deep sm:text-2xl">نتیجه ارزیابی باشگاه نخبگان</h2>
            <p className="text-sm leading-7 text-dena-muted">شما عضو باشگاه نخبگان دانا هستید.</p>
            <section className="w-full rounded-2xl border border-dena-border bg-white px-5 py-4 text-right">
              <p className="text-xs font-semibold text-dena-muted">وضعیت عضویت</p>
              <p className="mt-3 font-extrabold text-emerald-700">عضو باشگاه</p>
            </section>
            <ul aria-label="حمایت‌های باشگاه" className="flex max-w-md flex-wrap justify-center gap-2">
              {memberBenefits.map((benefit) => <li key={benefit} className="rounded-lg border border-dena-border bg-white px-3 py-1.5 text-xs text-dena-ink">{benefit}</li>)}
            </ul>
            <p className="w-full rounded-xl bg-dena-lavender/50 px-4 py-3 text-xs leading-6 text-dena-brand">در صورت داشتن سؤال، از طریق پشتیبانی آنلاین با ما در ارتباط باشید.</p>
            <Link href="/student/elite-club" className="inline-flex min-h-12 items-center justify-center rounded-xl bg-dena-brand px-5 text-sm font-bold text-white hover:bg-dena-brand/90">ورود به باشگاه نخبگان</Link>
            <Link href="/student/elite-club/evaluation/status/result" className="text-xs font-bold text-dena-brand hover:underline">دیدن پیش‌نمایش نتیجه عمومی</Link>
          </>
        )}

        {preview === "result" && (
          <>
            <ResultMark />
            <h2 className="text-xl font-extrabold text-dena-deep sm:text-2xl">نتیجه ارزیابی باشگاه نخبگان</h2>
            <p className="text-sm leading-7 text-dena-muted">نتیجه ارزیابی شما مشخص شده است.</p>
            <section className="w-full rounded-2xl border border-dena-border bg-white px-4 py-4 text-right sm:px-5">
              <p className="text-xs font-semibold text-dena-muted">وضعیت عضویت</p>
              <div className="mt-3 flex items-center justify-between gap-3">
                <p className="text-sm font-bold leading-6 text-dena-deep">نتیجه واقعی از سیستم دریافت می‌شود</p>
                <span className="shrink-0 rounded-md bg-dena-lavender px-2 py-1 text-[10px] font-bold text-dena-brand">نمونه نمایشی</span>
              </div>
            </section>
            <p className="w-full rounded-xl bg-dena-lavender/50 px-4 py-3 text-xs leading-6 text-dena-brand">در صورت داشتن سؤال، از طریق پشتیبانی آنلاین با ما در ارتباط باشید.</p>
            <Link href="/student" className="inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-dena-border bg-white px-5 text-sm font-bold text-dena-deep hover:bg-slate-50">بازگشت به خانه</Link>
            <Link href="/student/elite-club/evaluation/status/member-result" className="text-xs font-bold text-dena-brand hover:underline">دیدن پیش‌نمایش نتیجه عضویت</Link>
          </>
        )}}

        <p className="max-w-xl rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-xs leading-6 text-amber-950">
          این صفحه فقط نمایش حالت‌های طراحی است؛ وضعیت عضویت یا نتیجه‌ای برای حساب شما ثبت یا تغییر نشده است.
        </p>
      </div>
    </StudentShell>
  );
}
