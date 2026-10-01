"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Button } from "../ui/button";

type Collaboration = {
  id: string; providerId: string; providerName: string; instituteId: string;
  status: "requested" | "awaiting_dena" | "approved" | "institute_rejected" | "dena_rejected";
  createdAt: string; instituteDecisionReason: string | null; denaDecisionReason: string | null;
};
const statusText: Record<Collaboration["status"], string> = {
  requested: "در انتظار تصمیم مؤسسه",
  awaiting_dena: "پذیرفته‌شده؛ در انتظار بررسی نهایی دنا",
  approved: "همکاری تأییدشده",
  institute_rejected: "ردشده توسط مؤسسه",
  dena_rejected: "ردشده در بررسی دنا",
};

export function ProviderCollaborationQueue() {
  const [items, setItems] = useState<Collaboration[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const reload = useCallback(async () => {
    const response = await fetch("/api/institute/collaborations", { credentials: "same-origin", cache: "no-store" });
    if (!response.ok) throw new Error("unavailable");
    setItems((await response.json() as { collaborations: Collaboration[] }).collaborations);
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/institute/collaborations", { credentials: "same-origin", cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("unavailable");
        return response.json() as Promise<{ collaborations: Collaboration[] }>;
      }).then((body) => { if (!controller.signal.aborted) setItems(body.collaborations); })
      .catch(() => { if (!controller.signal.aborted) setError("دریافت درخواست‌ها ممکن نشد."); });
    return () => controller.abort();
  }, []);

  async function decide(event: FormEvent<HTMLFormElement>, id: string) {
    event.preventDefault();
    if (busy) return;
    const action = (event.nativeEvent as SubmitEvent).submitter?.getAttribute("value");
    if (action !== "approve" && action !== "reject") return;
    const reason = String(new FormData(event.currentTarget).get("reason") ?? "").trim();
    setBusy(id); setError(""); setNotice("");
    try {
      const response = await fetch(`/api/institute/collaborations/${encodeURIComponent(id)}/decision`, {
        method: "POST", credentials: "same-origin", cache: "no-store",
        headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, reason }),
      });
      const body = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) {
        setError(body?.error === "conflicted_reviewer" ? "نماینده نمی‌تواند درخواست همکاری خودش را بررسی کند."
          : "ثبت تصمیم ممکن نشد؛ مجوز یا وضعیت درخواست را بررسی کنید.");
        return;
      }
      await reload();
      setNotice(action === "approve" ? "درخواست برای بررسی نهایی به دنا فرستاده شد." : "رد درخواست با دلیل ثبت شد.");
    } catch { setError("ارتباط برقرار نشد؛ وضعیت درخواست را تازه کنید."); }
    finally { setBusy(null); }
  }

  return <div className="space-y-5">
    <p className="rounded-xl bg-dena-lavender p-4 text-sm leading-7 text-dena-deep">
      پذیرش شما مرحلهٔ اول است. همکاری تا تصمیم نهایی دنا فعال نمی‌شود و مجوز نظارت هر دوره را جداگانه باید بررسی کنید.
    </p>
    <div role="status" aria-live="polite" className="text-sm leading-7">
      {error && <p className="text-red-700">{error}</p>}{!error && notice && <p className="text-dena-deep">{notice}</p>}
    </div>
    {!items.length ? <p className="text-sm text-dena-muted">درخواستی برای همکاری ثبت نشده است.</p>
      : <ul className="space-y-4">{items.map((item) => <li key={item.id} className="rounded-xl border border-dena-border p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><h2 className="font-extrabold text-dena-deep">{item.providerName} <span className="text-orange-600" title="ارائه‌دهنده">✓</span></h2>
            <p className="mt-1 text-xs text-dena-muted">درخواست در {new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium", timeZone: "Asia/Tehran" }).format(new Date(item.createdAt))}</p></div>
          <span className="rounded-full bg-dena-bg px-3 py-1.5 text-xs font-bold">{statusText[item.status]}</span>
        </div>
        {item.instituteDecisionReason && <p className="mt-3 text-sm leading-7 text-dena-muted">یادداشت مؤسسه: {item.instituteDecisionReason}</p>}
        {item.denaDecisionReason && <p className="mt-2 text-sm leading-7 text-dena-muted">یادداشت دنا: {item.denaDecisionReason}</p>}
        {item.status === "requested" && <form onSubmit={(event) => decide(event, item.id)} className="mt-4 space-y-3">
          <label className="block text-sm font-bold">دلیل تصمیم (حداقل ۱۵ نویسه)
            <textarea name="reason" required minLength={15} maxLength={500} rows={3} className="mt-2 w-full rounded-xl border border-dena-border p-4" />
          </label>
          <div className="flex flex-wrap gap-3">
            <Button name="action" value="approve" type="submit" disabled={Boolean(busy)}>پذیرش و ارسال برای دنا</Button>
            <Button name="action" value="reject" type="submit" variant="outline" disabled={Boolean(busy)}>رد درخواست</Button>
          </div>
        </form>}
      </li>)}</ul>}
  </div>;
}
