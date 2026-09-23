import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Card } from "../../components/ui/card";
import { buttonClassName } from "../../components/ui/button";
import { SectionHeading } from "../../components/ui/section-heading";
import { getServerAccessContext } from "../../server/access/actor";
import { getBenefactorScopes } from "../../server/benefactor/scopes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "خانه خیر و حامی | دنا",
  robots: { index: false, follow: false },
};

export default async function BenefactorHomePage() {
  if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET ||
      !process.env.BETTER_AUTH_URL) redirect("/login");
  const actor = await getServerAccessContext();
  if (!actor) redirect("/login");
  if (!actor.memberships.some((entry) => entry.role === "benefactor")) notFound();
  const benefactors = await getBenefactorScopes(actor.userId);
  if (!benefactors.length) notFound();

  return (
    <main id="main-content"
      className="mx-auto min-h-screen max-w-5xl space-y-8 px-5 py-8 md:px-10 md:py-12">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <Link href="/account"
          className="text-sm font-bold text-dena-brand hover:underline">
          بازگشت به حساب من
        </Link>
        <Link href="/account/role-applications"
          className={buttonClassName("secondary")}>
          وضعیت درخواست‌های نقش من
        </Link>
      </header>

      <section className="rounded-[20px] bg-dena-lavender px-6 py-7 md:px-8">
        <p className="text-sm font-bold text-dena-brand">خانه خیر و حامی در دنا</p>
        <h1 className="mt-2 text-[27px] font-extrabold leading-relaxed text-dena-deep md:text-[31px]">
          هویت‌های حمایتی دارای دسترسی من
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-8">
          تنها هویت‌های خیر و حامی که پس از بررسی مستقل با عضویت فعالِ
          حساب شما مرتبط شده‌اند، از پایگاه داده نمایش داده می‌شوند.
          این وضعیت به معنی پرداخت، تخصیص کمک یا صدور رسید نیست.
        </p>
      </section>

      <section aria-labelledby="benefactor-overview" className="space-y-4">
        <SectionHeading id="benefactor-overview" note="صرفاً از عضویت فعال و هویت ثبت‌شده">
          وضعیت دسترسی حمایتی
        </SectionHeading>
        <Card className="max-w-sm">
          <p className="text-sm text-dena-muted">
            هویت‌های حمایتی مجاز برای این حساب
          </p>
          <p className="mt-2 text-[29px] font-extrabold text-dena-brand">
            {benefactors.length.toLocaleString("fa-IR")}
          </p>
          <p className="mt-1 text-xs leading-7 text-dena-muted">
            تعداد هویت‌های تأییدشده، نه تعداد کمک‌ها یا افراد تحت حمایت.
          </p>
        </Card>
      </section>

      <section aria-labelledby="benefactor-scopes" className="space-y-4">
        <SectionHeading id="benefactor-scopes">
          هویت‌های حمایتی ثبت‌شده
        </SectionHeading>
        <ul className="grid gap-4 md:grid-cols-2">
          {benefactors.map((benefactor) => (
            <li key={benefactor.id}
              className="space-y-3 rounded-2xl border border-dena-border bg-white p-6">
              <h2 className="text-lg font-extrabold leading-8">
                {benefactor.name}
              </h2>
              <p className="text-sm font-semibold text-dena-deep">
                نقش حمایتی فعال و بررسی هویت در دنا ثبت شده است
              </p>
              <p className="text-sm leading-7 text-dena-muted">
                تاریخ ثبت بررسی داخلی:{" "}
                <time dateTime={benefactor.verifiedAt.toISOString()}>
                  {new Intl.DateTimeFormat("fa-IR", {
                    dateStyle: "medium", timeZone: "Asia/Tehran",
                  }).format(benefactor.verifiedAt)}
                </time>
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="benefactor-next" className="space-y-4">
        <SectionHeading id="benefactor-next">
          صندوق حمایت، کمک‌ها و رسیدها
        </SectionHeading>
        <Card>
          <p className="text-sm leading-8 text-dena-muted">
            صندوق حمایت، پرداخت، تخصیص کمک، رسید و گزارش تجمیعی هزینه‌کرد
            هنوز به بک‌اند عملیاتی متصل نشده‌اند. در این مرحله هیچ مبلغ،
            کمک ثبت‌شده یا گزارش مصرفی ساختگی نمایش داده نمی‌شود و هویت
            دریافت‌کنندگان حمایت، از جمله دانش‌آموزان، در دسترس خیر قرار نمی‌گیرد.
          </p>
        </Card>
      </section>
    </main>
  );
}
