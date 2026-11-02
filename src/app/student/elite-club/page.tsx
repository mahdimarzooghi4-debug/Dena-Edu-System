import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { StudentShell } from "@/components/student/student-shell";
import { getServerAccessContext } from "@/server/access/actor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "باشگاه نخبگان | دنا", robots: { index: false, follow: false } };

const opportunities = [
  {
    title: "حمایت آموزشی",
    description: "آموزش‌ها و فرصت‌های غیردرسی برای رشد و توسعه اعضای باشگاه.",
    href: "/student/elite-club/educational-support",
    icon: "book",
  },
  {
    title: "حمایت تدریس",
    description: "فرصت‌های فعالیت اعضای باشگاه به‌عنوان پشتیبان تحصیلی در آموزشگاه‌ها.",
    href: "/student/elite-club/teaching-support",
    icon: "teaching",
  },
  {
    title: "حمایت رفاهی",
    description: "حمایت‌ها و خدمات رفاهی تعریف‌شده برای اعضای باشگاه.",
    href: "/student/elite-club/welfare-support",
    icon: "heart",
  },
  {
    title: "حمایت کسب‌وکار",
    description: "فرصت‌ها و حمایت‌های مرتبط با مسیرهای کسب‌وکار اعضای باشگاه.",
    href: "/student/elite-club/business-support",
    icon: "briefcase",
  },
] as const;

function OpportunityIcon({ name }: { name: (typeof opportunities)[number]["icon"] }) {
  const common = {
    className: "size-6",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  if (name === "book") return <svg {...common}><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5z" /><path d="M4 5.5v16" /></svg>;
  if (name === "teaching") return <svg {...common}><path d="M3 7h18M5 7v11m14-11v11M3 18h18M8 21h8M12 18v3" /><path d="m7 3 5 3 5-3" /></svg>;
  if (name === "heart") return <svg {...common}><path d="M20.8 8.8c0 5.4-8.8 11-8.8 11s-8.8-5.6-8.8-11A4.8 4.8 0 0 1 12 6.3a4.8 4.8 0 0 1 8.8 2.5Z" /></svg>;
  return <svg {...common}><path d="M3 7h18v14H3zM7 7V4h10v3M7 12h10M7 16h6" /></svg>;
}

export default async function StudentEliteClubPage() {
  if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET || !process.env.BETTER_AUTH_URL) redirect("/login");
  const actor = await getServerAccessContext();
  if (!actor) redirect("/login");
  if (!actor.memberships.some((entry) => entry.role === "student")) notFound();

  return (
    <StudentShell active="elite" title="باشگاه نخبگان">
      <div className="space-y-5 md:space-y-6">
        <header className="space-y-1.5 text-right">
          <h2 className="text-2xl font-extrabold text-dena-deep md:text-[28px]">باشگاه نخبگان</h2>
          <p className="text-sm leading-7 text-dena-muted">فضایی ویژه برای فرصت‌ها و مسیرهای رشد بیشتر در دنا.</p>
        </header>

        <Card className="rounded-[22px] p-5 md:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-right">
              <p className="text-sm font-bold text-dena-brand">وضعیت من در باشگاه</p>
              <h3 className="mt-2 font-extrabold text-dena-deep">وضعیت عضویت متصل نیست</h3>
            </div>
            <span className="rounded-full bg-dena-bg px-3 py-1.5 text-xs font-bold text-dena-muted">اطلاعات عضویت در دسترس نیست</span>
          </div>
          <p className="mt-3 text-sm leading-7 text-dena-muted">
            وضعیت ثبت‌نام و ارزیابی از سامانهٔ باشگاه دریافت نمی‌شود؛ بنابراین عضویت یا نتیجه‌ای برای حساب تو فرض نشده است.
          </p>
        </Card>

        <section aria-labelledby="club-opportunities" className="space-y-3">
          <div className="text-right">
            <h3 id="club-opportunities" className="text-lg font-extrabold text-dena-deep">حمایت‌های باشگاه</h3>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {opportunities.map((item) => (
              <Card key={item.title} className="rounded-[20px] p-4 md:p-5">
                <div className="flex items-start gap-4">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-dena-bg text-dena-brand" aria-hidden="true">
                    <OpportunityIcon name={item.icon} />
                  </span>
                  <div className="min-w-0 flex-1 text-right">
                    <h4 className="font-extrabold text-dena-deep">{item.title}</h4>
                    <p className="mt-2 text-sm leading-7 text-dena-muted">{item.description}</p>
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-2 text-xs font-bold text-dena-muted">
                        <span className="size-2 rounded-full bg-slate-300" aria-hidden="true" />
                        اطلاعات فرصت متصل نیست
                      </span>
                      <Link href={item.href} className="text-sm font-bold text-dena-brand hover:underline">مشاهده فرصت‌ها</Link>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>
      </div>
    </StudentShell>
  );
}
