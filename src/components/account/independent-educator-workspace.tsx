"use client";

import { useState, type FormEvent } from "react";
import { Button } from "../ui/button";

type Institute = { id: string; name: string };
type Affiliation = {
  id: string; instituteId: string; instituteName: string; displayName: string;
  statement: string; status: "requested" | "approved" | "rejected" | "withdrawn" | "revoked";
  decisionReason: string | null; createdAt: string; updatedAt: string;
};
const statusText: Record<Affiliation["status"], string> = {
  requested: "در انتظار تصمیم مؤسسه",
  approved: "همکاری با این مؤسسه پذیرفته شده",
  rejected: "درخواست رد شده",
  withdrawn: "درخواست پس گرفته شده",
  revoked: "همکاری با این مؤسسه خاتمه یافته",
};

export function IndependentEducatorWorkspace({
  institutes, initialAffiliations, initialDisplayName,
}: {
  institutes: Institute[];
  initialAffiliations: Affiliation[];
  initialDisplayName: string;
}) {
  const [items, setItems] = useState(initialAffiliations);
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [instituteId, setInstituteId] = useState(institutes[0]?.id ?? "");
  const [statement, setStatement] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function refresh() {
    const response = await fetch("/api/independent-educator/affiliations", {
      credentials: "same-origin", cache: "no-store",
    });
    if (!response.ok) throw new Error("unavailable");
    const body = await response.json() as {
      affiliations: Affiliation[]; profile: { displayName: string } | null;
    };
    setItems(body.affiliations);
    if (body.profile) setDisplayName(body.profile.displayName);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !instituteId) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/independent-educator/affiliations", {
        method: "POST", credentials: "same-origin", cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instituteId, displayName, statement, clientRequestId: crypto.randomUUID(),
        }),
      });
      const body = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) {
        setError(body?.error === "request_conflict"
          ? "برای این مؤسسه درخواست فعالی دارید. وضعیت درخواست‌های قبلی را ببینید."
          : "ثبت درخواست ممکن نشد؛ اطلاعات و عضویت فعال را بررسی کنید.");
        return;
      }
      await refresh();
      setStatement("");
      setNotice("درخواست برای مؤسسه ارسال شد.");
    } catch { setError("ارتباط برقرار نشد؛ وضعیت درخواست را تازه کنید."); }
    finally { setBusy(false); }
  }

  async function withdraw(id: string) {
    if (busy) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch(
        `/api/independent-educator/affiliations/${encodeURIComponent(id)}`, {
          method: "DELETE", credentials: "same-origin", cache: "no-store",
          headers: { Origin: window.location.origin },
        },
      );
      if (!response.ok) {
        setError("پس‌گرفتن درخواست ممکن نشد؛ ممکن است مؤسسه تصمیم خود را ثبت کرده باشد.");
        return;
      }
      await refresh();
      setNotice("درخواست پس گرفته شد.");
    } catch { setError("ارتباط برقرار نشد؛ فهرست را تازه کنید."); }
    finally { setBusy(false); }
  }

  return <div className="space-y-8">
    <form onSubmit={submit} className="space-y-5 rounded-2xl border border-dena-border p-5">
      <div>
        <h2 className="text-lg font-extrabold text-dena-deep">درخواست همکاری زیر نظر مؤسسه</h2>
        <p className="mt-2 text-sm leading-7 text-dena-muted">
          نام یا برند خودت را وارد کن و برای هر مؤسسه جداگانه درخواست بفرست.
          تأیید مؤسسه مجوز مستقل آموزشی یا دسترسی به ساخت دوره ایجاد نمی‌کند.
        </p>
      </div>
      <label className="block text-sm font-bold">نام نمایشی یا برند
        <input value={displayName} onChange={(event) => setDisplayName(event.target.value)}
          minLength={3} maxLength={120} required
          className="mt-2 min-h-12 w-full rounded-xl border border-dena-border px-4" />
      </label>
      <label className="block text-sm font-bold">مؤسسهٔ مقصد
        <select value={instituteId} onChange={(event) => setInstituteId(event.target.value)}
          required disabled={!institutes.length}
          className="mt-2 min-h-12 w-full rounded-xl border border-dena-border bg-white px-4">
          {institutes.map((institute) => <option key={institute.id} value={institute.id}>
            {institute.name} · مؤسسهٔ تأییدشده
          </option>)}
        </select>
      </label>
      <label className="block text-sm font-bold">معرفی کوتاه و دلیل درخواست
        <textarea value={statement} onChange={(event) => setStatement(event.target.value)}
          minLength={20} maxLength={500} required rows={4}
          className="mt-2 w-full rounded-xl border border-dena-border p-4" />
      </label>
      {!institutes.length && <p className="text-sm text-dena-muted">
        در حال حاضر مؤسسهٔ تأییدشده‌ای برای درخواست همکاری در دسترس نیست.
      </p>}
      <Button type="submit" disabled={busy || !institutes.length} className="disabled:opacity-50">
        {busy ? "در حال ثبت…" : "ارسال درخواست"}
      </Button>
      <div role="status" aria-live="polite" className="text-sm leading-7">
        {error && <p className="text-red-700">{error}</p>}
        {!error && notice && <p className="text-dena-deep">{notice}</p>}
      </div>
    </form>

    <section aria-labelledby="educator-affiliations-heading">
      <h2 id="educator-affiliations-heading" className="text-lg font-extrabold text-dena-deep">
        وضعیت درخواست‌های من
      </h2>
      {!items.length ? <p className="mt-3 text-sm text-dena-muted">درخواستی ثبت نشده است.</p>
        : <ul className="mt-4 space-y-3">{items.map((item) => <li key={item.id}
          className="rounded-xl border border-dena-border p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="font-extrabold text-dena-deep">{item.displayName}</h3>
              <p className="mt-1 text-sm text-dena-muted">{item.instituteName}
                <span aria-label="مؤسسهٔ تأییدشده" className="mr-2 text-blue-700">✓</span>
              </p>
            </div>
            {item.status === "approved" && <span
              aria-label="همکار مستقل زیر نظر مؤسسهٔ تأییدشده"
              className="rounded-full bg-orange-100 px-3 py-1.5 text-xs font-bold text-orange-900">
              ✓ همکار مستقل · نشان نارنجی
            </span>}
          </div>
          <p className="mt-3 text-sm font-semibold">{statusText[item.status]}</p>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-dena-muted">{item.statement}</p>
          {item.decisionReason && <p className="mt-2 text-sm leading-7 text-dena-muted">
            پاسخ مؤسسه: {item.decisionReason}
          </p>}
          {item.status === "requested" && <Button type="button" variant="outline"
            disabled={busy} onClick={() => void withdraw(item.id)} className="mt-4">
            پس‌گرفتن درخواست
          </Button>}
          {item.status === "approved" && <p className="mt-3 rounded-lg bg-dena-bg p-3 text-xs leading-6 text-dena-muted">
            این پذیرش فقط رابطهٔ همکاری با همین مؤسسه را ثبت می‌کند. دسترسی دوره، فروش خدمت یا مجوز رسمی از آن نتیجه نمی‌شود.
          </p>}
        </li>)}</ul>}
    </section>
  </div>;
}
