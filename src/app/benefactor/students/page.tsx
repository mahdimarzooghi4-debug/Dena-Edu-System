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
          <tbody><tr><td colSpan={5} className="px-5 py-7 text-sm leading-7 text-dena-muted">
            گزارش‌های ناشناس حمایت هنوز برای این حساب در دسترس نیستند.
          </td></tr></tbody>
        </table>
      </Card>
      <div className="flex flex-wrap gap-3">
        <Link href="/benefactor/reports" className={buttonClassName("secondary")}>مشاهدهٔ وضعیت گزارش‌ها</Link>
        <Link href="/benefactor" className={buttonClassName("secondary")}>بازگشت به داشبورد</Link>
      </div>
    </main>
  </div>;
}
