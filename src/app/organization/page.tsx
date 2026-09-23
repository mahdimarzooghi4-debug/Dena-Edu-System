import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Card } from "../../components/ui/card";
import { buttonClassName } from "../../components/ui/button";
import { SectionHeading } from "../../components/ui/section-heading";
import { getServerAccessContext } from "../../server/access/actor";
import { getOrganizationScopes } from "../../server/organization/scopes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "خانه سازمان | دنا",
  robots: { index: false, follow: false },
};

export default async function OrganizationHomePage() {
  if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET ||
      !process.env.BETTER_AUTH_URL) redirect("/login");
  const actor = await getServerAccessContext();
  if (!actor) redirect("/login");
  if (!actor.memberships.some((entry) => entry.role === "organization")) notFound();
  const organizations = await getOrganizationScopes(actor.userId);
  if (!organizations.length) notFound();

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
        <p className="text-sm font-bold text-dena-brand">خانه سازمان در دنا</p>
        <h1 className="mt-2 text-[27px] font-extrabold leading-relaxed text-dena-deep md:text-[31px]">
          سازمان‌های دارای دسترسی من
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-8">
          فقط سازمان‌هایی نمایش داده می‌شوند که نقش سازمانی فعالِ حساب شما
          به هویت بررسی‌شدهٔ آن‌ها در پایگاه داده متصل است. این بررسی داخلی،
          مجوز رسمی آموزشی یا ثبت قانونی جدید صادر نمی‌کند.
        </p>
      </section>

      <section aria-labelledby="organization-overview" className="space-y-4">
        <SectionHeading id="organization-overview" note="از عضویت فعال و هویت ثبت‌شده">
          وضعیت دسترسی سازمانی
        </SectionHeading>
        <Card className="max-w-sm">
          <p className="text-sm text-dena-muted">
            سازمان‌های قابل مشاهده برای این حساب
          </p>
          <p className="mt-2 text-[29px] font-extrabold text-dena-brand">
            {organizations.length.toLocaleString("fa-IR")}
          </p>
          <p className="mt-1 text-xs leading-7 text-dena-muted">
            شمار محدوده‌های مجاز؛ نه تعداد اعضا، خریدها یا دانش‌آموزان.
          </p>
        </Card>
      </section>

      <section aria-labelledby="organization-scopes" className="space-y-4">
        <SectionHeading id="organization-scopes">
          هویت‌های سازمانی ثبت‌شده
        </SectionHeading>
        <ul className="grid gap-4 md:grid-cols-2">
          {organizations.map((organization) => (
            <li key={organization.id}
              className="space-y-3 rounded-2xl border border-dena-border bg-white p-6">
              <h2 className="text-lg font-extrabold leading-8">
                {organization.name}
              </h2>
              <p className="text-sm font-semibold text-dena-deep">
                عضویت سازمانی فعال و بررسی هویت در دنا ثبت شده است
              </p>
              <p className="text-sm leading-7 text-dena-muted">
                تاریخ ثبت بررسی داخلی:{" "}
                <time dateTime={organization.verifiedAt.toISOString()}>
                  {new Intl.DateTimeFormat("fa-IR", {
                    dateStyle: "medium", timeZone: "Asia/Tehran",
                  }).format(organization.verifiedAt)}
                </time>
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="organization-next" className="space-y-4">
        <SectionHeading id="organization-next">
          اعضا، تخصیص دوره و گزارش استفاده
        </SectionHeading>
        <Card>
          <p className="text-sm leading-8 text-dena-muted">
            فرایند افزودن عضو و تخصیص دوره، گزارش تجمیعی استفاده و سفارش یا
            صورتحساب هنوز به بک‌اند عملیاتی متصل نشده‌اند؛ این صفحه هیچ
            عضویت دانش‌آموز، تخصیص، پرداخت یا گزارش مصرفی را حدس نمی‌زند.
            اطلاعات فردی دانش‌آموزان نیز از این مسیر ارائه نمی‌شود.
          </p>
        </Card>
      </section>
    </main>
  );
}
