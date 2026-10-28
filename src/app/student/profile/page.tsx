import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { buttonClassName } from "@/components/ui/button";
import { StudentShell } from "@/components/student/student-shell";
import { getServerAccessContext } from "@/server/access/actor";
import { getStudentProfile } from "@/server/student/profile";
import { StudentPhoneChangeForm } from "@/components/student/phone-change-form";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "پروفایل کاربری | دنا", robots: { index: false, follow: false } };

function phoneLabel(value: string | null) { return value || "ثبت نشده"; }

export default async function StudentProfilePage() {
  if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET || !process.env.BETTER_AUTH_URL) redirect("/login");
  const actor = await getServerAccessContext();
  if (!actor) redirect("/login");
  if (!actor.memberships.some((entry) => entry.role === "student")) notFound();
  const profile = await getStudentProfile(actor.userId);
  if (!profile) notFound();

  return (
    <StudentShell active="account" title="پروفایل کاربری">
      <div className="space-y-6">
        <section className="rounded-[22px] bg-dena-lavender px-6 py-7 md:px-8">
          <p className="text-sm font-bold text-dena-brand">پروفایل کاربری</p>
          <h1 className="mt-2 text-2xl font-extrabold text-dena-deep md:text-3xl">اطلاعات حساب و مشخصات ثبت‌شده‌ات را مدیریت کن</h1>
          <div className="mt-5 flex items-center gap-3">
            <span className="grid size-12 place-items-center rounded-full bg-white text-lg font-extrabold text-dena-brand" aria-hidden="true">{profile.name.trim().slice(0, 1) || "م"}</span>
            <div><p className="font-extrabold text-dena-deep">{profile.name}</p><p className="text-sm text-dena-muted">پروفایل دانش‌آموز</p></div>
          </div>
        </section>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(280px,1fr)]">
          <Card className="rounded-[22px] p-6 md:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div><h2 className="text-xl font-extrabold text-dena-deep">اطلاعات شخصی</h2><p className="mt-1 text-sm text-dena-muted">مشخصات ثبت‌شده برای ورود و استفاده از حساب دنا</p></div>
              <Link href="/account" className={buttonClassName("outline")}>ویرایش اطلاعات</Link>
            </div>
            <dl className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl bg-dena-bg p-5"><dt className="text-sm text-dena-muted">نام و نام خانوادگی</dt><dd className="mt-2 font-bold text-dena-deep">{profile.name}</dd></div>
              <div className="rounded-2xl bg-dena-bg p-5"><dt className="text-sm text-dena-muted">شماره ورود به حساب</dt><dd className="mt-2 font-bold text-dena-deep" dir="ltr">{phoneLabel(profile.phoneNumber)}</dd>{profile.phoneNumber && <p className="mt-2 text-xs text-dena-muted">{profile.phoneNumberVerified ? "شماره تأیید شده است" : "شماره هنوز تأیید نشده است"}</p>}</div>
            </dl>
            {profile.phoneNumberVerified ? <div className="mt-6 border-t border-dena-border pt-5"><h3 className="mb-3 font-bold text-dena-deep">تغییر شماره موبایل</h3><StudentPhoneChangeForm /></div> : <p className="mt-5 text-sm leading-7 text-dena-muted">برای تغییر شماره، ابتدا باید شمارهٔ فعلی حساب تأیید شده باشد.</p>}
          </Card>

          <Card className="rounded-[22px] bg-dena-bg p-6 md:p-7">
            <h2 className="text-lg font-extrabold text-dena-deep">حریم خصوصی و داده‌ها</h2>
            <p className="mt-2 text-sm leading-7 text-dena-muted">اطلاعات خصوصی حساب و داده‌های یادگیری‌ات بر اساس سیاست‌های دنا نگهداری می‌شوند. یادداشت‌های شخصی ویدئو در گزارش مؤسسه، سازمان یا خیر نمایش داده نمی‌شوند.</p>
            <Link href="/student/privacy" className={buttonClassName("secondary", "mt-5")}>مشاهده تنظیمات حریم خصوصی</Link>
          </Card>
        </div>

        <Card className="rounded-[22px] p-5"><p className="text-sm leading-7 text-dena-muted">اطلاعات تحصیلی مانند پایه و رشته در این حساب ثبت نشده است؛ تا زمان ثبت اطلاعات معتبر، این صفحه آن‌ها را حدس نمی‌زند.</p></Card>
      </div>
    </StudentShell>
  );
}
