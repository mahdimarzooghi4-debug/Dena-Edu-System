"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Button } from "../ui/button";

type Role = "institute" | "provider" | "organization" | "benefactor";
type Application = {
  id: string;
  role: Role;
  proposedName: string;
  status: "pending" | "approved" | "rejected";
  reason: string | null;
};

const labels: Record<Role, string> = {
  institute: "مؤسسه", provider: "ارائه‌دهنده",
  organization: "سازمان", benefactor: "خیر",
};
const statusLabels = {
  pending: "در انتظار بررسی", approved: "تأییدشده", rejected: "ردشده",
} as const;

export function RoleApplicationForm() {
  const [items, setItems] = useState<Application[]>([]);
  const [role, setRole] = useState<Role>("institute");
  const [name, setName] = useState("");
  const [statement, setStatement] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    const response = await fetch("/api/access/role-applications", {
      credentials: "same-origin", cache: "no-store",
    });
    if (!response.ok) throw new Error("read_error");
    const data = await response.json() as { applications: Application[] };
    setItems(data.applications);
  }, []);

  useEffect(() => {
    void reload().catch(() => setError("دریافت وضعیت درخواست‌ها ممکن نشد."));
  }, [reload]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setError(""); setMessage(""); setBusy(true);
    try {
      const response = await fetch("/api/access/role-applications", {
        method: "POST", credentials: "same-origin", cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, proposedName: name.trim(), statement: statement.trim() }),
      });
      if (!response.ok) {
        setError(response.status === 409
          ? "برای این نقش پیش‌تر درخواست ثبت کرده‌اید. درخواست مجدد از این مسیر مجاز نیست."
          : response.status === 403
            ? "درخواست نیازمند شماره موبایل تأییدشده است."
            : "درخواست ثبت نشد. اطلاعات را بررسی کنید و دوباره تلاش کنید.");
        return;
      }
      await reload();
      setMessage("درخواست ثبت شد؛ ثبت درخواست به معنای تأیید هویت یا اعطای نقش نیست.");
      setName(""); setStatement("");
    } catch {
      setError("ارتباط برقرار نشد؛ بعداً دوباره تلاش کنید.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      <form onSubmit={submit} className="space-y-5">
        <div className="space-y-2">
          <label htmlFor="requested-role" className="block text-sm font-bold">نوع درخواست</label>
          <select id="requested-role" value={role}
            onChange={(event) => setRole(event.target.value as Role)}
            className="min-h-12 w-full rounded-xl border border-dena-border bg-white px-4">
            {Object.entries(labels).map(([value, label]) =>
              <option key={value} value={value}>{label}</option>)}
          </select>
        </div>
        <div className="space-y-2">
          <label htmlFor="entity-name" className="block text-sm font-bold">نام مجموعه یا عنوان فعالیت</label>
          <input id="entity-name" value={name} onChange={(event) => setName(event.target.value)}
            required minLength={3} maxLength={120}
            className="min-h-12 w-full rounded-xl border border-dena-border bg-white px-4"
            placeholder="نامی که برای بررسی معرفی می‌کنید" />
        </div>
        <div className="space-y-2">
          <label htmlFor="entity-statement" className="block text-sm font-bold">شرح درخواست</label>
          <textarea id="entity-statement" value={statement}
            onChange={(event) => setStatement(event.target.value)}
            required minLength={20} maxLength={500} rows={4}
            className="w-full rounded-xl border border-dena-border bg-white p-4"
            placeholder="نوع فعالیت و دلیل درخواست این دسترسی را توضیح دهید." />
          <p className="text-xs leading-6 text-dena-muted">
            در این فرم کد ملی، شماره کارت، مدارک هویتی یا اطلاعات دانش‌آموز وارد نکنید.
            بررسی اصل مدارک فقط در فرایند محدود و مستقل انجام می‌شود.
          </p>
        </div>
        <Button type="submit" disabled={busy} className="w-full disabled:opacity-50">
          {busy ? "در حال ثبت…" : "ثبت درخواست بررسی"}
        </Button>
      </form>
      <div role="status" aria-live="polite" className="text-sm leading-7">
        {error && <p className="text-red-700">{error}</p>}
        {!error && message && <p className="text-dena-deep">{message}</p>}
      </div>
      <section aria-labelledby="my-role-requests" className="border-t border-dena-border pt-7">
        <h2 id="my-role-requests" className="text-lg font-extrabold">درخواست‌های من</h2>
        {items.length === 0
          ? <p className="mt-3 text-sm text-dena-muted">درخواستی ثبت نشده است.</p>
          : <ul className="mt-4 space-y-3">
              {items.map((item) => <li key={item.id}
                className="rounded-xl border border-dena-border p-4 text-sm leading-7">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-bold">{labels[item.role]} · {item.proposedName}</span>
                  <span className="rounded-full bg-dena-lavender px-3 py-1 text-xs font-semibold text-dena-deep">
                    {statusLabels[item.status]}
                  </span>
                </div>
                {item.reason && <p className="mt-2 text-dena-muted">نتیجه بررسی: {item.reason}</p>}
              </li>)}
            </ul>}
      </section>
    </div>
  );
}
