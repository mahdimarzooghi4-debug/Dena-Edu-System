import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Card } from "../../../components/ui/card";
import { FreeCourses } from "../../../components/student/free-courses";
import { getServerAccessContext } from "../../../server/access/actor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "دوره‌های رایگان | دنا", robots: { index: false, follow: false },
};

export default async function StudentFreeCoursesPage() {
  if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET ||
      !process.env.BETTER_AUTH_URL) redirect("/login");
  const actor = await getServerAccessContext();
  if (!actor) redirect("/login");
  if (!actor.memberships.some((member) => member.role === "student")) notFound();
  return (
    <main id="main-content" className="mx-auto min-h-screen max-w-4xl px-5 py-8 md:py-14">
      <Link href="/account" className="text-sm font-bold text-dena-brand hover:underline">
        بازگشت به حساب من
      </Link>
      <Card className="mt-6 rounded-[24px] p-6 md:p-10">
        <p className="text-sm font-bold text-dena-brand">دانش‌آموز دنا</p>
        <h1 className="mt-3 text-2xl font-extrabold">دوره‌های رایگان منتشرشده</h1>
        <p className="mb-7 mt-3 text-sm leading-8 text-dena-muted">
          تنها دوره‌هایی نمایش داده می‌شوند که مؤسسه مسئول نظارت بر همان دوره
          را تأیید کرده، ارائه‌دهنده آن را منتشر کرده و محتوای خصوصی آماده است.
          ثبت‌نام در این فاز رایگان است؛ پرداخت و دوره‌های پولی فعال نیستند.
        </p>
        <FreeCourses />
      </Card>
    </main>
  );
}
