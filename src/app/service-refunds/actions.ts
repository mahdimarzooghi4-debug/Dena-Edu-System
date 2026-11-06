"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getServerAccessContext } from "../../server/access/actor";
import { requestServiceRefund,reviewServiceRefund } from "../../server/finance/service-refunds";
function refresh(){revalidatePath("/student/services/orders");revalidatePath("/institute/service-orders");}
export async function requestRefund(_:string,form:FormData):Promise<string> {
  const actor=await getServerAccessContext();if(!actor) redirect("/login");
  const result=await requestServiceRefund(actor.userId,{orderId:form.get("orderId"),reason:form.get("reason")});
  if(result==="invalid") return "دلیل درخواست باید بین ۱۰ تا ۱۵۰۰ نویسه باشد.";
  if(result==="forbidden") return "سفارش پرداخت‌شدهٔ قابل دسترسی پیدا نشد.";
  if(result==="conflict") return "برای این سفارش قبلاً درخواست دیگری ثبت شده است.";
  refresh();return "درخواست برای بررسی مؤسسه ثبت شد؛ وجه هنوز برگشت داده نشده است.";
}
export async function reviewRefund(_:string,form:FormData):Promise<string> {
  const actor=await getServerAccessContext();if(!actor) redirect("/login");
  const result=await reviewServiceRefund(actor.userId,{requestId:form.get("requestId"),decision:form.get("decision"),note:form.get("note")});
  if(result==="invalid") return "تصمیم و توضیح بررسی را تکمیل کنید؛ توضیح حداقل ۱۰ نویسه لازم دارد.";
  if(result==="forbidden") return "به درخواست پرداخت‌شدهٔ این مؤسسه دسترسی ندارید.";
  if(result==="conflict") return "تصمیم دیگری قبلاً ثبت شده است؛ صفحه را تازه کنید.";
  refresh();return "نتیجهٔ بررسی ثبت شد؛ این اقدام برگشت بانکی وجه را ثبت نمی‌کند.";
}
