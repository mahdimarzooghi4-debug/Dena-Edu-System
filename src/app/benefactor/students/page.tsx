import { getBenefactorLearning } from "../../../server/benefactor/learning";
import { BenefactorPageHeader } from "../../../components/benefactor/page-header";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { buttonClassName } from "../../../components/ui/button";
import { Card } from "../../../components/ui/card";
import { getServerAccessContext } from "../../../server/access/actor";
import { getBenefactorScopes } from "../../../server/benefactor/scopes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "دانش‌آموزان تحت حمایت | دنا",
  robots: { index: false, follow: false },
};

export default async function BenefactorStudentsPage() {
  if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET ||
      !process.env.BETTER_AUTH_URL) redirect("/login");
  const actor = await getServerAccessContext();
  if (!actor) redirect("/login");
  if (!actor.memberships.some((membership) => membership.role === "benefactor")) {
    notFound();
  }
  const scopes = await getBenefactorScopes(actor.userId);
  if (!scopes.length) notFound();

  const learning = await getBenefactorLearning(actor.userId);
  const recipients = [...new Set(learning.map((row) => row.recipient_id))];
  return <div>
    <BenefactorPageHeader title="دانش‌آموزان تحت حمایت شما" section="دانش‌آموزان" />
    <main id="main-content" className="space-y-5 p-5 md:p-8">
      <div>
        <h2 className="font-extrabold text-dena-deep">گزارش‌های تحصیلی دانش‌آموزان تحت حمایت</h2>
        <p className="mt-2 text-sm text-dena-muted">گزارش‌های این بخش با حفظ حریم خصوصی دریافت‌کنندگان حمایت نمایش داده می‌شوند.</p>
      </div>
      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[38rem] text-right text-sm">
          <caption className="sr-only">گزارش دانش‌آموزان تحت حمایت</caption>
          <thead className="bg-dena-bg text-dena-muted"><tr>
            {["شناسهٔ ناشناس", "پایه و رشته", "دوره‌های فعال", "آخرین وضعیت رشد", "آخرین فعالیت"].map((label) =>
              <th key={label} scope="col" className="px-4 py-3 font-bold">{label}</th>)}
          </tr></thead>
          <tbody className="divide-y divide-dena-border">
            {recipients.map((id) => {
              const courses = learning.filter((row) => row.recipient_id === id);
              const activity = courses.flatMap((row) => row.last_activity ? [new Date(row.last_activity)] : [])
                .sort((a, b) => b.getTime() - a.getTime())[0];
              return <tr key={id}>
                <th scope="row" className="px-4 py-3">
                  <Link href={`/benefactor/students/learning?recipient=${id}`} className="font-bold text-dena-brand hover:underline">
                    دانش‌آموز <span dir="ltr">{id.slice(0, 8)}</span>
                  </Link>
                </th>
                <td className="px-4 py-3">—</td>
                <td className="px-4 py-3">{courses.map((row) => row.course_title).join("، ")}</td>
                <td className="px-4 py-3">{courses.reduce((sum, row) => sum + row.completed_videos, 0).toLocaleString("fa-IR")} ویدئوی تکمیل‌شده</td>
                <td className="px-4 py-3">{activity ? activity.toLocaleDateString("fa-IR", { timeZone: "Asia/Tehran" }) : "ثبت نشده"}</td>
              </tr>;
            })}
            {!recipients.length && <tr><td colSpan={5} className="px-5 py-7 text-sm leading-7 text-dena-muted">
              هنوز حمایت مالی تأییدشده‌ای برای نمایش گزارش ثبت نشده است.
            </td></tr>}
          </tbody>
        </table>
      </Card>
      <div className="flex flex-wrap gap-3">

        <Link href="/benefactor/reports" className={buttonClassName("secondary")}>مشاهدهٔ وضعیت گزارش‌ها</Link>
        <Link href="/benefactor" className={buttonClassName("secondary")}>بازگشت به داشبورد</Link>
      </div>
    </main>
  </div>;
}
