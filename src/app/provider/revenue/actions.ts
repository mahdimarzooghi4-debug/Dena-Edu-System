"use server";
import { revalidatePath } from "next/cache";
import { requireProviderAccess } from "../../../server/provider/require-access";
import { decideCompensationDraft } from "../../../server/provider/compensation";
export async function decideContract(_:string,form:FormData):Promise<string> {
  const {actor}=await requireProviderAccess();
  const decision=form.get("decision");
  if(decision!=="accepted"&&decision!=="rejected") return "انتخاب نامعتبر است.";
  const result=await decideCompensationDraft(actor.userId,String(form.get("draftId")??""),decision);
  if(result==="forbidden") return "دسترسی یا همکاری تأییدشده معتبر نیست.";
  if(result==="invalid") return "شناسهٔ قرارداد معتبر نیست.";
  if(result==="conflict") return "تصمیم دیگری قبلاً ثبت شده است؛ صفحه را تازه کنید.";
  revalidatePath("/provider/revenue");revalidatePath("/institute/provider-contracts");
  return decision==="accepted"?"پذیرش شرایط ثبت شد؛ قرارداد هنوز فعال مالی نشده است.":"رد پیشنهاد ثبت شد.";
}
