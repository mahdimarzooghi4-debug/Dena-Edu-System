import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Card } from "../../components/ui/card";
import { buttonClassName } from "../../components/ui/button";
import { SectionHeading } from "../../components/ui/section-heading";
import { getServerAccessContext } from "../../server/access/actor";
import { getAdminReviewOverview } from "../../server/admin/dashboard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "خانه مدیر | دنا",
  robots: { index: false, follow: false },
};

const roleNames = {
  institute: "مؤسسه",
  provider: "ارائه‌دهنده",
  organization: "سازمان",
  benefactor: "خیر",
} as const;

export default async function AdminHomePage() {
  if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET ||
      !process.env.BETTER_AUTH_URL) redirect("/login");
  const actor = await getServerAccessContext();
  if (!actor) redirect("/login");
  if (!actor.memberships.some((item) => item.role === "admin")) notFound();

  const { pendingCount, pending, hasMore } = await getAdminReviewOverview();
  return (
    <main id="main-content"
      className="mx-auto min-h-screen max-w-5xl space-y-8 px-5 py-8 md:px-10 md:py-12">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <Link href="/account"
          className="text-sm font-bold text-dena-brand hover:underline">
          بازگشت به حساب من
        </Link>
        <Link href="/admin/role-applications"
          className={buttonClassName("secondary")}>
          صف بررسی درخواست‌های نقش
        </Link>
      </header>

      <section className="rounded-[20px] bg-dena-lavender px-6 py-7 md:px-8">
        <p className="text-sm font-bold text-dena-brand">خانه مدیر دنا</p>
        <h1 className="mt-2 text-[27px] font-extrabold leading-relaxed text-dena-deep md:text-[31px]">
          نمای کلی درخواست‌های نقش
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-8">
          وضعیت پرونده‌های نقش از پایگاه داده خوانده می‌شود؛ تصمیم‌گیری
          فقط پس از بررسی مستقل مدارک و ثبت دلیل در صف اختصاصی انجام می‌شود.
        </p>
      </section>

      <section aria-labelledby="admin-overview" className="space-y-4">
        <SectionHeading id="admin-overview">
          وضعیت صف بررسی
        </SectionHeading>
        <Card className="max-w-sm">
          <p className="text-sm text-dena-muted">
            کل درخواست‌های در انتظار بررسی
          </p>
          <p className="mt-2 text-[29px] font-extrabold text-dena-brand">
            {pendingCount.toLocaleString("fa-IR")}
          </p>
          <p className="mt-1 text-xs leading-7 text-dena-muted">
            شمارش زندهٔ درخواست‌های pending، نه تعداد کاربران یا مجوزهای صادرشده.
          </p>
        </Card>
      </section>

      <section aria-labelledby="admin-pending" className="space-y-4">
        <SectionHeading id="admin-pending">
          نخستین پرونده‌های در انتظار
        </SectionHeading>
        {pending.length === 0 ? (
          <Card>
            <h2 className="text-lg font-extrabold">
              درخواستی در صف بررسی نیست
            </h2>
            <p className="mt-3 text-sm leading-8 text-dena-muted">
              در صورت ثبت درخواست جدید، از همین مسیر می‌توان به صف رسیدگی رفت.
            </p>
          </Card>
        ) : (
          <ul className="grid gap-4 md:grid-cols-2">
            {pending.map((item) => (
              <li key={item.id}
                className="space-y-3 rounded-2xl border border-dena-border bg-white p-6">
                <h2 className="text-lg font-extrabold leading-8">
                  {roleNames[item.role]} · {item.proposedName}
                </h2>
                <p className="text-sm text-dena-muted">
                  در انتظار بررسی مستقل مدارک
                </p>
              </li>
            ))}
          </ul>
        )}
        {hasMore && (
          <p className="text-sm text-dena-muted">
            فقط ۱۰ پروندهٔ قدیمی‌تر اینجا نمایش داده می‌شود؛
            برای صف کامل این فاز به صفحهٔ بررسی مراجعه کنید.
          </p>
        )}
        {pending.length > 0 && (
          <Link href="/admin/role-applications"
            className={buttonClassName("secondary")}>
            ورود به صف بررسی درخواست‌ها
          </Link>
        )}
      </section>

      <Card>
        <h2 className="text-lg font-extrabold">دامنهٔ این فاز</h2>
        <p className="mt-3 text-sm leading-8 text-dena-muted">
          این صفحه دادهٔ مدارک محرمانه، شماره تماس، وضعیت مالی، تیکت فنی
          یا گزارش پیشرفت دانش‌آموزان را نمایش نمی‌دهد. تأیید درخواست
          خودِ مدیر در گردش‌کار بررسی ممنوع است. پنل کامل مدیر هنوز آماده نیست.
        </p>
      </Card>
    </main>
  );
}
