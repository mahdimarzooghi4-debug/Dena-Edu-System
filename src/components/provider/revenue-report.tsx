import type { getProviderRevenue } from "../../server/provider/revenue";
import { Card } from "../ui/card";
const money=(value:string)=>BigInt(value).toLocaleString("fa-IR");
export function ProviderRevenueReport({report}:{report:Awaited<ReturnType<typeof getProviderRevenue>>}) {
  return <section className="space-y-4" aria-labelledby="provider-revenue-report"><h2 id="provider-revenue-report" className="text-lg font-extrabold">درآمد ثبت‌شده</h2>
    {report.totals.count==="0"?<Card><p className="text-sm leading-8 text-dena-muted">رویداد درآمد تأییدشده‌ای ثبت نشده است. نبود سند به معنی صفر بودن درآمد نیست.</p></Card>:<>
    <Card><p className="text-sm">جمع سهم ثبت‌شدهٔ ارائه‌دهنده: <strong>{money(report.totals.provider_total)} ریال</strong></p><p className="mt-2 text-xs text-dena-muted">از {money(report.totals.count)} سند؛ این مبلغ ماندهٔ قابل برداشت یا تسویه‌شده نیست.</p></Card>
    <div className="overflow-x-auto rounded-xl border"><table className="w-full min-w-[700px] text-right text-sm"><caption className="p-3 text-right text-xs text-dena-muted">۱۰۰ سند اخیر — همهٔ مبالغ به ریال</caption><thead className="bg-dena-bg"><tr>{["قرارداد / مؤسسه","زمان دریافت","ناخالص","سهم دنا","کارمزد","سهم شما","خالص مؤسسه"].map(label=><th key={label} className="p-3">{label}</th>)}</tr></thead><tbody>{report.rows.map(row=><tr key={row.id} className="border-t"><td className="p-3">{row.reference}<span className="block text-xs text-dena-muted">{row.institute_name}</span></td><td className="p-3">{new Date(row.captured_at).toLocaleString("fa-IR",{timeZone:"Asia/Tehran"})}</td>{[row.gross_rials,row.dena_share_rials,row.gateway_fee_rials,row.provider_share_rials,row.institute_net_rials].map((amount,index)=><td key={index} className="whitespace-nowrap p-3">{money(amount)}</td>)}</tr>)}</tbody></table></div></>}
    <p className="rounded-lg bg-amber-50 p-4 text-xs leading-7 text-amber-900">اتصال درگاه واقعی، بازپرداخت و تسویه هنوز فعال نیست. اسناد این گزارش فقط تخصیص درآمد ثبت‌شده را نشان می‌دهند.</p>
  </section>;
}
