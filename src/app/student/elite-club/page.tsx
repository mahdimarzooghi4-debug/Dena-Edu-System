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
  { title: "حمایت تدریس", description: "فرصت‌های فعالیت اعضای باشگاه به‌عنوان پشتیبان تحصیلی در آموزشگاه‌ها." },
  { title: "حمایت آموزشی", description: "آموزش‌ها و فرصت‌های غیردرسی برای رشد و توسعه اعضای باشگاه.", href: "/student/elite-club/educational-support" },
  { title: "حمایت کسب‌وکار", description: "فرصت‌ها و حمایت‌های مرتبط با مسیرهای کسب‌وکار اعضای باشگاه." },
  { title: "حمایت رفاهی", description: "حمایت‌ها و خدمات رفاهی تعریف‌شده برای اعضای باشگاه." },
];

export default async function StudentEliteClubPage() {
  if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET || !process.env.BETTER_AUTH_URL) redirect("/login");
  const actor = await getServerAccessContext();
  if (!actor) redirect("/login");
  if (!actor.memberships.some((entry) => entry.role === "student")) notFound();

  return (
    <StudentShell active="elite" title="باشگاه نخبگان">
      <div className="space-y-6">
        <section className="rounded-[22px] bg-dena-lavender px-6 py-7 md:px-8">
          <p className="text-sm font-bold text-dena-brand">باشگاه نخبگان</p>
          <h1 className="mt-2 text-2xl font-extrabold text-dena-deep md:text-3xl">فضایی ویژه برای فرصت‌ها و مسیرهای رشد بیشتر در دنا</h1>
          <p className="mt-3 max-w-3xl text-sm leading-8 text-dena-muted">باشگاه نخبگان فضایی برای دسترسی دانش‌آموزان منتخب به فرصت‌ها و برنامه‌هایی است که در چارچوب دنا تعریف می‌شوند.</p>
        </section>

        <Card className="rounded-[22px] border-dena-border p-6 md:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div><p className="text-sm font-bold text-dena-brand">وضعیت من در باشگاه</p><h2 className="mt-2 text-xl font-extrabold text-dena-deep">وضعیت عضویت در دسترس نیست</h2></div>
            <span className="rounded-full bg-dena-bg px-4 py-2 text-sm font-bold text-dena-muted">اطلاعات عضویت متصل نیست</span>
          </div>
          <p className="mt-3 max-w-3xl text-sm leading-8 text-dena-muted">وضعیت ثبت‌نام، ارزیابی و عضویت باید از سامانه رسمی باشگاه دریافت شود. اتصال این بخش هنوز فعال نیست؛ بنابراین عضویت یا نتیجه‌ای برای حساب تو ثبت‌شده فرض نمی‌شود.</p>
        </Card>

        <section className="space-y-4" aria-labelledby="club-opportunities">
          <div><h2 id="club-opportunities" className="text-xl font-extrabold text-dena-deep">حمایت‌های باشگاه</h2><p className="mt-1 text-sm text-dena-muted">فرصت‌ها و خدمات پس از فعال شدن بخش باشگاه نمایش داده می‌شوند.</p></div>
          <div className="grid gap-4 md:grid-cols-2">
            {opportunities.map((item) => <Card key={item.title} className="flex h-full flex-col rounded-[22px] p-5 md:p-6">
              <h3 className="font-extrabold text-dena-deep">{item.title}</h3>
              <p className="mt-2 flex-1 text-sm leading-7 text-dena-muted">{item.description}</p>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <span className="w-fit rounded-full bg-dena-bg px-3 py-1.5 text-xs font-bold text-dena-muted">اطلاعات فرصت هنوز متصل نیست</span>
                {item.href && <Link href={item.href} className="text-sm font-bold text-dena-brand hover:underline">مشاهده جزئیات</Link>}
              </div>
            </Card>)}
          </div>
        </section>
      </div>
    </StudentShell>
  );
}
