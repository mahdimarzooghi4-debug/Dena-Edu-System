"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Button } from "../ui/button";

type Application = {
  id: string;
  userId: string;
  role: "institute" | "provider" | "organization" | "benefactor";
  proposedName: string;
  statement: string;
  createdAt: string;
};

const roleNames = {
  institute: "مؤسسه", provider: "ارائه‌دهنده",
  organization: "سازمان", benefactor: "خیر",
} as const;

export function RoleReviewQueue() {
  const [items, setItems] = useState<Application[]>([]);
  const [problem, setProblem] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [role, setRole] = useState<Application["role"] | "all">("all");
  const filtered = items.filter((item) =>
    (role === "all" || item.role === role) &&
    `${item.proposedName} ${item.id} ${roleNames[item.role]}`.toLocaleLowerCase("fa")
      .includes(query.trim().toLocaleLowerCase("fa")),
  );

  const reload = useCallback(async () => {
    const response = await fetch("/api/admin/role-applications", {
      credentials: "same-origin", cache: "no-store",
    });
    if (!response.ok) throw new Error("queue_unavailable");
    const data = await response.json() as { pending: Application[] };
    setItems(data.pending);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/admin/role-applications", {
      credentials: "same-origin", cache: "no-store", signal: controller.signal,
    }).then(async (response) => {
      if (!response.ok) throw new Error("queue_unavailable");
      return response.json() as Promise<{ pending: Application[] }>;
    }).then((data) => {
      if (!controller.signal.aborted) { setItems(data.pending); setLoading(false); }
    }).catch(() => {
      if (!controller.signal.aborted) { setProblem("دریافت درخواست‌های در انتظار بررسی ممکن نشد."); setLoading(false); }
    });
    return () => controller.abort();
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>, id: string) {
    event.preventDefault();
    if (busyId) return;
    const form = new FormData(event.currentTarget);
    const action = (event.nativeEvent as SubmitEvent).submitter?.getAttribute("value");
    if (action !== "approve" && action !== "reject") return;
    const reason = String(form.get("reason") ?? "").trim();
    const body = action === "approve"
      ? {
          action, reason,
          verifiedName: String(form.get("verifiedName") ?? "").trim(),
          evidenceReference: String(form.get("evidenceReference") ?? "").trim(),
        }
      : { action, reason };
    setProblem(""); setNotice(""); setBusyId(id);
    try {
      const response = await fetch(
        `/api/admin/role-applications/${encodeURIComponent(id)}/decision`, {
          method: "POST", credentials: "same-origin", cache: "no-store",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      if (!response.ok) {
        setProblem(response.status === 409
          ? "این پرونده پیش‌تر بررسی شده یا عضویت مشابهی دارد."
          : response.status === 403
            ? "مجوز رسیدگی ندارید یا امکان تأیید درخواست خودتان وجود ندارد."
            : "ثبت تصمیم ممکن نشد. اطلاعات را بررسی کنید.");
        return;
      }
      setNotice("تصمیم و سوابق آن ثبت شد.");
      try { await reload(); } catch {
        setItems((current) => current.filter((item) => item.id !== id));
        setProblem("تصمیم ثبت شد، اما تازه‌سازی صف ممکن نشد. صف را دوباره دریافت کنید.");
      }
    } catch {
      setProblem("ارتباط برقرار نشد. دوباره تلاش کنید.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center">
        <div role="group" aria-label="فیلتر نقش" className="flex flex-wrap gap-2">
          {(["all", "institute", "organization", "provider", "benefactor"] as const).map((value) => (
            <button key={value} type="button" aria-pressed={role === value}
              onClick={() => setRole(value)}
              className={`min-h-10 rounded-full border px-3 text-xs ${role === value
                ? "border-dena-brand bg-dena-lavender font-bold text-dena-brand"
                : "border-dena-border text-dena-muted"}`}>
              {value === "all" ? "همه نقش‌ها" : roleNames[value]}
            </button>
          ))}
        </div>
        <label className="flex-1 text-xs text-dena-muted">
          <span className="sr-only">جست‌وجوی درخواست</span>
          <input type="search" value={query} onChange={(event) => setQuery(event.target.value)}
            placeholder="جست‌وجو با نام، شناسه یا نقش…"
            className="min-h-10 w-full rounded-lg border border-dena-border bg-dena-bg px-3 text-sm" />
        </label>
      </div>
      <p className="rounded-xl bg-dena-lavender p-4 text-sm leading-7 text-dena-deep">
        تأیید فقط پس از بررسی مستقل مدارک و ثبت شناسه مرجع محرمانه مجاز است.
        هر تأیید یک محدوده دسترسی جدید با شناسه تولیدشده در سرور می‌سازد.
        این فرایند مجوز آموزشی رسمی یا رابطه نظارتی با دوره ایجاد نمی‌کند.
      </p>
      <p className="text-xs text-dena-muted">صف شامل حداکثر ۵۰ درخواست قدیمی‌تر است؛ جست‌وجو و فیلتر روی همین صف اعمال می‌شود.</p>
      <div role="status" aria-live="polite" className="text-sm leading-7">
        {problem && <p className="text-red-700">{problem}</p>}
        {!problem && notice && <p className="text-dena-deep">{notice}</p>}
      </div>
      {problem && <Button type="button" variant="outline" disabled={loading || Boolean(busyId)}
        onClick={async () => {
          setLoading(true); setProblem("");
          try { await reload(); } catch { setProblem("دریافت صف ممکن نشد. دوباره تلاش کنید."); }
          finally { setLoading(false); }
        }}>دریافت دوبارهٔ صف</Button>}
      {loading ? <p role="status" className="text-sm text-dena-muted">در حال دریافت درخواست‌ها…</p>
        : !problem && items.length === 0
          ? <p className="text-sm text-dena-muted">درخواستی در صف بررسی نیست.</p>
          : !problem && filtered.length === 0
            ? <p className="text-sm text-dena-muted">درخواستی با این جست‌وجو و نقش پیدا نشد.</p>
        : <ul className="space-y-5" aria-label="درخواست‌های در انتظار بررسی">
            {filtered.map((item) => <li key={item.id} id={`application-${item.id}`}
              className="rounded-xl border border-dena-border p-5">
              <h2 className="font-extrabold">{roleNames[item.role]} · {item.proposedName}</h2>
              <p className="mt-2 text-xs text-dena-muted">
                شناسه پرونده: <bdi dir="ltr">{item.id}</bdi>
              </p>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-7">{item.statement}</p>
              <form className="mt-5 space-y-3" onSubmit={(event) => submit(event, item.id)}>
                <label className="block text-sm font-bold">
                  نام بررسی‌شده
                  <input name="verifiedName" maxLength={120} defaultValue={item.proposedName}
                    className="mt-2 min-h-12 w-full rounded-xl border border-dena-border px-4" />
                </label>
                <label className="block text-sm font-bold">
                  شناسه مرجع مدارک بررسی‌شده
                  <input name="evidenceReference" maxLength={200}
                    placeholder="شناسه سند در مخزن محدود خارج از دنا"
                    className="mt-2 min-h-12 w-full rounded-xl border border-dena-border px-4" />
                </label>
                <label className="block text-sm font-bold">
                  دلیل تصمیم
                  <textarea name="reason" required minLength={15} maxLength={500}
                    rows={3} className="mt-2 w-full rounded-xl border border-dena-border p-4" />
                </label>
                <div className="flex flex-wrap gap-3">
                  <Button name="action" value="approve" type="submit"
                    disabled={Boolean(busyId)} className="disabled:opacity-50">
                    تأیید پس از بررسی مدارک
                  </Button>
                  <Button name="action" value="reject" type="submit" variant="outline"
                    disabled={Boolean(busyId)} className="disabled:opacity-50">
                    رد درخواست با دلیل
                  </Button>
                </div>
              </form>
            </li>)}
          </ul>}
    </div>
  );
}
