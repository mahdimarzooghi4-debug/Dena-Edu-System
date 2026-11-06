import { compensationBasisLabels,type CompensationDraftRow } from "../../lib/provider-compensation";
import { Card } from "../ui/card";
const date=(value:string)=>new Intl.DateTimeFormat("fa-IR",{dateStyle:"medium",timeZone:"Asia/Tehran"}).format(new Date(`${value}T12:00:00Z`));
export function CompensationDrafts({drafts}:{drafts:CompensationDraftRow[]}) {
  return <section className="space-y-4" aria-labelledby="compensation-drafts"><h2 id="compensation-drafts" className="text-lg font-extrabold">پیش‌نویس قراردادهای سهم ارائه‌دهنده</h2><p className="text-xs text-dena-muted">حداکثر ۱۰۰ پیش‌نویس اخیر؛ این فهرست ماندهٔ مالی یا صورت‌حساب نیست.</p>
    {!drafts.length?<Card><p className="text-sm text-dena-muted">پیش‌نویس قراردادی ثبت نشده است.</p></Card>:<ul className="space-y-4">{drafts.map((draft)=><li key={draft.id}><Card className="space-y-4 rounded-xl p-5"><header className="flex flex-wrap justify-between gap-3"><div><h3 className="font-bold text-dena-deep">{draft.provider_name} · {draft.institute_name}</h3><p className="mt-2 break-words text-xs text-dena-muted">مرجع: {draft.reference}</p></div><span className="h-fit rounded-md bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-800">پیش‌نویس · فعال نشده</span></header>
      <dl className="grid gap-4 text-sm sm:grid-cols-2"><div><dt className="text-xs text-dena-muted">سهم پیشنهادی ارائه‌دهنده</dt><dd className="mt-2 font-bold">{(draft.share_basis_points/100).toLocaleString("fa-IR")}٪ از {compensationBasisLabels[draft.share_basis]}</dd></div><div><dt className="text-xs text-dena-muted">بازهٔ پیشنهادی</dt><dd className="mt-2">{date(draft.proposed_start)} تا {draft.proposed_end?date(draft.proposed_end):"بدون تاریخ پایان پیشنهادی"}</dd></div></dl>
      <p className="whitespace-pre-wrap break-words rounded-lg bg-dena-bg p-4 text-sm leading-8">{draft.settlement_terms}</p>
    </Card></li>)}</ul>}
  </section>;
}
