import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { StudentShell } from "@/components/student/student-shell";
import { getServerAccessContext } from "@/server/access/actor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "ارزیابی باشگاه نخبگان | دنا",
  robots: { index: false, follow: false },
};

const assessmentAreas = ["نگاه بنیادی‌شناسانه", "ارتباط و هم‌افزایی", "رشد استعدادها"];

export default async function StudentEliteClubEvaluationIntroPage() {
  if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET || !process.env.BETTER_AUTH_URL) redirect("/login");
  const actor = await getServerAccessContext();
  if (!actor) redirect("/login");
  if (!actor.memberships.some((entry) => entry.role === "student")) notFound();

  return (
    <StudentShell active="elite" title="باشگاه نخبگان">
      <div className="mx-auto flex min-h-[calc(100svh-230px)] max-w-2xl flex-col justify-start py-5 lg:min-h-[calc(100vh-230px)]">
        <header className="space-y-4 text-right">
          <h2 className="text-2xl font-extrabold text-dena-deep">ارزیابی باشگاه نخبگان</h2>
          <p className="text-sm leading-8 text-dena-muted">
            این ارزیابی بخشی از فرایند عضویت در باشگاه نخبگان است. به سؤال‌ها با دقت و تمرکز پاسخ دهید.
          </p>
          <ul aria-label="حوزه‌های ارزیابی" className="flex flex-wrap gap-2">
            {assessmentAreas.map((area) => (
              <li key={area} className="rounded-full border border-[#d8d2ff] bg-[#f0efff] px-4 py-2 text-sm font-semibold text-dena-brand">{area}</li>
            ))}
          </ul>
        </header>
        <div className="mt-10 space-y-4">
          <button type="button" disabled aria-describedby="evaluation-status" className="min-h-12 w-full cursor-not-allowed rounded-xl bg-dena-brand px-5 text-sm font-bold text-white opacity-60">
            شروع ارزیابی
          </button>
          <div className="text-center">
            <Link href="/student/elite-club/evaluation/question" className="text-sm font-bold text-dena-brand hover:underline">مشاهدهٔ پیش‌نمایش پرسش‌ها</Link>
          </div>
          <p id="evaluation-status" role="status" className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm leading-7 text-amber-950">
            فرایند ارزیابی هنوز به سامانهٔ عضویت متصل نیست؛ پاسخ‌ها و وضعیت عضویت در این صفحه ثبت نمی‌شوند.
          </p>
          <div className="text-center">
            <Link href="/student/elite-club/register" className="text-sm font-bold text-dena-brand hover:underline">بازگشت به ثبت‌نام</Link>
          </div>
        </div>
      </div>
    </StudentShell>
  );
}
