"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "../ui/card";
import { buttonClassName } from "../ui/button";

type Scope = { id: string; name: string };
type Student = {
  id: string; organizationId: string; firstName: string; lastName: string;
  nationalCodeLast4: string; birthDate: string; gender: string; email: string | null;
  phoneNumber: string | null; phoneNumberVerified: boolean; createdAt: string | Date;
};
type ApiKey = {
  id: string; organizationId: string; prefix: string; label: string;
  createdAt: string; lastUsedAt: string | null; revokedAt: string | null;
};
type Tab = "manual" | "bulk" | "api";

const inputClass = "w-full rounded-xl border border-dena-border bg-white px-3 py-2.5 text-sm outline-none focus:border-dena-brand";
const studentCsvTemplateHref = "/templates/organization-students.csv";
const genderOptions = [
  ["female", "دختر"], ["male", "پسر"], ["prefer_not_to_say", "ترجیح می‌دهم نگویم"],
] as const;
const genderLabel = Object.fromEntries(genderOptions) as Record<string, string>;

export function OrganizationStudentWorkspace({
  scopes, initialStudents,
}: { scopes: Scope[]; initialStudents: Student[] }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("manual");
  const [organizationId, setOrganizationId] = useState(scopes[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [newSecret, setNewSecret] = useState("");
  const [importErrors, setImportErrors] = useState<Array<{ row: number; error: string }>>([]);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
  const [keyLabel, setKeyLabel] = useState("اتصال سامانه سازمان");
  const [search, setSearch] = useState("");
  const organizationNames = useMemo(() => new Map(scopes.map((scope) => [scope.id, scope.name])), [scopes]);
  const visibleStudents = initialStudents.filter((student) =>
    (!organizationId || student.organizationId === organizationId) &&
    `${student.firstName} ${student.lastName} ${student.phoneNumber ?? ""}`.includes(search.trim()),
  );

  async function submitManual(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    const form = new FormData(event.currentTarget);
    const student = Object.fromEntries(form.entries());
    const response = await fetch("/api/organization/students", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ organizationId, student, guardianConsentConfirmed: form.get("guardianConsentConfirmed") === "on" }),
    });
    const result = await response.json().catch(() => ({}));
    setBusy(false);
    if (!response.ok) { setError(result.error === "duplicate" ? "این شماره یا کدملی قبلاً در این سازمان ثبت شده است." : "ثبت دانش‌آموز انجام نشد؛ اطلاعات و دسترسی را بررسی کنید."); return; }
    setMessage("پروندهٔ سازمانی ثبت شد. حساب با تأیید شمارهٔ موبایل توسط خود دانش‌آموز فعال می‌شود.");
    event.currentTarget.reset(); router.refresh();
  }

  async function submitBulk(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setMessage(""); setImportErrors([]);
    const form = new FormData(event.currentTarget); form.set("organizationId", organizationId);
    form.set("guardianConsentConfirmed", form.get("guardianConsentConfirmed") === "on" ? "true" : "false");
    const response = await fetch("/api/organization/students/import", { method: "POST", body: form });
    const result = await response.json().catch(() => ({})); setBusy(false);
    if (!response.ok && response.status !== 207) {
      const text = result.error === "invalid_headers" ? "ستون‌های فایل با قالب نمونه هماهنگ نیست." : "فایل معتبر نیست یا ردیف‌های آن خطا دارند.";
      if (Array.isArray(result.errors)) setImportErrors(result.errors);
      setError(`${text}${Array.isArray(result.errors) ? ` (${result.errors.length} ردیف)` : ""}`); return;
    }
    if (Array.isArray(result.errors)) setImportErrors(result.errors);
    setMessage(`${Number(result.imported ?? 0).toLocaleString("fa-IR")} دانش‌آموز ثبت شد${result.errors?.length ? `؛ ${result.errors.length.toLocaleString("fa-IR")} ردیف نیاز به اصلاح دارد.` : "."}`);
    router.refresh();
  }

  async function refreshKeys() {
    const response = await fetch("/api/organization/api-keys", { cache: "no-store" });
    if (response.ok) setKeys((await response.json()).keys ?? []);
  }

  async function createKey(rotateFromKeyId?: string) {
    setBusy(true); setError(""); setNewSecret("");
    const response = await fetch("/api/organization/api-keys", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ organizationId, label: keyLabel, rotateFromKeyId }),
    });
    const result = await response.json().catch(() => ({})); setBusy(false);
    if (!response.ok) { setError("ساخت کلید انجام نشد."); return; }
    setNewSecret(result.key.secret); await refreshKeys();
  }

  async function revokeKey(id: string) {
    if (!window.confirm("این کلید فوراً دسترسی API را از دست می‌دهد. ادامه می‌دهید؟")) return;
    setBusy(true);
    const response = await fetch(`/api/organization/api-keys/${id}`, { method: "DELETE" });
    setBusy(false);
    if (!response.ok) { setError("لغو کلید انجام نشد."); return; }
    await refreshKeys();
  }

  async function deleteStudent() {
    if (!studentToDelete) return;
    setBusy(true); setError("");
    const response = await fetch(`/api/organization/students/${studentToDelete.id}`, {
      method: "DELETE", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirm: "DELETE_ORGANIZATION_STUDENT" }),
    });
    setBusy(false);
    if (!response.ok) { setError("حذف پرونده انجام نشد یا دسترسی سازمان تغییر کرده است."); return; }
    setStudentToDelete(null);
    setMessage("پرونده از محدودهٔ این سازمان حذف شد؛ حساب ورود دنا باقی است.");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-dena-border bg-white p-5">
        <div>
          <h2 className="text-lg font-extrabold">مدیریت دانش‌آموزان سازمان</h2>
          <p className="mt-1 text-sm leading-7 text-dena-muted">اطلاعات در محدودهٔ سازمان انتخاب‌شده نگهداری می‌شود.</p>
        </div>
        <label className="w-full max-w-sm text-xs font-bold text-dena-muted">
          سازمان فعال
          <select className={`${inputClass} mt-1 text-dena-ink`} value={organizationId} onChange={(event) => setOrganizationId(event.target.value)}>
            {scopes.map((scope) => <option key={scope.id} value={scope.id}>{scope.name}</option>)}
          </select>
        </label>
      </section>

      <section className="space-y-4">
        <div role="tablist" aria-label="روش ثبت دانش‌آموز" className="flex flex-wrap gap-2">
          {([ ["manual", "ثبت دستی"], ["bulk", "ورود گروهی"], ["api", "اتصال API"] ] as const).map(([key, label]) => (
            <button key={key} role="tab" aria-selected={tab === key} onClick={() => { setTab(key); setError(""); setMessage(""); setImportErrors([]); if (key === "api") void refreshKeys(); }}
              className={tab === key ? buttonClassName() : buttonClassName("secondary")}>{label}</button>
          ))}
        </div>
        {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-800">{error}</p>}
        {message && <p role="status" className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">{message}</p>}
        {importErrors.length > 0 && <ul aria-label="ردیف‌های نیازمند اصلاح" className="space-y-1 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
          {importErrors.map((item) => <li key={`${item.row}-${item.error}`}>ردیف {item.row.toLocaleString("fa-IR")}: {item.error === "duplicate_in_file" ? "شماره موبایل یا کدملی تکراری در فایل" : item.error === "already_exists" ? "پرونده قبلاً در این سازمان ثبت شده" : item.error === "scope_unavailable" ? "دسترسی سازمان تغییر کرده" : "اطلاعات این ردیف معتبر نیست"}</li>)}
        </ul>}

        {tab === "manual" && <Card className="space-y-5">
          <div><h3 className="font-extrabold">ثبت یک دانش‌آموز</h3><p className="mt-1 text-sm leading-7 text-dena-muted">ورود با OTP پس از تأیید شماره توسط خود دانش‌آموز انجام می‌شود.</p></div>
          <form onSubmit={submitManual} className="grid gap-4 md:grid-cols-2">
            <label className="text-sm font-bold">نام<input name="firstName" required maxLength={80} className={`${inputClass} mt-1`} /></label>
            <label className="text-sm font-bold">نام خانوادگی<input name="lastName" required maxLength={100} className={`${inputClass} mt-1`} /></label>
            <label className="text-sm font-bold">شمارهٔ موبایل<input name="phoneNumber" required inputMode="tel" placeholder="+989121234567" className={`${inputClass} mt-1`} /></label>
            <label className="text-sm font-bold">کد ملی<input name="nationalCode" required inputMode="numeric" pattern="[0-9]{10}" maxLength={10} className={`${inputClass} mt-1`} /></label>
            <label className="text-sm font-bold">تاریخ تولد (میلادی)<input name="birthDate" type="date" required className={`${inputClass} mt-1`} /></label>
            <label className="text-sm font-bold">جنسیت<select name="gender" required defaultValue="prefer_not_to_say" className={`${inputClass} mt-1`}>
              {genderOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select></label>
            <label className="text-sm font-bold md:col-span-2">ایمیل (اختیاری)<input name="email" type="email" maxLength={254} className={`${inputClass} mt-1`} /></label>
            <label className="flex items-start gap-3 rounded-xl bg-amber-50 p-4 text-sm leading-7 md:col-span-2"><input name="guardianConsentConfirmed" type="checkbox" required className="mt-2 size-4 accent-dena-brand" />تأیید می‌کنم سازمان رضایت سرپرست قانونی برای ثبت و استفاده از اطلاعات این دانش‌آموز را دریافت کرده است.</label>
            <div className="md:col-span-2"><button className={buttonClassName()} disabled={busy}>{busy ? "در حال ثبت…" : "ثبت دانش‌آموز"}</button></div>
          </form>
        </Card>}

        {tab === "bulk" && <Card className="space-y-5">
          <div><h3 className="font-extrabold">ورود گروهی با CSV یا Excel</h3><p className="mt-1 text-sm leading-7 text-dena-muted">فایل حداکثر ۵ مگابایت و ۵۰۰ دانش‌آموز؛ ستون‌ها باید مطابق قالب نمونه باشند. فایل پس از پردازش نگهداری نمی‌شود.</p></div>
          <a className="text-sm font-bold text-dena-brand underline" href={studentCsvTemplateHref} download>دانلود قالب CSV</a>
          <form onSubmit={submitBulk} className="flex flex-wrap items-end gap-4">
            <label className="min-w-64 flex-1 text-sm font-bold">فایل CSV یا XLSX
              <input name="file" type="file" required accept=".csv,.xlsx" className={`${inputClass} mt-1`} />
            </label>
            <label className="flex w-full items-start gap-3 rounded-xl bg-amber-50 p-4 text-sm leading-7"><input name="guardianConsentConfirmed" type="checkbox" required className="mt-2 size-4 accent-dena-brand" />تأیید می‌کنم رضایت سرپرست قانونی برای همهٔ دانش‌آموزان این فایل دریافت شده است.</label>
            <button className={buttonClassName()} disabled={busy}>{busy ? "در حال پردازش…" : "بررسی و ثبت فایل"}</button>
          </form>
          <p className="rounded-xl bg-dena-lavender px-4 py-3 text-xs leading-7">ستون‌های الزامی: firstName, lastName, nationalCode, birthDate, gender, phoneNumber؛ ستون email اختیاری است. تاریخ تولد با قالب YYYY-MM-DD و جنسیت با female، male یا prefer_not_to_say ثبت شود.</p>
        </Card>}

        {tab === "api" && <Card className="space-y-5">
          <div><h3 className="font-extrabold">اتصال سامانهٔ سازمان</h3><p className="mt-1 text-sm leading-7 text-dena-muted">کلید فقط اجازهٔ ساخت پروندهٔ دانش‌آموز در همین سازمان را دارد.</p></div>
          <div dir="ltr" className="overflow-x-auto rounded-xl bg-[#21194f] p-4 text-left text-sm text-white">
            <p>POST /api/v1/organization/students</p><p className="mt-2 text-emerald-200">Authorization: Bearer YOUR_ORG_KEY</p>
            <pre className="mt-4 whitespace-pre-wrap text-xs leading-6">{`{\n  "firstName": "…", "lastName": "…",\n  "nationalCode": "۱۰رقم", "birthDate": "YYYY-MM-DD",\n  "gender": "female | male | prefer_not_to_say",\n  "phoneNumber": "+989…", "email": "optional",\n  "guardianConsentConfirmed": true\n}`}</pre>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <label className="min-w-56 flex-1 text-sm font-bold">نام کلید<input value={keyLabel} onChange={(event) => setKeyLabel(event.target.value)} maxLength={80} className={`${inputClass} mt-1`} /></label>
            <button className={buttonClassName()} disabled={busy} onClick={() => void createKey()}>{busy ? "در حال ساخت…" : "ساخت کلید API"}</button>
          </div>
          {newSecret && <div role="alert" className="space-y-2 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm">
            <p className="font-bold">این کلید فقط همین بار نمایش داده می‌شود؛ آن را در سامانهٔ سازمان ذخیره کنید.</p>
            <code dir="ltr" className="block break-all rounded-lg bg-white p-3">{newSecret}</code>
            <button className={buttonClassName("secondary")} onClick={() => void navigator.clipboard?.writeText(newSecret)}>کپی کلید</button>
          </div>}
          <button className={buttonClassName("secondary")} onClick={() => void refreshKeys()}>بارگذاری کلیدها</button>
          <ul className="space-y-2">
            {keys.filter((key) => key.organizationId === organizationId).map((key) => <li key={key.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dena-border p-4">
              <div><p className="font-bold">{key.label}</p><p dir="ltr" className="mt-1 text-left text-xs text-dena-muted">{key.prefix}••••</p><p className="mt-1 text-xs text-dena-muted">{key.revokedAt ? "لغوشده" : key.lastUsedAt ? "استفاده‌شده" : "فعال · هنوز استفاده نشده"}</p></div>
              {!key.revokedAt && <div className="flex gap-2"><button className={buttonClassName("secondary")} disabled={busy} onClick={() => void createKey(key.id)}>چرخش کلید</button><button className={buttonClassName("secondary")} disabled={busy} onClick={() => void revokeKey(key.id)}>لغو</button></div>}
            </li>)}
          </ul>
          {keys.filter((key) => key.organizationId === organizationId).length === 0 && <p className="text-sm text-dena-muted">برای این سازمان هنوز کلید API ساخته نشده است.</p>}
        </Card>}
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div><h2 className="text-xl font-extrabold">فهرست دانش‌آموزان این سازمان</h2><p className="mt-1 text-sm text-dena-muted">{visibleStudents.length.toLocaleString("fa-IR")} پرونده</p></div>
          <input aria-label="جست‌وجو" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="نام یا موبایل" className={`${inputClass} max-w-xs`} />
        </div>
        {visibleStudents.length === 0 ? <Card><p className="text-sm leading-7 text-dena-muted">هنوز دانش‌آموزی در این سازمان ثبت نشده است.</p></Card> :
          <div className="overflow-x-auto rounded-2xl border border-dena-border bg-white">
            <table className="w-full min-w-[820px] text-right text-sm">
              <thead className="bg-dena-lavender text-dena-muted"><tr>{["نام", "موبایل", "کدملی", "تاریخ تولد", "جنسیت", "حساب", "عملیات"].map((heading) => <th key={heading} className="px-4 py-3 font-bold">{heading}</th>)}</tr></thead>
              <tbody>{visibleStudents.map((student) => <tr key={student.id} className="border-t border-dena-border">
                <td className="px-4 py-3 font-bold">{student.firstName} {student.lastName}<span className="block text-xs font-normal text-dena-muted">{organizationNames.get(student.organizationId)}</span></td>
                <td dir="ltr" className="px-4 py-3 text-right">{student.phoneNumber ?? "—"}</td>
                <td dir="ltr" className="px-4 py-3 text-right">••••••{student.nationalCodeLast4}</td>
                <td className="px-4 py-3">{student.birthDate}</td><td className="px-4 py-3">{genderLabel[student.gender] ?? "—"}</td>
                <td className="px-4 py-3">{student.phoneNumberVerified ? "تأییدشده" : "در انتظار OTP"}</td>
                <td className="px-4 py-3"><button disabled={busy} onClick={() => setStudentToDelete(student)} className="text-xs font-bold text-red-700 underline disabled:opacity-50">حذف از سازمان</button></td>
              </tr>)}</tbody>
            </table>
          </div>}
      </section>

      {studentToDelete && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) setStudentToDelete(null); }}>
        <section role="alertdialog" aria-modal="true" aria-labelledby="delete-student-title" aria-describedby="delete-student-description" className="w-full max-w-xl space-y-5 rounded-2xl border border-dena-border bg-white p-6 shadow-xl md:p-8">
          <div><h2 id="delete-student-title" className="text-xl font-extrabold">حذف پرونده از سازمان</h2>
            <p id="delete-student-description" className="mt-3 text-sm leading-8 text-dena-muted">
              پروندهٔ {studentToDelete.firstName} {studentToDelete.lastName} از محدودهٔ این سازمان حذف می‌شود. حساب ورود دنا و دسترسی‌های دیگر او باقی می‌ماند.
            </p>
          </div>
          <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm leading-7 text-amber-900">این اقدام قابل بازگشت نیست و در رویدادهای سازمان ثبت می‌شود.</p>
          <div className="flex flex-wrap justify-end gap-3">
            <button autoFocus disabled={busy} onClick={() => setStudentToDelete(null)} className={buttonClassName("secondary")}>انصراف</button>
            <button disabled={busy} onClick={() => void deleteStudent()} className="inline-flex min-h-12 items-center justify-center rounded-xl bg-red-700 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">{busy ? "در حال حذف…" : "حذف از سازمان"}</button>
          </div>
        </section>
      </div>}
    </div>
  );
}
