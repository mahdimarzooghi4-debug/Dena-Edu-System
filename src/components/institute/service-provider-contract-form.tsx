"use client";
import { useActionState } from "react";
import { saveServiceProviderContract } from "../../app/institute/services/[serviceId]/provider-contract-actions";
export function ServiceProviderContractForm({serviceId,options}:{serviceId:string;options:{id:string;reference:string;provider_name:string;selected:boolean|null}[]}) {
  const [message,action,pending]=useActionState(saveServiceProviderContract,"");
  return <section className="space-y-4 rounded-xl border bg-white p-5"><h2 className="font-extrabold">ارائه‌دهندهٔ خدمت و قرارداد سهم</h2><p className="text-sm leading-7 text-dena-muted">برای خدمت ارائه‌دهندهٔ تحت نظارت، قرارداد فعال همین مؤسسه را انتخاب کنید. سفارش جدید مبلغ و قرارداد را در سرور ثبت می‌کند. خدمات عادی مؤسسه به این اتصال نیاز ندارند.</p>
    <form action={action} className="space-y-3"><input type="hidden" name="serviceId" value={serviceId}/><label className="block text-sm font-bold">قرارداد فعال<select name="contractId" required defaultValue={options.find(item=>item.selected)?.id??""} className="mt-2 min-h-11 w-full rounded-lg border px-3"><option value="">انتخاب قرارداد</option>{options.map(item=><option key={item.id} value={item.id}>{item.provider_name} · {item.reference}</option>)}</select></label>
    {!options.length&&<p className="text-sm text-dena-muted">قرارداد فعالی در بازهٔ جاری موجود نیست.</p>}
    <button disabled={pending||!options.length} className="rounded-lg bg-dena-brand px-4 py-3 text-sm font-bold text-white disabled:opacity-50">{pending?"در حال ثبت…":"اتصال قرارداد به خدمت"}</button><p role="status" className="text-sm leading-7">{message}</p></form>
  </section>;
}
