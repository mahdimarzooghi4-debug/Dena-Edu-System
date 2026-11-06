"use client";
import { useActionState } from "react";
import { decideContract } from "../../app/provider/revenue/actions";
export function ContractDecisionForm({draftId}:{draftId:string}) {
  const [message,action,pending]=useActionState(decideContract,"");
  return <form action={action} className="space-y-3 border-t border-dena-line pt-4">
    <input type="hidden" name="draftId" value={draftId}/>
    <p className="text-xs leading-7 text-dena-muted">پذیرش، تأیید همین درصد، مبنای سهم، تاریخ‌ها و شرایط پیشنهادی است. فعال‌سازی مالی و تسویه مرحلهٔ جداگانه‌ای دارد.</p>
    <div className="flex flex-wrap gap-3"><button disabled={pending} name="decision" value="accepted" className="rounded-lg bg-dena-brand px-4 py-3 text-sm font-bold text-white disabled:opacity-50">پذیرش شرایط</button><button disabled={pending} name="decision" value="rejected" className="rounded-lg border px-4 py-3 text-sm font-bold disabled:opacity-50">رد پیشنهاد</button></div>
    <p role="status" className="text-sm leading-7">{pending?"در حال ثبت تصمیم…":message}</p>
  </form>;
}
