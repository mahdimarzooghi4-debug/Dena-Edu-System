import { DenaShell } from "@/components/dena-shell";
import { Card } from "@/components/ui/card";
import { sharedTechnicalSupport } from "@/lib/navigation";

export default function SupportPreviewPage() {
  return (
    <DenaShell role={null} currentHref={sharedTechnicalSupport.href} title="پشتیبانی فنی مشترک">
      <section className="rounded-[20px] bg-dena-lavender p-7 md:p-8">
        <p className="text-sm font-bold text-dena-brand">پیش‌نمایش سامانهٔ واحد پشتیبانی دنا</p>
        <h1 className="mt-3 text-2xl font-extrabold text-dena-deep md:text-3xl">پشتیبانی فنی</h1>
        <p className="mt-4 text-sm leading-8">
          همهٔ نقش‌ها از یک سامانهٔ تیکت فنی استفاده خواهند کرد؛ ادمین نمای رسیدگی همان سامانه را می‌بیند.
        </p>
      </section>
      <Card className="mt-8">
        <h2 className="text-xl font-bold">هنوز امکان ثبت یا مشاهدهٔ تیکت فعال نیست</h2>
        <p className="mt-3 text-sm leading-8 text-dena-muted">
          اتصال به هویت، مجوزهای سمت سرور و API تیکت در گام‌های بعدی پیاده‌سازی می‌شود.
          این صفحه نه تیکت نمونه می‌سازد و نه پیام ارسالی را ثبت می‌کند.
        </p>
      </Card>
    </DenaShell>
  );
}
