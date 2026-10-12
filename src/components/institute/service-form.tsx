"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "../ui/button";

type Category = "consultation" | "career_guidance" | "assessment" | "support" | "other";
export type InstituteServiceFormRow = {
  id: string; instituteId: string; title: string; category: string;
  description: string; priceToman: number; includedMinutes: number | null;
  validityDays: number | null; guardianConsentRequired: boolean;
  cancellationPolicy: string; status: "draft" | "active" | "paused";
};
export type ServiceInstitute = { id: string; name: string };

const categories: Array<[Category, string]> = [
  ["consultation", "مشاوره"], ["career_guidance", "انتخاب رشته و مسیر شغلی"],
  ["assessment", "ارزیابی آموزشی"], ["support", "پشتیبانی آموزشی"], ["other", "سایر خدمات"],
];

export function InstituteServiceForm({ institutes, service }: {
  institutes: ServiceInstitute[]; service?: InstituteServiceFormRow;
}) {
  const router = useRouter();
  const [instituteId, setInstituteId] = useState(service?.instituteId ?? institutes[0]?.id ?? "");
  const [title, setTitle] = useState(service?.title ?? "");
  const [category, setCategory] = useState<Category>((service?.category as Category | undefined) ?? "consultation");
  const [description, setDescription] = useState(service?.description ?? "");
  const [priceToman, setPriceToman] = useState(service?.priceToman ?? 0);
  const [hasTimeQuota, setHasTimeQuota] = useState(service?.includedMinutes !== null && service?.includedMinutes !== undefined);
  const [includedMinutes, setIncludedMinutes] = useState(service?.includedMinutes ?? 60);
  const [validityDays, setValidityDays] = useState(service?.validityDays ?? 30);
  const [guardianConsentRequired, setGuardianConsentRequired] = useState(service?.guardianConsentRequired ?? true);
  const [cancellationPolicy, setCancellationPolicy] = useState(service?.cancellationPolicy ?? "");
  const [status, setStatus] = useState<"draft" | "active" | "paused">(service?.status ?? "draft");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(service
        ? `/api/institute/services/${encodeURIComponent(service.id)}`
        : "/api/institute/services", {
        method: service ? "PATCH" : "POST", credentials: "same-origin", cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(!service ? { instituteId } : {}), title, category, description,
          priceToman, includedMinutes: hasTimeQuota ? includedMinutes : null,
          validityDays: hasTimeQuota ? validityDays : null,
          guardianConsentRequired, cancellationPolicy,
          ...(service ? { status } : {}),
        }),
      });
      if (!response.ok) {
        setMessage(response.status === 404
          ? "دسترسی مؤسسه تغییر کرده یا این خدمت دیگر در دسترس نیست."
          : "ذخیره انجام نشد؛ اطلاعات را بررسی کنید.");
        return;
      }
      router.push("/institute/services");
      router.refresh();
    } catch {
      setMessage("ارتباط با سرور برقرار نشد؛ دوباره تلاش کنید.");
    } finally {
      setBusy(false);
    }
  }

  if (!institutes.length) return <p className="rounded-xl border border-dena-border bg-white p-5 text-sm">حساب شما به مؤسسهٔ فعالی دسترسی ندارد.</p>;

  return <form onSubmit={(event) => void submit(event)} className="space-y-6 rounded-2xl border border-dena-border bg-white p-5 md:p-8">
    <div className="grid gap-5 md:grid-cols-2">
      <label className="grid gap-2 text-sm font-bold text-dena-deep">مؤسسه
        <select required value={instituteId} disabled={Boolean(service)} onChange={(event) => setInstituteId(event.target.value)} className="min-h-12 rounded-lg border border-dena-border bg-white px-3 font-normal">
          {institutes.map((institute) => <option key={institute.id} value={institute.id}>{institute.name}</option>)}
        </select>
      </label>
      <label className="grid gap-2 text-sm font-bold text-dena-deep">دستهٔ خدمت
        <select value={category} onChange={(event) => setCategory(event.target.value as Category)} className="min-h-12 rounded-lg border border-dena-border bg-white px-3 font-normal">
          {categories.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </label>
    </div>
    <label className="grid gap-2 text-sm font-bold text-dena-deep">نام خدمت
      <input required minLength={3} maxLength={120} value={title} onChange={(event) => setTitle(event.target.value)} className="min-h-12 rounded-lg border border-dena-border px-3 font-normal" />
    </label>
    <label className="grid gap-2 text-sm font-bold text-dena-deep">شرح خدمت و آنچه دانش‌آموز دریافت می‌کند
      <textarea required minLength={10} maxLength={2000} rows={5} value={description} onChange={(event) => setDescription(event.target.value)} className="rounded-lg border border-dena-border p-3 font-normal leading-7" />
    </label>
    <div className="grid gap-5 md:grid-cols-2">
      <label className="grid gap-2 text-sm font-bold text-dena-deep">قیمت (تومان)
        <input required type="number" min={1} max={1_000_000_000_000} step={1} value={priceToman || ""} onChange={(event) => setPriceToman(Number(event.target.value))} className="min-h-12 rounded-lg border border-dena-border px-3 font-normal" />
      </label>
      {service && <label className="grid gap-2 text-sm font-bold text-dena-deep">وضعیت کاتالوگ
        <select value={status} onChange={(event) => setStatus(event.target.value as typeof status)} className="min-h-12 rounded-lg border border-dena-border bg-white px-3 font-normal">
          <option value="draft">پیش‌نویس</option><option value="active">فعال</option><option value="paused">متوقف</option>
        </select>
      </label>}
    </div>
    <fieldset className="space-y-4 rounded-xl bg-dena-bg p-4">
      <label className="flex min-h-8 items-center gap-3 text-sm font-bold text-dena-deep">
        <input type="checkbox" checked={hasTimeQuota} onChange={(event) => setHasTimeQuota(event.target.checked)} />
        خدمت شامل سهمیهٔ زمانی است
      </label>
      {hasTimeQuota && <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-bold text-dena-deep">زمان شامل‌شده (دقیقه)
          <input required type="number" min={5} max={100000} value={includedMinutes} onChange={(event) => setIncludedMinutes(Number(event.target.value))} className="min-h-11 rounded-lg border border-dena-border bg-white px-3 font-normal" />
        </label>
        <label className="grid gap-2 text-sm font-bold text-dena-deep">مهلت استفاده (روز)
          <input required type="number" min={1} max={3650} value={validityDays} onChange={(event) => setValidityDays(Number(event.target.value))} className="min-h-11 rounded-lg border border-dena-border bg-white px-3 font-normal" />
        </label>
      </div>}
    </fieldset>
    <label className="flex min-h-8 items-center gap-3 text-sm font-semibold text-dena-deep">
      <input type="checkbox" checked={guardianConsentRequired} onChange={(event) => setGuardianConsentRequired(event.target.checked)} />
      برای دریافت این خدمت، رضایت سرپرست قانونی لازم است
    </label>
    <label className="grid gap-2 text-sm font-bold text-dena-deep">شرایط لغو و بازپرداخت
      <textarea required minLength={1} maxLength={1500} rows={3} value={cancellationPolicy} onChange={(event) => setCancellationPolicy(event.target.value)} className="rounded-lg border border-dena-border p-3 font-normal leading-7" />
    </label>
    <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm leading-7 text-amber-950">
      سهم دنا ۱۰٪ از مبلغ ناخالص خدمت است و کارمزد درگاه از سهم مؤسسه محاسبه می‌شود. این صفحه فعلاً برای ثبت و آماده‌سازی کاتالوگ است؛ خرید آنلاین و تسویه تا تکمیل اتصال درگاه فعال نیست.
    </div>
    {message && <p role="alert" className="text-sm font-semibold text-red-700">{message}</p>}
    <div className="flex flex-wrap gap-3">
      <Button type="submit" disabled={busy}>{busy ? "در حال ذخیره…" : "ذخیرهٔ خدمت"}</Button>
      <Link href="/institute/services" className="inline-flex min-h-12 items-center rounded-xl border border-dena-border px-5 py-3 text-sm font-semibold">بازگشت</Link>
    </div>
  </form>;
}
