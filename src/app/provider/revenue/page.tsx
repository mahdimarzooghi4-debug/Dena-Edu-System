import { getProviderRevenue } from "../../../server/provider/revenue";
import { ProviderRevenueReport } from "../../../components/provider/revenue-report";
import Link from "next/link";
import { Card } from "../../../components/ui/card";
import { listCompensationDrafts } from "../../../server/provider/compensation";
import { CompensationDrafts } from "../../../components/provider/compensation-drafts";
import { requireProviderAccess } from "../../../server/provider/require-access";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata = { title: "درآمد و تسویهٔ ارائه‌دهنده | دنا", robots: { index: false, follow: false } };
export default async function ProviderRevenuePage() {
  const {actor}=await requireProviderAccess();
  const [drafts,report]=await Promise.all([listCompensationDrafts(actor.userId,"provider"),getProviderRevenue(actor.userId)]);
  return <main id="main-content" className="mx-auto min-h-screen max-w-7xl space-y-5 px-5 py-7 md:px-7">
    <header className="space-y-3"><p className="text-xs text-dena-muted">ارائه‌دهنده / مالی</p><h1 className="text-2xl font-extrabold text-dena-deep">درآمد و تسویه</h1></header>
    <ProviderRevenueReport report={report}/>
    <CompensationDrafts drafts={drafts} canDecide/>
    <Card className="space-y-3 rounded-xl p-5"><h2 className="font-extrabold">پیگیری مالی</h2><p className="text-sm leading-7 text-dena-muted">برای پیگیری وضعیت مالی می‌توانید درخواست پشتیبانی ثبت کنید.</p><Link href="/support" className="inline-flex rounded-lg bg-dena-brand px-4 py-3 text-sm font-bold text-white">رفتن به پشتیبانی</Link></Card>
  </main>;
}
