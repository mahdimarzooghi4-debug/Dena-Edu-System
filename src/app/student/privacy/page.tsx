import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { buttonClassName } from "../../../components/ui/button";
import { PrivateNotesCleanup } from "../../../components/student/private-notes-cleanup";
import { getServerAccessContext } from "../../../server/access/actor";
import { countStudentVideoNotes } from "../../../server/student/note-privacy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "مدیریت یادداشت‌های شخصی | دنا",
  robots: { index: false, follow: false },
};

export default async function StudentPrivateNotesPage() {
  if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET ||
      !process.env.BETTER_AUTH_URL) redirect("/login");
  const actor = await getServerAccessContext();
  if (!actor) redirect("/login");
  if (!actor.memberships.some((entry) => entry.role === "student")) notFound();
  const count = await countStudentVideoNotes(actor.userId);

  return (
    <main id="main-content"
      className="mx-auto min-h-screen max-w-3xl space-y-8 px-5 py-8 md:px-10 md:py-12">
      <header className="flex flex-wrap gap-4">
        <Link href="/student"
          className="text-sm font-bold text-dena-brand hover:underline">
          بازگشت به خانه دانش‌آموز
        </Link>
        <Link href="/student/progress"
          className={buttonClassName("secondary")}>
          پیگیری ویدئوهای انجام‌شده
        </Link>
      </header>
      <section className="rounded-[20px] bg-dena-lavender px-6 py-7 md:px-8">
        <p className="text-sm font-bold text-dena-brand">داده‌های شخصی من</p>
        <h1 className="mt-2 text-[27px] font-extrabold leading-relaxed text-dena-deep md:text-[31px]">
          مدیریت و پاک‌کردن یادداشت‌های ویدئویی
        </h1>
        <p className="mt-2 text-sm leading-8">
          یادداشت‌هایی که قبلاً خودت ذخیره کرده‌ای، حتی اگر
          ثبت‌نام لغو شده باشد یا ویدئو دیگر در دسترس نباشد،
          همچنان متعلق به حساب تو هستند. از اینجا می‌توانی همهٔ آن‌ها
          را با تأیید صریح پاک کنی. متن یادداشت‌های دوره‌های غیرقابل‌دسترس
          در این صفحه نشان داده نمی‌شود.
        </p>
      </section>
      <PrivateNotesCleanup initialCount={count} />
    </main>
  );
}
