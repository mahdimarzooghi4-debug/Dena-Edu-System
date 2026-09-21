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

  const reload = useCallback(async () => {
    const response = await fetch("/api/admin/role-applications", {
      credentials: "same-origin", cache: "no-store",
    });
    if (!response.ok) throw new Error("queue_unavailable");
    const data = await response.json() as { pending: Application[] };
    setItems(data.pending);
  }, []);

  useEffect(() => {
    void reload().catch(() => setProblem("دریافت درخواست‌های در انتظار بررسی ممکن نشد."));
  }, [reload]);

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
      await reload();
    } catch {
      setProblem("ارتباط برقرار نشد. دوباره تلاش کنید.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-5">
      <p className="rounded-xl bg-dena-lavender p-4 text-sm leading-7 text-dena-deep">
        تأیید فقط پس از بررسی مستقل مدارک و ثبت شناسه مرجع محرمانه مجاز است.
        هر تأیید یک محدوده دسترسی جدید با شناسه تولیدشده در سرور می‌سازد.
        این فرایند مجوز آموزشی رسمی یا رابطه نظارتی با دوره ایجاد نمی‌کند.
      </p>
      <div role="status" aria-live="polite" className="text-sm leading-7">
        {problem && <p className="text-red-700">{problem}</p>}
        {!problem && notice && <p className="text-dena-deep">{notice}</p>}
      </div>
      {items.length === 0
        ? <p className="text-sm text-dena-muted">درخواستی در صف بررسی نیست.</p>
        : <ul className="space-y-5">
            {items.map((item) => <li key={item.id}
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
