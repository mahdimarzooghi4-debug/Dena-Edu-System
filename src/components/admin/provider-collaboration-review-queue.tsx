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
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [query, setQuery] = useState("");
  const filtered = items.filter((item) =>
    `${item.providerName} ${item.instituteName} ${item.id}`.toLocaleLowerCase("fa")
      .includes(query.trim().toLocaleLowerCase("fa")),
  );
  const [busy, setBusy] = useState<string | null>(null);
  const reload = useCallback(async () => {
    const response = await fetch("/api/admin/provider-collaborations", { credentials: "same-origin", cache: "no-store" });
    if (!response.ok) throw new Error("queue_unavailable");
    setItems((await response.json() as { pending: Request[] }).pending);
    setLoaded(true);
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/admin/provider-collaborations", { credentials: "same-origin", cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("queue_unavailable");
        return response.json() as Promise<{ pending: Request[] }>;
      }).then((body) => { if (!controller.signal.aborted) { setItems(body.pending); setLoaded(true); setLoading(false); } })
      .catch(() => { if (!controller.signal.aborted) { setError("دریافت صف بررسی دنا ممکن نشد."); setLoading(false); } });
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
      setItems((current) => current.filter((item) => item.id !== id));
      setNotice(action === "approve" ? "همکاری پس از دو مرحله بررسی تأیید شد." : "رد درخواست با دلیل ثبت شد.");
      try { await reload(); } catch {
        setError("تصمیم ثبت شد، اما تازه‌سازی صف ممکن نشد. صف را دوباره دریافت کنید.");
      }
    } catch { setError("ارتباط برقرار نشد؛ صف را تازه کنید و وضعیت را بررسی کنید."); }
    finally { setBusy(null); }
  }

  return <div className="space-y-5">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <label className="flex-1">
        <span className="sr-only">جست‌وجوی همکاری</span>
        <input type="search" value={query} onChange={(event) => setQuery(event.target.value)}
          placeholder="نام ارائه‌دهنده، مؤسسه یا شناسه پرونده…"
          className="min-h-11 w-full rounded-lg border border-dena-border bg-dena-bg px-3 text-sm" />
      </label>
      <Button type="button" variant="outline" disabled={loading || Boolean(busy)}
        onClick={async () => {
          setLoading(true); setError("");
          try { await reload(); } catch { setError("دریافت صف بررسی دنا ممکن نشد."); }
          finally { setLoading(false); }
        }}>{loading ? "در حال دریافت…" : "تازه‌سازی صف"}</Button>
    </div>
    <p className="rounded-xl bg-dena-lavender p-4 text-sm leading-7 text-dena-deep">
      فقط درخواست‌هایی نمایش داده می‌شوند که مؤسسه آن‌ها را پذیرفته است. تصمیم این صف همکاری سراسری ارائه‌دهنده با مؤسسه را تعیین می‌کند؛ نظارت هر دوره همچنان مستقل است.
    </p>
    <p className="text-xs text-dena-muted">جست‌وجو روی حداکثر ۱۰۰ درخواست قدیمی‌ترِ صف فعلی انجام می‌شود.</p>
    <div role="status" aria-live="polite" className="text-sm leading-7">
      {error && <p className="text-red-700">{error}</p>}{notice && <p className="text-dena-deep">{notice}</p>}
    </div>
    {loading ? <p role="status" className="text-sm text-dena-muted">در حال دریافت درخواست‌های همکاری…</p>
      : !loaded ? null
      : !items.length ? <p className="text-sm text-dena-muted">درخواستی در صف بررسی دنا نیست.</p>
      : !filtered.length ? <p className="text-sm text-dena-muted">درخواستی مطابق جست‌وجوی شما پیدا نشد.</p>
      : <ul className="space-y-5" aria-label="همکاری‌های در انتظار تصمیم دنا">{filtered.map((item) => <li key={item.id} className="rounded-xl border border-dena-border p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><h2 className="font-extrabold text-dena-deep">{item.providerName}</h2>
            <p className="mt-1 text-sm text-dena-muted">درخواست همکاری با {item.instituteName}</p></div>
          <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">در انتظار تصمیم دنا</p>
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
