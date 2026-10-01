import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { Card } from "../../components/ui/card";
import { buttonClassName } from "../../components/ui/button";
import { roleLabels } from "../../lib/preview";
import { navigation } from "../../lib/navigation";
import {
  getServerAccessContext,
  getServerIdentity,
} from "../../server/access/actor";
import { SignOutButton } from "../../components/auth/sign-out-button";
import { getActiveCourseTeamAssignments } from "../../server/course-team/conversations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "حساب من | دنا", robots: { index: false, follow: false } };

export default async function AccountPage() {
  // A public build and preview require no live DB/secrets.
  if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET ||
      !process.env.BETTER_AUTH_URL) redirect("/login");
  const identity = await getServerIdentity();
  if (!identity) redirect("/login");
  const [actor, courseTeamAssignments] = await Promise.all([
    getServerAccessContext(),
    getActiveCourseTeamAssignments(identity.userId),
  ]);
  const activeMemberships = actor?.memberships ?? [];
  const activeRoles = [...new Set(activeMemberships.map((membership) => membership.role))];

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
            {activeMemberships.map((entry, index) => (
              <li key={index} className="rounded-full bg-dena-lavender px-4 py-2 text-sm font-semibold text-dena-deep">
                {roleLabels[entry.role]}
              </li>
            ))}
            {courseTeamAssignments.length > 0 && (
              <li className="rounded-full bg-dena-lavender px-4 py-2 text-sm font-semibold text-dena-deep">
                عضو تیم آموزشی دوره
              </li>
            )}
            {activeMemberships.length === 0 && courseTeamAssignments.length === 0 && (
              <li className="rounded-full bg-dena-bg px-4 py-2 text-sm font-semibold text-dena-muted">
                هنوز دسترسی عملیاتی فعالی ثبت نشده است
              </li>
            )}
          </ul>
        </section>
        <p className="rounded-xl bg-dena-bg p-4 text-sm leading-7 text-dena-muted">
          دسترسی‌ها از عضویت فعال پایگاه داده تعیین می‌شوند. بعضی گردش‌کارها
          هنوز به دادهٔ عملیاتی وصل نیستند؛ وضعیت هر قابلیت در صفحهٔ همان نقش
          مشخص شده است. این صفحه فقط وضعیت نشست و نقش‌های معتبر شما را نمایش می‌دهد.
        </p>
        <div className="flex flex-wrap gap-3">
          {activeMemberships.length > 0 && (
            <Link href="/support" className={buttonClassName("secondary")}>
              پشتیبانی فنی
            </Link>
          )}
          <Link href="/account/role-applications" className={buttonClassName("secondary")}>
            درخواست و پیگیری نقش سازمانی
          </Link>
          {activeMemberships.some((entry) => entry.role === "student") && (
            <Link href="/student/privacy" className={buttonClassName("secondary")}>
              مدیریت یادداشت‌های شخصی
            </Link>
          )}
          {activeMemberships.some((entry) => entry.role === "student") && (
            <Link href="/student/progress" className={buttonClassName("secondary")}>
              پیگیری شخصی ویدئوها
            </Link>
          )}
          {courseTeamAssignments.length > 0 && (
            <Link href="/course-team" className={buttonClassName("secondary")}>
              فضای تیم آموزشی
            </Link>
          )}
          <Link href="/" className={buttonClassName("outline")}>بازگشت به صفحه اصلی</Link>
        </div>
        {activeRoles.length > 0 && (
          <section aria-labelledby="active-role-panels" className="mt-8 border-t border-dena-border pt-6">
            <h2 id="active-role-panels" className="text-lg font-extrabold">
              مسیرهای پنل‌های فعال
            </h2>
            <ul className="mt-4 grid gap-3 md:grid-cols-2">
              {activeRoles.map((role) => {
                const routes = navigation[role].filter((route) =>
                  route.href !== "/admin/support" || activeMemberships.some((membership) =>
                    membership.role === "admin" && membership.canHandleTechnicalSupport));
                return (
                  <li key={role}>
                    <details className="rounded-xl border border-dena-border bg-white p-4">
                      <summary className="cursor-pointer font-bold text-dena-deep">
                        پنل {roleLabels[role]}
                      </summary>
                      <ul className="mt-3 space-y-2 border-t border-dena-border pt-3">
                        {routes.map((route) => (
                          <li key={route.href}>
                            <Link href={route.href}
                              className="text-sm font-semibold text-dena-brand hover:underline">
                              {route.title}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </details>
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </Card>
    </main>
  );
}
