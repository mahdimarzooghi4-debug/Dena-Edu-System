import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Card } from "../../../components/ui/card";
import { buttonClassName } from "../../../components/ui/button";
import { SectionHeading } from "../../../components/ui/section-heading";
import { StudentShell } from "../../../components/student/student-shell";
import { getServerAccessContext } from "../../../server/access/actor";
import { AiTutorChat } from "../../../components/student/ai-tutor-chat";
import { listStudentCatalog, readCatalogQuery } from "../../../server/student/course-catalog";
import { listStudentTutorTopics } from "../../../server/student/ai-tutor-profile";

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

  const catalog = await listStudentCatalog(actor.userId,
    readCatalogQuery(new URLSearchParams("mine=1")));
  const topics = await listStudentTutorTopics(actor.userId);

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
            نسخهٔ فعلی از مجموعهٔ آموزشی آغازین دنا پاسخ می‌دهد. استفاده از ویدئوهای دوره و شخصی‌سازی پاسخ‌ها هنوز فعال نشده است.
          </p>
          <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-4 py-2 text-sm font-bold text-dena-ink">
            <span className="size-2 rounded-full bg-emerald-500" aria-hidden="true" />
            نسخهٔ آغازین فعال است
          </div>
          <p className="mt-3 max-w-3xl text-xs leading-7 text-dena-muted">
            پاسخ‌ها با جست‌وجوی محدود در چند درس بازبینی‌شده پیدا می‌شوند؛ اگر درس مرتبطی نباشد، معلم پاسخ نمی‌سازد.
          </p>
        </section>

        <AiTutorChat
          courses={catalog.courses.map((course) => ({
            courseId: course.courseId, title: course.title,
          }))}
          initialTopics={topics.map((topic) => ({
            topicId: topic.topicId,
            questionCount: topic.questionCount,
            lastAskedAt: topic.lastAskedAt.toISOString(),
          }))}
        />

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
              نسخهٔ فعلی فقط از مجموعهٔ آغازین داخلی دنا پاسخ می‌دهد و برای کنترل دسترسی، ثبت‌نام فعال تو در یک دوره را بررسی می‌کند.
              هنوز از ویدئوهای دوره پاسخ نمی‌سازد. هنگام آزمون فعال، امکان پاسخ‌گویی بسته می‌ماند.
            </p>
            <p className="text-sm leading-8 text-dena-muted">
              گفت‌وگوها ذخیره نمی‌شوند و دادهٔ دانش‌آموز دیگری برای ساخت پاسخ استفاده نمی‌شود.
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
