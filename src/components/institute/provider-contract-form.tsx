"use client";
import { useActionState } from "react";
import { saveCompensationDraft } from "../../app/institute/provider-contracts/actions";
import { compensationBasisLabels } from "../../lib/provider-compensation";
import { Button } from "../ui/button";
export function ProviderContractForm({collaborations,requestId}:{collaborations:{id:string;provider_name:string;institute_name:string}[];requestId:string}) {
  const [message,action,pending]=useActionState(saveCompensationDraft,"");
  const field="mt-2 min-h-11 w-full rounded-lg border border-dena-border bg-white px-3 text-sm font-normal";
  return <form action={action} className="space-y-4">
    <input type="hidden" name="clientRequestId" value={requestId}/>
    <label className="block text-sm font-bold">همکاری تأییدشده<select required name="collaborationId" defaultValue="" className={field}><option value="">انتخاب ارائه‌دهنده و مؤسسه</option>{collaborations.map((item)=><option key={item.id} value={item.id}>{item.provider_name} · {item.institute_name}</option>)}</select></label>
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="text-sm font-bold">شناسهٔ مرجع قرارداد<input name="reference" required minLength={3} maxLength={160} className={field}/></label>
      <label className="text-sm font-bold">درصد سهم ارائه‌دهنده<input name="percent" required type="number" min={0} max={100} step="0.01" className={field}/></label>
      <label className="text-sm font-bold">مبنای محاسبهٔ سهم<select name="shareBasis" required defaultValue="" className={field}><option value="">انتخاب مبنا</option>{Object.entries(compensationBasisLabels).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
      <label className="text-sm font-bold">شروع پیشنهادی<input name="proposedStart" required type="date" className={field}/></label>
      <label className="text-sm font-bold">پایان پیشنهادی، اختیاری<input name="proposedEnd" type="date" className={field}/></label>
    </div>
    <label className="block text-sm font-bold">شرایط پیشنهادی تسویه<textarea name="settlementTerms" required minLength={15} maxLength={1500} rows={4} className={`${field} p-3 leading-7`}/></label>
    <p className="text-xs leading-7 text-dena-muted">درصد بالا از سهم مؤسسه و بر مبنای انتخاب‌شده است. ثبت پیش‌نویس به معنی پذیرش طرف مقابل یا فعال‌شدن پرداخت نیست.</p>
    {message&&<p role="status" className="text-sm leading-7 text-dena-deep">{message}</p>}
    <Button type="submit" disabled={pending||!collaborations.length}>{pending?"در حال ثبت…":"ثبت پیش‌نویس قرارداد"}</Button>
  </form>;
}
