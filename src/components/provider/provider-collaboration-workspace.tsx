"use client";

import { useState, type FormEvent } from "react";
import { Button } from "../ui/button";

type Institute = { id: string; name: string };
type Collaboration = {
  id: string; providerId: string; instituteId: string; instituteName: string;
  status: "requested" | "awaiting_dena" | "approved" | "institute_rejected" | "dena_rejected";
  instituteDecisionReason: string | null; denaDecisionReason: string | null;
  createdAt: string; updatedAt: string;
};
const statusLabel: Record<Collaboration["status"], string> = {
  requested: "در انتظار تصمیم مؤسسه",
  awaiting_dena: "پذیرفته‌شده توسط مؤسسه؛ در انتظار بررسی دنا",
  approved: "همکاری تأیید شده",
  institute_rejected: "درخواست توسط مؤسسه رد شده",
  dena_rejected: "درخواست در بررسی نهایی دنا رد شده",
};

export function ProviderCollaborationWorkspace({ providerIds, institutes, initialCollaborations }: {
  providerIds: string[]; institutes: Institute[]; initialCollaborations: Collaboration[];
}) {
  const [items, setItems] = useState(initialCollaborations);
  const [providerId, setProviderId] = useState(providerIds[0] ?? "");
  const [instituteId, setInstituteId] = useState(institutes[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function refresh() {
    const response = await fetch("/api/provider/collaborations", {
      credentials: "same-origin", cache: "no-store",
    });
    if (!response.ok) throw new Error("list_unavailable");
    const result = await response.json() as { collaborations: Collaboration[] };
    setItems(result.collaborations);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !providerId || !instituteId) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/provider/collaborations", {
        method: "POST", credentials: "same-origin", cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ providerId, instituteId, clientRequestId: crypto.randomUUID() }),
      });
      const body = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) {
        setError(body?.error === "request_conflict"
          ? "برای این مؤسسه درخواست فعالی دارید یا درخواست قبلی با همین شناسه متفاوت است."
          : "ثبت درخواست انجام نشد؛ عضویت و اطلاعات را بررسی کنید.");
        return;
      }
      await refresh();
      setNotice("درخواست ثبت شد و برای تصمیم اولیه به مؤسسه ارسال شد.");
    } catch {
      setError("ارتباط برقرار نشد؛ فهرست را تازه کنید و وضعیت درخواست را بررسی کنید.");
    } finally {
      setBusy(false);
    }
  }

  return <div className="space-y-8">
    <form onSubmit={submit} className="space-y-5 rounded-2xl border border-dena-border p-5">
      <div>
        <h2 className="text-lg font-extrabold text-dena-deep">درخواست همکاری</h2>
        <p className="mt-2 text-sm leading-7 text-dena-muted">
          با هویت حرفه‌ای خودت زیر نظر مؤسسه فعالیت می‌کنی. همکاری فقط پس از پذیرش مؤسسه و تأیید نهایی دنا فعال می‌شود؛ مجوز هر دوره همچنان جداگانه صادر می‌شود.
        </p>
      </div>
      {providerIds.length > 1 && <label className="block text-sm font-bold">
        هویت ارائه‌دهنده
        <select value={providerId} onChange={(event) => setProviderId(event.target.value)} required
          className="mt-2 min-h-12 w-full rounded-xl border border-dena-border bg-white px-4">
          {providerIds.map((id) => <option key={id} value={id}>{id}</option>)}
        </select>
      </label>}
      <label className="block text-sm font-bold">
        مؤسسهٔ مقصد
        <select value={instituteId} onChange={(event) => setInstituteId(event.target.value)} required
          className="mt-2 min-h-12 w-full rounded-xl border border-dena-border bg-white px-4">
          {institutes.map((institute) => <option key={institute.id} value={institute.id}>{institute.name} · دارای نشان آبی</option>)}
        </select>
      </label>
      <Button type="submit" disabled={busy || !institutes.length} className="disabled:opacity-50">
        {busy ? "در حال ثبت…" : "ارسال درخواست همکاری"}
      </Button>
      <div role="status" aria-live="polite" className="text-sm leading-7">
        {error && <p className="text-red-700">{error}</p>}
        {!error && notice && <p className="text-dena-deep">{notice}</p>}
      </div>
    </form>

    <section aria-labelledby="provider-collaborations-list">
      <h2 id="provider-collaborations-list" className="text-lg font-extrabold text-dena-deep">وضعیت درخواست‌های من</h2>
      {!items.length ? <p className="mt-3 text-sm text-dena-muted">درخواستی ثبت نشده است.</p>
        : <ul className="mt-4 space-y-3">{items.map((item) => <li key={item.id} className="rounded-xl border border-dena-border p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><p className="font-extrabold text-dena-deep">{item.instituteName} <span aria-label="مؤسسهٔ تأییدشده" className="text-blue-600">●</span></p>
              <p className="mt-1 text-xs text-dena-muted">شناسهٔ همکاری: <bdi dir="ltr">{item.id}</bdi></p></div>
            {item.status === "approved" && <span title="ارائه‌دهندهٔ تحت نظارت دنا" className="rounded-full bg-orange-100 px-3 py-1 text-xs font-bold text-orange-800">● نشان نارنجی · همکاری تأییدشده</span>}
          </div>
          <p className="mt-3 text-sm font-semibold text-dena-deep">{statusLabel[item.status]}</p>
          {item.instituteDecisionReason && <p className="mt-2 text-sm leading-7 text-dena-muted">یادداشت مؤسسه: {item.instituteDecisionReason}</p>}
          {item.denaDecisionReason && <p className="mt-2 text-sm leading-7 text-dena-muted">یادداشت دنا: {item.denaDecisionReason}</p>}
        </li>)}</ul>}
    </section>
  </div>;
}
