"use client";
import { useActionState } from "react";
import { saveProviderProfile } from "../../app/provider/profile/actions";
import { providerCategoryLabels, type ProviderContact } from "../../lib/provider-profile";
import { Button } from "../ui/button";
export function ProviderContactForm({ profile }: { profile: ProviderContact }) {
  const [message, action, pending] = useActionState(saveProviderProfile, "");
  const field = "mt-2 min-h-[42px] w-full rounded-lg border border-dena-border bg-dena-bg px-3 text-xs font-normal";
  return <form action={action} className="space-y-4 rounded-xl border border-dena-border bg-white p-5">
    <input type="hidden" name="providerId" value={profile.provider_id} />
    <input type="hidden" name="revision" value={profile.revision} />
    <header><p className="text-xs leading-6 text-dena-muted">نام عمومی ارائه‌دهنده از مؤسسهٔ ناظر مستقل است.</p><h2 className="font-extrabold text-dena-deep">هویت و برند خودتان</h2></header>
    <div className="grid gap-3 sm:grid-cols-3">
      <label className="text-xs font-bold">نام و نام خانوادگی<input readOnly value={profile.account_name} className={field} /></label>
      <label className="text-xs font-bold">نام عمومی تأییدشده<input readOnly value={profile.name} className={field} /></label>
      <label className="text-xs font-bold">نام برند<input name="brandName" maxLength={120} defaultValue={profile.brand_name} className={field} /></label>
      <label className="text-xs font-bold">شمارهٔ تماس<input name="phone" type="tel" maxLength={40} defaultValue={profile.phone} className={field} /></label>
      <label className="text-xs font-bold">رایانامه<input name="email" type="email" maxLength={254} defaultValue={profile.email} className={field} /></label>
      <label className="text-xs font-bold">شهر فعالیت<input name="city" maxLength={100} defaultValue={profile.city} className={field} /></label>
    </div>
    <fieldset><legend className="mb-3 text-xs font-bold">دسته‌های خدمات درخواستی</legend><div className="flex flex-wrap gap-2">{Object.entries(providerCategoryLabels).map(([key,label]) => <label key={key} className="flex items-center gap-2 rounded-md bg-dena-lavender px-3 py-2 text-xs text-dena-brand"><input type="checkbox" name="categories" value={key} defaultChecked={profile.categories.includes(key)} />{label}</label>)}</div></fieldset>
    <p className="text-xs leading-6 text-dena-muted">انتخاب دستهٔ خدمات، مجوز فعالیت نیست. نام تأییدشده و اطلاعات ورود از این فرم تغییر نمی‌کنند.</p>
    {message && <p role="alert" className="text-sm text-red-700">{message}</p>}
    <Button type="submit" disabled={pending} className="min-h-10 w-full rounded-lg">{pending ? "در حال ذخیره…" : "ذخیره و ادامه"}</Button>
  </form>;
}
