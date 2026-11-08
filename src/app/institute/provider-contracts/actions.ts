"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getServerAccessContext } from "../../../server/access/actor";
import { activateCompensationContract,createCompensationDraft } from "../../../server/provider/compensation";
export async function saveCompensationDraft(_:string,form:FormData):Promise<string> {
  const actor=await getServerAccessContext();
  if(!actor) redirect("/login");
  const percent=String(form.get("percent")??"").trim();
  if(!/^\d{1,3}(\.\d{1,2})?$/.test(percent) || Number(percent)>100) return "درصد سهم باید بین صفر و صد و حداکثر دو رقم اعشار باشد.";
  const result=await createCompensationDraft(actor.userId,{
    collaborationId:form.get("collaborationId"),clientRequestId:form.get("clientRequestId"),reference:form.get("reference"),
    shareBasis:form.get("shareBasis"),shareBasisPoints:Math.round(Number(percent)*100),proposedStart:form.get("proposedStart"),
    proposedEnd:form.get("proposedEnd")||null,settlementTerms:form.get("settlementTerms"),
  });
  if(result==="invalid") return "مبنای سهم، شناسهٔ قرارداد، تاریخ‌ها و شرایط تسویه را بررسی کنید.";
  if(result==="forbidden") return "عضویت مؤسسه یا تأیید همکاری معتبر نیست.";
  if(result==="conflict") return "این شناسهٔ درخواست قبلاً با اطلاعات دیگری ثبت شده است؛ صفحه را تازه کنید.";
  revalidatePath("/institute/provider-contracts");revalidatePath("/provider/revenue");
  return "پیش‌نویس ثبت شد. این ثبت هنوز قرارداد فعال یا ماندهٔ قابل تسویه ایجاد نمی‌کند.";
}

export async function activateProviderContract(_:string,form:FormData):Promise<string> {
  const actor=await getServerAccessContext();
  if(!actor) redirect("/login");
  const result=await activateCompensationContract(actor.userId,String(form.get("draftId")??""));
  if(result==="forbidden") return "دسترسی مؤسسه یا همکاری تأییدشده معتبر نیست.";
  if(result==="invalid") return "شناسهٔ قرارداد معتبر نیست.";
  if(result==="not_accepted") return "ابتدا ارائه‌دهنده باید شرایط همین قرارداد را بپذیرد.";
  if(result==="expired") return "بازهٔ این قرارداد پایان یافته است؛ پیشنهاد جدید ثبت کنید.";
  if(result==="overlap") return "در این بازه، قرارداد فعال دیگری برای همین همکاری وجود دارد.";
  revalidatePath("/institute/provider-contracts");revalidatePath("/provider/revenue");
  return "قرارداد فعال شد؛ ثبت درآمد و تسویه به اتصال رویدادهای مالی نیاز دارد.";
}
