"use client";
import { useActionState } from "react";
import { activateProviderContract } from "../../app/institute/provider-contracts/actions";
export function ContractActivationForm({draftId}:{draftId:string}) {
  const [message,action,pending]=useActionState(activateProviderContract,"");
  return <form action={action} className="space-y-3 border-t pt-4">
    <input type="hidden" name="draftId" value={draftId}/>
    <p className="text-xs leading-7 text-dena-muted">شرایط پذیرفته‌شده در بازهٔ قرارداد فعال می‌شود. فعال‌سازی به‌تنهایی وجه یا ماندهٔ قابل تسویه ایجاد نمی‌کند.</p>
    <button disabled={pending} className="rounded-lg bg-dena-brand px-4 py-3 text-sm font-bold text-white disabled:opacity-50">{pending?"در حال فعال‌سازی…":"فعال‌سازی قرارداد پذیرفته‌شده"}</button>
    <p role="status" className="text-sm leading-7">{message}</p>
  </form>;
}
