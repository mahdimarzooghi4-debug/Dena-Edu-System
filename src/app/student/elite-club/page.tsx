import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { StudentShell } from "@/components/student/student-shell";
import { getServerAccessContext } from "@/server/access/actor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "باشگاه نخبگان | دنا", robots: { index: false, follow: false } };

export default async function StudentEliteClubPage() {
  if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET || !process.env.BETTER_AUTH_URL) redirect("/login");
  const actor = await getServerAccessContext();
  if (!actor) redirect("/login");
  if (!actor.memberships.some((entry) => entry.role === "student")) notFound();

  return (
    <StudentShell active="elite" title="باشگاه نخبگان">
      <div className="flex min-h-[calc(100svh-220px)] flex-col justify-center gap-4 py-5 lg:min-h-[calc(100vh-220px)]">
        <header className="space-y-2 text-center">
          <h2 className="text-2xl font-extrabold text-dena-deep md:text-[28px]">باشگاه نخبگان</h2>
          <p className="text-sm leading-7 text-dena-muted">فضایی ویژه برای فرصت‌ها و مسیرهای رشد بیشتر در دنا.</p>
        </header>
        <p className="text-center text-sm leading-7 text-dena-muted">شما هنوز در باشگاه نخبگان ثبت‌نام نکرده‌اید.</p>
        <div className="flex justify-center">
          <Link href="/student/elite-club/register" className="inline-flex min-h-14 items-center justify-center rounded-xl bg-dena-brand px-8 py-4 text-sm font-bold text-white hover:bg-dena-brand/90">
            ثبت‌نام در باشگاه
          </Link>
        </div>
        <Card className="mx-auto w-full max-w-xl rounded-[20px] bg-dena-bg p-5 text-center">
          <h3 className="font-extrabold text-dena-deep">باشگاه نخبگان چه فضایی است؟</h3>
          <p className="mt-2 text-sm leading-7 text-dena-muted">
            باشگاه نخبگان فضایی برای فرصت‌ها و مسیرهای رشد بیشتر در دناست. فرصت‌ها و برنامه‌های ویژه پس از ثبت‌نام و اتصال وضعیت عضویت نمایش داده می‌شوند.
          </p>
        </Card>
      </div>
    </StudentShell>
  );
}
