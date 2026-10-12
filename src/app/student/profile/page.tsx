import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { buttonClassName } from "@/components/ui/button";
import { StudentShell } from "@/components/student/student-shell";
import { getServerAccessContext } from "@/server/access/actor";
import { getStudentProfile } from "@/server/student/profile";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "پروفایل کاربری | دنا",
  robots: { index: false, follow: false },
};

function phoneLabel(value: string | null) {
  if (!value) return "ثبت نشده";
  return value;
}

export default async function StudentProfilePage() {
  if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET ||
      !process.env.BETTER_AUTH_URL) redirect("/login");

  const actor = await getServerAccessContext();
  if (!actor) redirect("/login");
  if (!actor.memberships.some((entry) => entry.role === "student")) notFound();

  const profile = await getStudentProfile(actor.userId);
  if (!profile) notFound();

  return (
    <StudentShell active="account" title="پروفایل کاربری">
      <div className="space-y-6">
        <Card className="rounded-[22px] p-6 md:p-8">
          <p className="text-sm font-bold text-dena-brand">اطلاعات حساب</p>
          <h2 className="mt-2 text-2xl font-extrabold">{profile.name}</h2>

          <dl className="mt-6 grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl bg-dena-bg p-5">
              <dt className="text-xs text-dena-muted">نام نمایشی</dt>
              <dd className="mt-2 font-bold">{profile.name}</dd>
            </div>
            <div className="rounded-2xl bg-dena-bg p-5">
              <dt className="text-xs text-dena-muted">شماره همراه</dt>
              <dd className="mt-2 font-bold" dir="ltr">
                {phoneLabel(profile.phoneNumber)}
              </dd>
              {profile.phoneNumber && (
                <p className="mt-2 text-xs text-dena-muted">
                  {profile.phoneNumberVerified ? "تأیید شده" : "هنوز تأیید نشده"}
                </p>
              )}
            </div>
          </dl>

          <p className="mt-5 text-xs leading-7 text-dena-muted">
            تغییر شماره همراه باید با workflow مستقل OTP و کنترل امنیتی انجام شود؛
            تا زمان پیاده‌سازی آن، این صفحه شماره را مستقیماً ویرایش نمی‌کند.
          </p>
        </Card>

        <section className="grid gap-4 md:grid-cols-2" aria-label="تنظیمات حساب">
          <Card className="rounded-[22px] p-6">
            <h2 className="text-lg font-extrabold">حریم خصوصی و داده</h2>
            <p className="mt-2 text-sm leading-7 text-dena-muted">
              یادداشت‌های شخصی ویدئو فقط برای خودت هستند و در گزارش مؤسسه،
              سازمان یا خیر نمایش داده نمی‌شوند.
            </p>
            <Link
              href="/student/privacy"
              className={buttonClassName("secondary", "mt-5")}
            >
              مدیریت داده‌های شخصی
            </Link>
          </Card>

          <Card className="rounded-[22px] p-6">
            <h2 className="text-lg font-extrabold">حساب دنا</h2>
            <p className="mt-2 text-sm leading-7 text-dena-muted">
              مدیریت نقش‌های سازمانی، نشست و خروج از حساب در فضای اصلی حساب انجام می‌شود.
            </p>
            <Link
              href="/account"
              className={buttonClassName("outline", "mt-5")}
            >
              رفتن به حساب من
            </Link>
          </Card>
        </section>
      </div>
    </StudentShell>
  );
}
