"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getServerAccessContext } from "../../../server/access/actor";
import { saveProviderContact } from "../../../server/provider/contact-profile";
export async function saveProviderProfile(_: string, form: FormData): Promise<string> {
  const actor = await getServerAccessContext();
  if (!actor) redirect("/login");
  const result = await saveProviderContact(actor.userId, {
    providerId: form.get("providerId"), revision: form.get("revision"),
    brandName: form.get("brandName"), phone: form.get("phone"), email: form.get("email"),
    city: form.get("city"), categories: form.getAll("categories"),
  });
  if (result === "invalid") return "اطلاعات تماس و دسته‌های انتخاب‌شده را بررسی کنید.";
  if (result === "forbidden") return "دسترسی ارائه‌دهندگی فعال برای این پروفایل ندارید.";
  if (result === "conflict") return "اطلاعات هم‌زمان تغییر کرده است؛ صفحه را تازه کنید.";
  revalidatePath("/provider/profile");
  redirect("/provider/collaborations");
}
