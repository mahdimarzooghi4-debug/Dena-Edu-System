import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Card } from "../../../../components/ui/card";
import { buttonClassName } from "../../../../components/ui/button";
import { SectionHeading } from "../../../../components/ui/section-heading";
import { StudentShell } from "../../../../components/student/student-shell";
import { getServerAccessContext } from "../../../../server/access/actor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "معلم هوشمند | دنا",
  robots: { index: false, follow: false },
};

const learningStages = [
  {
    number: "۱",
    title: "آموزش آغازین با دیتاست دنا",
    description: "معلم دنا با داده‌های آموزشی متعلق به دنا آغاز می‌شود.",
    status: "مرحلهٔ پایه",
  },
  {
    number: "۲",
    title: "یادگیری از ویدئوهای دوره‌های تو",
    description:
      "بعد از آماده‌شدن سرویس، ویدئوهای مجازِ مؤسسه فقط در دسترس دانش‌آموزان همان دوره قرار می‌گیرند.",
    status: "مرحلهٔ بعد",
  },
  {
    number: "۳",
    title: "رشد متناسب با مسیر تو",
    description:
      "پاسخ‌ها با درس‌ها و دوره‌های مجازی که دنبال می‌کنی هماهنگ می‌شوند؛ اطلاعات یادگیری تو با دانش‌آموزان دیگر ترکیب نمی‌شود.",
    status: "شخصی‌سازی",
  },
] as const;

export default async function StudentAiTutorPage() {
  if (
    !process.env.DATABASE_URL ||
    !process.env.BETTER_AUTH_SECRET ||
    !process.env.BETTER_AUTH_URL
  ) {
    redirect("/login");
  }

  const actor = await getServerAccessContext();
  if (!actor) redirect("/login");
  if (!actor.memberships.some((entry) => entry.role === "student")) notFound();

  return (
    <StudentShell active="aiTutor" title="معلم هوشمند">
      <div className="space-y-7">
        <section
          aria-labelledby="ai-tutor-title"
          className="rounded-[22px] bg-dena-lavender px-6 py-7 md:px-8"
        >
          <p className="text-sm font-bold text-dena-brand">همراه یادگیری دنا</p>
          <h2
            id="ai-tutor-title"
            className="mt-2 text-[26px] font-extrabold leading-relaxed text-dena-deep md:text-[31px]"
          >
            معلم هوشمند، در مسیر یادگیری تو
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-8 text-dena-muted">
            معلم هوشمند دنا با دیتاست آموزشی خود دنا آغاز می‌شود و در ادامه با ویدئوهای مجازِ
            دوره‌های تو رشد می‌کند تا بتواند درس‌ها را متناسب با مسیر خودت توضیح دهد.
          </p>
          <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-amber-200 bg-white px-4 py-2 text-sm font-bold text-dena-ink">
            <span className="size-2 rounded-full bg-amber-500" aria-hidden="true" />
            پاسخ‌گویی هنوز فعال نیست
          </div>
          <p className="mt-3 max-w-3xl text-xs leading-7 text-dena-muted">
            تا زمانی که مدل و محتوای آموزشی آماده و ارزیابی نشده‌اند، گفت‌وگو یا پاسخ آزمایشی نمایش
            داده نمی‌شود.
          </p>
        </section>

        <section aria-labelledby="ai-tutor-growth" className="space-y-4">
          <SectionHeading id="ai-tutor-growth" note="برنامهٔ یادگیری معلم دنا">
            معلم هوشمند چطور رشد می‌کند؟
          </SectionHeading>
          <ol className="grid gap-4 lg:grid-cols-3">
            {learningStages.map((stage) => (
              <li key={stage.number}>
                <Card className="h-full space-y-4 p-[22px]">
                  <div className="flex items-center justify-between gap-3">
                    <span className="grid size-9 place-items-center rounded-full bg-dena-lavender text-sm font-extrabold text-dena-brand">
                      {stage.number}
                    </span>
                    <span className="rounded-full bg-dena-bg px-3 py-1.5 text-xs font-semibold text-dena-muted">
                      {stage.status}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold leading-8 text-dena-ink">
                      {stage.title}
                    </h3>
                    <p className="mt-2 text-sm leading-7 text-dena-muted">
                      {stage.description}
                    </p>
                  </div>
                </Card>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="ai-tutor-scope" className="space-y-4">
          <SectionHeading id="ai-tutor-scope">یادگیری امن و مخصوص خودت</SectionHeading>
          <Card className="space-y-3 p-[22px]">
            <p className="text-sm leading-8 text-dena-muted">
              معلم هوشمند فقط از محتوایی استفاده می‌کند که برای دورهٔ فعال تو مجاز و منتشر شده باشد.
              پاسخ‌های آینده به منبع درس ارجاع می‌دهند و هنگام آزمون فعال، امکان پاسخ‌گویی بسته می‌ماند.
            </p>
            <p className="text-sm leading-8 text-dena-muted">
              ویدئوهای دوره یا گفت‌وگوی دانش‌آموزان دیگر وارد فضای یادگیری تو نمی‌شود.
            </p>
          </Card>
        </section>

        <div className="flex flex-wrap gap-3">
          <Link href="/student/courses" className={buttonClassName()}>
            دیدن دوره‌های من
          </Link>
          <Link href="/student" className={buttonClassName("outline")}>
            بازگشت به خانه
          </Link>
        </div>
      </div>
    </StudentShell>
  );
}
