import Image from "next/image";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { buttonClassName } from "@/components/ui/button";
import { FIGMA_FILE_URL, navigation, roles } from "@/lib/navigation";
import { previewHref, roleDescriptions, roleLabels } from "@/lib/preview";

export default function HomePage() {
  return (
    <main className="mx-auto min-h-screen max-w-6xl px-5 py-8 md:px-10 md:py-14">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Image src="/dena-app-logo.png" alt="دنا" width={83} height={48} priority />
        <span className="rounded-full border border-dena-border bg-white px-4 py-2 text-xs font-semibold text-dena-brand">
          نسخهٔ در حال توسعه · بدون خدمات عملیاتی
        </span>
      </div>
      <section className="mt-10 rounded-[20px] bg-dena-lavender p-8 md:p-12">
        <p className="text-sm font-semibold text-dena-brand">دنا · دانش‌آموزان نوآفرین ایران</p>
        <h1 className="mt-4 text-3xl font-extrabold text-dena-deep md:text-4xl">زیرساخت فنی دنا</h1>
        <p className="mt-5 max-w-3xl text-sm leading-8 md:text-base">
          بستر فنی آموزش ضبط‌شده، تمرین، آزمون و پیگیری یادگیری؛ طراحی شش نقش در یک هستهٔ نرم‌افزاری.
          در این مرحله تنها می‌توانید پوستهٔ عمومی صفحات را ببینید و هیچ سرویس آموزشی یا مالی فعال نیست.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link href={previewHref("student", navigation.student[0].href)} className={buttonClassName()}>
            مشاهدهٔ پوستهٔ دانش‌آموز
          </Link>
          <a href={FIGMA_FILE_URL} target="_blank" rel="noopener noreferrer" className={buttonClassName("outline")}>
            طراحی مرجع دنا
          </a>
        </div>
      </section>
      <section className="mt-10" aria-labelledby="roles-title">
        <h2 id="roles-title" className="text-xl font-extrabold">پوستهٔ شش فضای دنا</h2>
        <p className="mt-2 text-sm leading-7 text-dena-muted">
          لینک‌های زیر پیش‌نمایش عمومی هستند، نه مسیر ورود یا دسترسی به پنل عملیاتی.
        </p>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {roles.map((role) => (
            <Card key={role} className="flex flex-col">
              <h3 className="text-xl font-bold">{roleLabels[role]}</h3>
              <p className="mt-3 flex-1 text-sm leading-7 text-dena-muted">{roleDescriptions[role]}</p>
              <Link href={previewHref(role, navigation[role][0].href)} className={buttonClassName("secondary", "mt-6 self-start")}>
                پیش‌نمایش فضا
              </Link>
            </Card>
          ))}
        </div>
      </section>
      <footer className="mt-12 border-t border-dena-border py-6 text-xs leading-7 text-dena-muted">
        دنا مؤسسهٔ آموزشی یا صادرکنندهٔ مجوز رسمی نیست. محتوای هر دوره و نظارت بر آن بر عهدهٔ مسئول همان دوره است.
      </footer>
    </main>
  );
}
