"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getServerAccessContext } from "../../../../server/access/actor";
import { bindServiceContract } from "../../../../server/institute/provider-service-contract";
export async function saveServiceProviderContract(_:string,form:FormData):Promise<string> {
  const actor=await getServerAccessContext();if(!actor) redirect("/login");
  const serviceId=String(form.get("serviceId")??"");
  const result=await bindServiceContract(actor.userId,serviceId,String(form.get("contractId")??""));
  if(result==="invalid") return "خدمت و قرارداد را انتخاب کنید.";
  if(result==="forbidden") return "به این خدمت دسترسی ندارید.";
  if(result==="unavailable") return "قرارداد فعال و معتبر در همین مؤسسه پیدا نشد.";
  revalidatePath(`/institute/services/${serviceId}`);revalidatePath("/student/services");
  return "قرارداد به سفارش‌های جدید این خدمت متصل شد. قرارداد سفارش‌های قبلی تغییر نمی‌کند.";
}
