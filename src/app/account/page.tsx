import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { Card } from "../../components/ui/card";
import { buttonClassName } from "../../components/ui/button";
import { roleLabels } from "../../lib/preview";
import { getServerAccessContext } from "../../server/access/actor";
import { SignOutButton } from "../../components/auth/sign-out-button";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "حساب من | دنا", robots: { index: false, follow: false } };

export default async function AccountPage() {
  // A public build and preview require no live DB/secrets.
  if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET ||
      !process.env.BETTER_AUTH_URL) redirect("/login");
  const actor = await getServerAccessContext();
  if (!actor) redirect("/login");

  return (
    <main id="main-content" className="mx-auto min-h-screen max-w-4xl px-5 py-8 md:px-10 md:py-12">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <Link href="/" aria-label="صفحه اصلی دنا">
          <Image src="/dena-app-logo.png" alt="دنا" width={83} height={48} priority />
        </Link>
        <SignOutButton />
      </header>
      <Card className="mt-10 space-y-6 rounded-[24px] p-7 md:p-10">
        <div>
          <p className="text-sm font-bold text-dena-brand">حساب تأییدشده</p>
          <h1 className="mt-3 text-2xl font-extrabold md:text-3xl">به دنا خوش آمدید</h1>
          <p className="mt-3 text-sm leading-8 text-dena-muted">
            نشست شما بررسی شد؛ نقش‌های زیر از پایگاه داده سمت سرور خوانده شده‌اند،
            نه از انتخاب شما در فرم ورود.
          </p>
        </div>
        <section aria-labelledby="roles-heading">
          <h2 id="roles-heading" className="text-base font-bold">دسترسی‌های فعال شما</h2>
          <ul className="mt-4 flex flex-wrap gap-2">
            {actor.memberships.map((entry, index) => (
              <li key={index} className="rounded-full bg-dena-lavender px-4 py-2 text-sm font-semibold text-dena-deep">
                {roleLabels[entry.role]}
              </li>
            ))}
          </ul>
        </section>
        <p className="rounded-xl bg-dena-bg p-4 text-sm leading-7 text-dena-muted">
          پنل‌های عملیاتی و اطلاعات دوره‌ها در این مرحله هنوز منتشر نشده‌اند.
          این صفحه فقط وضعیت نشست و نقش‌های معتبر شما را نمایش می‌دهد.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/account/role-applications" className={buttonClassName("secondary")}>
            درخواست و پیگیری نقش سازمانی
          </Link>
          {actor.memberships.some((entry) => entry.role === "provider") && (
            <Link href="/provider/supervision" className={buttonClassName("secondary")}>
              درخواست نظارت دوره‌های من
            </Link>
          )}
          {actor.memberships.some((entry) => entry.role === "institute") && (
            <Link href="/institute/providers" className={buttonClassName("secondary")}>
              بررسی درخواست نظارت دوره‌ها
            </Link>
          )}
          {actor.memberships.some((entry) => entry.role === "admin") && (
            <Link href="/admin/role-applications" className={buttonClassName()}>
              صف بررسی درخواست‌های نقش
            </Link>
          )}
          <Link href="/" className={buttonClassName("outline")}>بازگشت به صفحه اصلی</Link>
        </div>
      </Card>
    </main>
  );
}
