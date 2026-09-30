import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { StudentShell } from "@/components/student/student-shell";
import { getServerAccessContext } from "@/server/access/actor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "مسیر رشد | دنا",
  robots: { index: false, follow: false },
};

export default async function StudentGrowthPage() {
  if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET ||
      !process.env.BETTER_AUTH_URL) redirect("/login");

  const actor = await getServerAccessContext();
  if (!actor) redirect("/login");
  if (!actor.memberships.some((entry) => entry.role === "student")) notFound();

  return (
    <StudentShell active="growth" title="مسیر رشد">
      <div className="space-y-6">
        <section className="rounded-[22px] bg-dena-lavender px-6 py-7 md:px-8">
          <p className="text-sm font-bold text-dena-brand">رشد شخصی من</p>
          <h2 className="mt-2 text-2xl font-extrabold text-dena-deep md:text-3xl">
            روند رشد آموزشی
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-8 text-dena-muted">
            نمودار رشد فقط زمانی نمایش داده می‌شود که سری رشد معتبر و
            نرمال‌شده برای همان دانش‌آموز و همان دوره از backend موجود باشد.
          </p>
        </section>

        <Card className="rounded-[22px] p-6 md:p-8">
          <h2 className="text-lg font-extrabold">هنوز داده رشد معتبر ثبت نشده است</h2>
          <p className="mt-3 text-sm leading-8 text-dena-muted">
            نمره خام یک تمرین، تعداد ویدئوهای علامت‌خورده یا درصد تکمیل دوره
            به‌صورت خودکار «رشد» محسوب نمی‌شود. بنابراین تا زمان فعال‌شدن
            Growth Trend معتبر، دنا نمودار یا درصد رشد ساختگی نمایش نمی‌دهد.
          </p>
        </Card>

        <Card className="rounded-[22px] border-dashed p-5">
          <p className="text-xs leading-7 text-dena-muted">
            مدل نهایی می‌تواند checkpointهایی مانند شروع دوره، آزمون یادگیری،
            نیاز به مرور، مرور دوباره، تلاش جدید، بازیابی و اکنون را نمایش دهد؛
            فقط در صورتی که داده معتبر backend برای آن‌ها وجود داشته باشد.
          </p>
        </Card>
      </div>
    </StudentShell>
  );
}
