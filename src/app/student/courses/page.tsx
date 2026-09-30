import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Card } from "../../../components/ui/card";
import { FreeCourses } from "../../../components/student/free-courses";
import { StudentShell } from "../../../components/student/student-shell";
import { getServerAccessContext } from "../../../server/access/actor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "دوره‌های من | دنا",
  robots: { index: false, follow: false },
};

export default async function StudentCoursesPage() {
  if (
    !process.env.DATABASE_URL ||
    !process.env.BETTER_AUTH_SECRET ||
    !process.env.BETTER_AUTH_URL
  ) {
    redirect("/login");
  }

  const actor = await getServerAccessContext();
  if (!actor) redirect("/login");
  if (!actor.memberships.some((member) => member.role === "student")) notFound();

  return (
    <StudentShell active="courses" title="دوره‌های من">
      <div className="space-y-6">
        <Card className="rounded-[22px] p-6 md:p-8">
          <p className="text-sm font-bold text-dena-brand">دوره‌های در دسترس</p>
          <h2 className="mt-2 text-2xl font-extrabold">یادگیری خودت را ادامه بده</h2>
          <p className="mt-3 max-w-3xl text-sm leading-8 text-dena-muted">
            فقط دوره‌هایی در فهرست می‌آیند که انتشار معتبر، نظارت تأییدشده و
            محتوای آماده دارند. فیلتر «ثبت‌نام‌های من» فقط دوره‌های فعال خودت را نشان می‌دهد.
          </p>
        </Card>

        <Card className="rounded-[22px] p-5 md:p-7">
          <FreeCourses />
        </Card>
      </div>
    </StudentShell>
  );
}
