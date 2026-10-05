"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Button } from "../ui/button";

type Affiliation = {
  id: string; instituteId: string; displayName: string; statement: string;
  status: "requested" | "approved"; decisionReason: string | null; createdAt: string;
};

export function IndependentEducatorQueue() {
  const [items, setItems] = useState<Affiliation[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const reload = useCallback(async () => {
    const response = await fetch("/api/institute/educators", {
      credentials: "same-origin", cache: "no-store",
    });
    if (!response.ok) throw new Error("unavailable");
    setItems((await response.json() as { affiliations: Affiliation[] }).affiliations);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/institute/educators", {
      credentials: "same-origin", cache: "no-store", signal: controller.signal,
    }).then(async (response) => {
      if (!response.ok) throw new Error("unavailable");
      return response.json() as Promise<{ affiliations: Affiliation[] }>;
    }).then((body) => {
      if (!controller.signal.aborted) setItems(body.affiliations);
    }).catch(() => {
      if (!controller.signal.aborted) setError("دریافت درخواست‌های همکاران ممکن نشد.");
    });
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
      const response = await fetch(`/api/institute/educators/${encodeURIComponent(id)}/decision`, {
        method: "POST", credentials: "same-origin", cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reason }),
      });
      if (!response.ok) {
        setError("ثبت تصمیم ممکن نشد؛ ممکن است مجوز یا وضعیت درخواست تغییر کرده باشد.");
        return;
      }
      await reload();
      setNotice(action === "approve" ? "همکاری با همین مؤسسه پذیرفته شد." : "درخواست با دلیل رد شد.");
    } catch { setError("ارتباط برقرار نشد؛ فهرست را تازه کنید."); }
    finally { setBusy(null); }
  }

  async function revoke(id: string) {
    if (busy) return;
    const reason = window.prompt("دلیل خاتمهٔ همکاری (حداقل ۱۵ نویسه)")?.trim() ?? "";
    if (reason.length < 15) {
      setError("برای خاتمهٔ همکاری، دلیل حداقل ۱۵ نویسه‌ای لازم است.");
      return;
    }
    setBusy(id); setError(""); setNotice("");
    try {
      const response = await fetch(`/api/institute/educators/${encodeURIComponent(id)}/decision`, {
        method: "POST", credentials: "same-origin", cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "revoke", reason }),
      });
      if (!response.ok) {
        setError("خاتمهٔ همکاری ثبت نشد؛ وضعیت درخواست را تازه کنید.");
        return;
      }
      await reload();
      setNotice("خاتمهٔ همکاری ثبت شد.");
    } catch { setError("ارتباط برقرار نشد؛ فهرست را تازه کنید."); }
    finally { setBusy(null); }
  }

  return <div className="space-y-5">
    <p className="rounded-xl bg-dena-lavender p-4 text-sm leading-7 text-dena-deep">
      تصمیم شما فقط همکاری با همین مؤسسه را ثبت می‌کند. نشان نارنجی به‌معنای مجوز مستقل نیست؛
      تأیید دوره و دسترسی به دانش‌آموزان همچنان مسیر جدا دارد.
    </p>
    <div role="status" aria-live="polite" className="text-sm leading-7">
      {error && <p className="text-red-700">{error}</p>}
      {!error && notice && <p className="text-dena-deep">{notice}</p>}
    </div>
    {!items.length ? <p className="text-sm text-dena-muted">درخواستی برای بررسی یا همکاری فعالی نیست.</p>
      : <ul className="space-y-4">{items.map((item) => <li key={item.id}
        className="rounded-xl border border-dena-border p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-extrabold text-dena-deep">{item.displayName}
              <span className="mr-2 text-orange-700" aria-label="همکار مستقل">✓</span>
            </h2>
            <p className="mt-1 text-xs text-dena-muted">درخواست در {new Intl.DateTimeFormat("fa-IR", {
              dateStyle: "medium", timeZone: "Asia/Tehran",
            }).format(new Date(item.createdAt))}</p>
          </div>
          {item.status === "approved" && <span className="rounded-full bg-dena-bg px-3 py-1.5 text-xs font-bold">
            همکاری فعال · نشان نارنجی
          </span>}
        </div>
        <p className="mt-3 whitespace-pre-wrap text-sm leading-7">{item.statement}</p>
        {item.status === "requested" ? <form onSubmit={(event) => decide(event, item.id)}
          className="mt-4 space-y-3">
          <label className="block text-sm font-bold">دلیل تصمیم (حداقل ۱۵ نویسه)
            <textarea name="reason" required minLength={15} maxLength={500} rows={3}
              className="mt-2 w-full rounded-xl border border-dena-border p-4" />
          </label>
          <div className="flex flex-wrap gap-3">
            <Button name="action" value="approve" type="submit" disabled={Boolean(busy)}>
              پذیرش همکاری
            </Button>
            <Button name="action" value="reject" type="submit" variant="outline" disabled={Boolean(busy)}>
              رد درخواست
            </Button>
          </div>
        </form> : <Button type="button" variant="outline" disabled={Boolean(busy)}
          onClick={() => void revoke(item.id)} className="mt-4">
          خاتمهٔ همکاری
        </Button>}
      </li>)}</ul>}
  </div>;
}
