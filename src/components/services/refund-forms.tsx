"use client";
import { useActionState } from "react";
import { requestRefund,reviewRefund } from "../../app/service-refunds/actions";
export function RefundRequestForm({orderId}:{orderId:string}) {
  const [message,action,pending]=useActionState(requestRefund,"");
  return <form action={action} className="space-y-3 border-t pt-4"><input type="hidden" name="orderId" value={orderId}/><label className="block text-sm font-bold">درخواست بررسی بازپرداخت<textarea name="reason" required minLength={10} maxLength={1500} rows={3} className="mt-2 w-full rounded-lg border p-3 font-normal" placeholder="دلیل درخواست را بنویسید"/></label><button disabled={pending} className="rounded-lg border px-4 py-3 text-sm font-bold disabled:opacity-50">{pending?"در حال ثبت…":"ثبت درخواست بازپرداخت"}</button><p role="status" className="text-sm leading-7">{message}</p></form>;
}
export function RefundReviewForm({requestId}:{requestId:string}) {
  const [message,action,pending]=useActionState(reviewRefund,"");
  return <form action={action} className="space-y-3 border-t pt-4"><input type="hidden" name="requestId" value={requestId}/><label className="block text-sm font-bold">توضیح بررسی<textarea name="note" required minLength={10} maxLength={1500} rows={3} className="mt-2 w-full rounded-lg border p-3 font-normal"/></label><div className="flex flex-wrap gap-3"><button disabled={pending} name="decision" value="approved" className="rounded-lg bg-dena-brand px-4 py-3 text-sm font-bold text-white disabled:opacity-50">تأیید برای پیگیری بازپرداخت</button><button disabled={pending} name="decision" value="rejected" className="rounded-lg border px-4 py-3 text-sm font-bold disabled:opacity-50">رد درخواست</button></div><p role="status" className="text-sm leading-7">{pending?"در حال ثبت…":message}</p></form>;
}
