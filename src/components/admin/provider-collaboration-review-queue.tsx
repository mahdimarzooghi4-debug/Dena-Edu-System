"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Button } from "../ui/button";

type Request = {
  id: string; providerId: string; providerName: string; instituteId: string;
  instituteName: string; requestedAt: string; instituteDecisionReason: string;
};

export function ProviderCollaborationReviewQueue() {
  const [items, setItems] = useState<Request[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const reload = useCallback(async () => {
    const response = await fetch("/api/admin/provider-collaborations", { credentials: "same-origin", cache: "no-store" });
    if (!response.ok) throw new Error("queue_unavailable");
    setItems((await response.json() as { pending: Request[] }).pending);
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/admin/provider-collaborations", { credentials: "same-origin", cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("queue_unavailable");
        return response.json() as Promise<{ pending: Request[] }>;
      }).then((body) => { if (!controller.signal.aborted) setItems(body.pending); })
      .catch(() => { if (!controller.signal.aborted) setError("دریافت صف بررسی دنا ممکن نشد."); });
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
      const response = await fetch(`/api/admin/provider-collaborations/${encodeURIComponent(id)}/decision`, {
        method: "POST", credentials: "same-origin", cache: "no-store",
        headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, reason }),
      });
      const body = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) {
        setError(body?.error === "conflicted_reviewer"
          ? "این درخواست باید توسط بازبین دنا که در این همکاری ذی‌نفع نیست بررسی شود."
          : "ثبت تصمیم ممکن نشد؛ دسترسی یا وضعیت پرونده را بررسی کنید.");
        return;
      }
      await reload();
      setNotice(action === "approve" ? "همکاری پس از دو مرحله بررسی تأیید شد." : "رد درخواست با دلیل ثبت شد.");
    } catch { setError("ارتباط برقرار نشد؛ صف را تازه کنید و وضعیت را بررسی کنید."); }
    finally { setBusy(null); }
  }

  return <div className="space-y-5">
    <p className="rounded-xl bg-dena-lavender p-4 text-sm leading-7 text-dena-deep">
      فقط درخواست‌هایی نمایش داده می‌شوند که مؤسسه آن‌ها را پذیرفته است. تصمیم این صف همکاری سراسری ارائه‌دهنده با مؤسسه را تعیین می‌کند؛ نظارت هر دوره همچنان مستقل است.
    </p>
    <div role="status" aria-live="polite" className="text-sm leading-7">
      {error && <p className="text-red-700">{error}</p>}{!error && notice && <p className="text-dena-deep">{notice}</p>}
    </div>
    {!items.length ? <p className="text-sm text-dena-muted">درخواستی در صف بررسی دنا نیست.</p>
      : <ul className="space-y-5">{items.map((item) => <li key={item.id} className="rounded-xl border border-dena-border p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><h2 className="font-extrabold text-dena-deep">{item.providerName} <span title="نشان نارنجی پس از بررسی نهایی" className="text-orange-600">✓</span></h2>
            <p className="mt-1 text-sm text-dena-muted">درخواست همکاری با {item.instituteName} <span title="مؤسسهٔ تأییدشده" className="text-blue-600">✓</span></p></div>
          <p className="text-xs text-dena-muted">{new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium", timeZone: "Asia/Tehran" }).format(new Date(item.requestedAt))}</p>
        </div>
        <p className="mt-3 text-sm leading-7 text-dena-muted">دلیل پذیرش مؤسسه: {item.instituteDecisionReason}</p>
        <p className="mt-2 text-xs text-dena-muted">شناسه پرونده: <bdi dir="ltr">{item.id}</bdi></p>
        <form onSubmit={(event) => decide(event, item.id)} className="mt-4 space-y-3">
          <label className="block text-sm font-bold">دلیل تصمیم دنا (حداقل ۱۵ نویسه)
            <textarea name="reason" required minLength={15} maxLength={500} rows={3} className="mt-2 w-full rounded-xl border border-dena-border p-4" />
          </label>
          <div className="flex flex-wrap gap-3">
            <Button name="action" value="approve" type="submit" disabled={Boolean(busy)}>تأیید نهایی همکاری</Button>
            <Button name="action" value="reject" type="submit" variant="outline" disabled={Boolean(busy)}>رد درخواست با دلیل</Button>
          </div>
        </form>
      </li>)}</ul>}
  </div>;
}
