"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { Button } from "../ui/button";

type Course = {
  courseId: string;
  title: string;
  providerId: string;
  responsibleInstituteId: string;
  supervisionStatus: "requested" | "approved" | "revoked";
  requestedAt: string;
};
const statusText = {
  requested: "در انتظار تصمیم شما",
  approved: "تأیید شده",
  revoked: "رد/لغو شده",
} as const;

export function SupervisionQueue({ instituteIds }: { instituteIds: string[] }) {
  const [items, setItems] = useState<Course[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busyCourse, setBusyCourse] = useState<string | null>(null);
  async function refresh() {
    const response = await fetch("/api/institute/supervision", {
      credentials: "same-origin", cache: "no-store",
    });
    if (!response.ok) throw new Error("queue_unavailable");
    setItems((await response.json() as { courses: Course[] }).courses);
  }
  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/institute/supervision", {
      credentials: "same-origin", cache: "no-store", signal: controller.signal,
    }).then(async (response) => {
      if (!response.ok) throw new Error("queue_unavailable");
      return response.json() as Promise<{ courses: Course[] }>;
    }).then((body) => {
      if (!controller.signal.aborted) setItems(body.courses);
    }).catch(() => {
      if (!controller.signal.aborted) setError("دریافت درخواست‌های نظارت ممکن نشد.");
    });
    return () => controller.abort();
  }, []);
  async function decide(event: FormEvent<HTMLFormElement>, courseId: string) {
    event.preventDefault();
    if (busyCourse) return;
    const action = (event.nativeEvent as SubmitEvent).submitter?.getAttribute("value");
    if (action !== "approve" && action !== "revoke") return;
    const form = new FormData(event.currentTarget);
    const reason = String(form.get("reason") ?? "").trim();
    setError(""); setNotice(""); setBusyCourse(courseId);
    try {
      const response = await fetch(
        `/api/institute/supervision/${encodeURIComponent(courseId)}/decision`, {
          method: "POST", credentials: "same-origin", cache: "no-store",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, reason }),
        },
      );
      if (!response.ok) {
        setError(response.status === 409
          ? "درخواست قبلاً تعیین تکلیف شده و تغییر وضعیت مجدد نیازمند فرایند جدید است."
          : "ثبت تصمیم مجاز یا ممکن نیست. مجوز و وضعیت دوره را بررسی کنید.");
        return;
      }
      await refresh();
      setNotice("تصمیم نظارتی فقط برای همان دوره ثبت و بلافاصله در دسترسی‌ها اعمال شد.");
    } catch {
      setError("ارتباط برقرار نشد. وضعیت دوره را پیش از تکرار تصمیم بررسی کنید.");
    } finally {
      setBusyCourse(null);
    }
  }
  return (
    <div className="space-y-6">
      <section aria-labelledby="institute-scopes">
        <h2 id="institute-scopes" className="text-sm font-bold">شناسه مؤسسه‌های تحت اختیار شما</h2>
        <p className="mt-2 text-xs leading-7 text-dena-muted">
          برای درخواست نظارت دوره، شناسه دامنه مناسب را فقط در اختیار ارائه‌دهنده مرتبط قرار دهید.
        </p>
        <ul className="mt-3 space-y-2">
          {instituteIds.map((id) =>
            <li key={id} className="break-all rounded-xl bg-dena-bg px-4 py-3 text-sm" dir="ltr">
              {id}
            </li>)}
        </ul>
      </section>
      <div role="status" aria-live="polite" className="text-sm leading-7">
        {error && <p className="text-red-700">{error}</p>}
        {!error && notice && <p className="text-dena-deep">{notice}</p>}
      </div>
      <section aria-labelledby="institute-supervision-queue" className="border-t border-dena-border pt-7">
        <h2 id="institute-supervision-queue" className="text-lg font-extrabold">درخواست‌های نظارت همان دوره</h2>
        {items.length === 0
          ? <p className="mt-4 text-sm text-dena-muted">درخواستی برای این مؤسسه وجود ندارد.</p>
          : <ul className="mt-4 space-y-4">
            {items.map((item) =>
              <li key={item.courseId} className="rounded-xl border border-dena-border p-5">
                <h3 className="font-extrabold">{item.title}</h3>
                <p className="mt-2 text-xs text-dena-muted">
                  دوره: <bdi dir="ltr">{item.courseId}</bdi>
                </p>
                <p className="mt-1 text-xs text-dena-muted">
                  ارائه‌دهنده: <bdi dir="ltr">{item.providerId}</bdi>
                </p>
                <Link href={`/institute/courses/${item.courseId}`}
                  className="mt-2 inline-block text-sm font-bold text-dena-brand hover:underline">
                  پروندهٔ وضعیت همین دوره
                </Link>
                <p className="mt-3 text-sm font-semibold text-dena-deep">
                  {statusText[item.supervisionStatus]}
                </p>
                {item.supervisionStatus !== "revoked" && (
                  <form className="mt-4 space-y-3"
                    onSubmit={(event) => decide(event, item.courseId)}>
                    <label className="block text-sm font-bold">
                      دلیل تصمیم
                      <textarea name="reason" required minLength={15} maxLength={500}
                        rows={3} className="mt-2 w-full rounded-xl border border-dena-border p-4" />
                    </label>
                    <div className="flex flex-wrap gap-3">
                      {item.supervisionStatus === "requested" && (
                        <Button type="submit" name="action" value="approve"
                          disabled={Boolean(busyCourse)} className="disabled:opacity-50">
                          تأیید نظارت همین دوره
                        </Button>
                      )}
                      <Button type="submit" name="action" value="revoke" variant="outline"
                        disabled={Boolean(busyCourse)} className="disabled:opacity-50">
                        {item.supervisionStatus === "requested"
                          ? "رد درخواست با دلیل" : "لغو نظارت همین دوره"}
                      </Button>
                    </div>
                  </form>
                )}
              </li>)}
          </ul>}
      </section>
    </div>
  );
}
