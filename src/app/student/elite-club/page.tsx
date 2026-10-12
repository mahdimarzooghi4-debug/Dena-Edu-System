import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { StudentShell } from "@/components/student/student-shell";
import { getServerAccessContext } from "@/server/access/actor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "باشگاه نخبگان | دنا",
  robots: { index: false, follow: false },
};

export default async function StudentEliteClubPage() {
  if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET ||
      !process.env.BETTER_AUTH_URL) redirect("/login");

  const actor = await getServerAccessContext();
  if (!actor) redirect("/login");
  if (!actor.memberships.some((entry) => entry.role === "student")) notFound();

  return (
    <StudentShell active="elite" title="باشگاه نخبگان">
      <div className="space-y-6">
        <section className="rounded-[22px] bg-dena-lavender px-6 py-7 md:px-8">
          <p className="text-sm font-bold text-dena-brand">باشگاه نخبگان دنا</p>
          <h2 className="mt-2 text-2xl font-extrabold text-dena-deep md:text-3xl">
            استعدادها در کنار هم شکوفا می‌شوند
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-8 text-dena-muted">
            رشد استعدادها، ارتباط و هم‌افزایی و نگاه نوآفرینانه، چارچوب
            تجربه باشگاه را تشکیل می‌دهند.
          </p>
        </section>

        <Card className="rounded-[22px] p-6 md:p-8">
          <h2 className="text-lg font-extrabold">
            دسترسی عملیاتی باشگاه هنوز فعال نشده است
          </h2>
          <p className="mt-3 text-sm leading-8 text-dena-muted">
            ثبت‌نام، ارزیابی عضویت و نتیجه عضویت باید از backend رسمی باشگاه
            خوانده شوند. تا زمانی که این قرارداد داده پیاده نشده، این صفحه
            وضعیت عضویت یا مزایای ساختگی نمایش نمی‌دهد.
          </p>
        </Card>

        <div className="grid gap-4 md:grid-cols-3">
          {[
            ["رشد استعدادها", "فرصت‌های یادگیری و رشد فقط بر اساس داده backend نمایش داده می‌شوند."],
            ["ارتباط و هم‌افزایی", "تعامل‌های باشگاه پس از تعریف دقیق دامنه و مجوزها فعال می‌شوند."],
            ["نگاه نوآفرینانه", "هیچ حمایت مالی، شغلی یا مزیت تضمین‌شده‌ای از پیش فرض نمی‌شود."],
          ].map(([title, text]) => (
            <Card key={title} className="rounded-[22px] p-5">
              <h3 className="font-extrabold">{title}</h3>
              <p className="mt-2 text-sm leading-7 text-dena-muted">{text}</p>
            </Card>
          ))}
        </div>
      </div>
    </StudentShell>
  );
}
