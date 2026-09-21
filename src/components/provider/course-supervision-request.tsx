"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { Button } from "../ui/button";

type Course = {
  courseId: string;
  providerId: string;
  responsibleInstituteId: string;
  title: string;
  supervisionStatus: "requested" | "approved" | "revoked";
  publicationStatus: "draft" | "published" | "archived";
};
const labels = {
  requested: "در انتظار بررسی مؤسسه",
  approved: "تأییدشده برای همین دوره",
  revoked: "رد/لغو شده",
} as const;

export function CourseSupervisionRequest({ providerIds }: { providerIds: string[] }) {
  const [items, setItems] = useState<Course[]>([]);
  const [providerId, setProviderId] = useState(providerIds[0] ?? "");
  const [instituteId, setInstituteId] = useState("");
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const requestId = useRef<string | null>(null);

  async function publish(courseId: string) {
    if (busy) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch(
        `/api/provider/courses/${encodeURIComponent(courseId)}/publication`, {
          method: "POST", credentials: "same-origin", cache: "no-store",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "publish" }),
        },
      );
      if (!response.ok) {
        setError(response.status === 503
          ? "پخش خصوصی هنوز در این محیط فعال نشده است."
          : "انتشار ممکن نیست؛ ویدئوی آماده، نظارت معتبر و عضویت فعال لازم است.");
        return;
      }
      await refresh();
      setNotice("دوره رایگان منتشر شد؛ ثبت‌نام همچنان نیازمند مجوز همان دانش‌آموز است.");
    } catch {
      setError("ارتباط برقرار نشد؛ وضعیت انتشار دوره را دوباره بررسی کنید.");
    } finally {
      setBusy(false);
    }
  }

  async function refresh() {
    const result = await fetch("/api/provider/courses", {
      credentials: "same-origin", cache: "no-store",
    });
    if (!result.ok) throw new Error("list_unavailable");
    const data = await result.json() as { courses: Course[] };
    setItems(data.courses);
  }
  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/provider/courses", {
      credentials: "same-origin", cache: "no-store", signal: controller.signal,
    }).then(async (result) => {
      if (!result.ok) throw new Error("list_unavailable");
      return result.json() as Promise<{ courses: Course[] }>;
    }).then((data) => {
      if (!controller.signal.aborted) setItems(data.courses);
    }).catch(() => {
      if (!controller.signal.aborted) setError("فهرست درخواست‌های دوره در دسترس نیست.");
    });
    return () => controller.abort();
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError(""); setNotice("");
    requestId.current ??= crypto.randomUUID();
    try {
      const response = await fetch("/api/provider/courses", {
        method: "POST", credentials: "same-origin", cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          providerId, responsibleInstituteId: instituteId.trim(),
          title: title.trim(), clientRequestId: requestId.current,
        }),
      });
      if (!response.ok) {
        setError(response.status === 404
          ? "مؤسسه ناظر معتبر و دارای نماینده مستقل فعال پیدا نشد؛ شناسه را بررسی کنید."
          : response.status === 409
            ? "درخواست تکراری با مشخصات متفاوت است. اطلاعات را اصلاح کنید."
            : "درخواست دوره ثبت نشد. اطلاعات و مجوز خود را بررسی کنید.");
        return;
      }
      await refresh();
      requestId.current = null;
      setTitle("");
      setInstituteId("");
      setNotice("دوره در وضعیت «در انتظار بررسی مؤسسه» ثبت شد؛ هنوز مجوز نظارتی ندارد.");
    } catch {
      setError("ارتباط قطع شد. بدون تغییر اطلاعات دوباره تلاش کنید؛ درخواست تکراری ساخته نمی‌شود.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      <form onSubmit={submit} className="space-y-5">
        <label htmlFor="course-provider-scope" className="block text-sm font-bold">
          محدوده ارائه‌دهنده
          <select id="course-provider-scope" value={providerId}
            onChange={(event) => { setProviderId(event.target.value); requestId.current = null; }}
            className="mt-2 min-h-12 w-full rounded-xl border border-dena-border bg-white px-4"
            required>
            {providerIds.map((id) =>
              <option key={id} value={id}>{id}</option>)}
          </select>
        </label>
        <label htmlFor="course-title" className="block text-sm font-bold">
          عنوان دوره
          <input id="course-title" value={title}
            onChange={(event) => { setTitle(event.target.value); requestId.current = null; }}
            minLength={5} maxLength={160} required
            className="mt-2 min-h-12 w-full rounded-xl border border-dena-border bg-white px-4"
            placeholder="عنوان پیشنهادی دوره" />
        </label>
        <label htmlFor="course-institute-id" className="block text-sm font-bold">
          شناسه مؤسسه ناظر
          <input id="course-institute-id" value={instituteId} dir="ltr"
            onChange={(event) => { setInstituteId(event.target.value); requestId.current = null; }}
            required placeholder="UUID اعلام‌شده توسط مؤسسه"
            className="mt-2 min-h-12 w-full rounded-xl border border-dena-border bg-white px-4 text-left" />
        </label>
        <p className="text-xs leading-7 text-dena-muted">
          شناسه مؤسسه را از نماینده مجاز آن دریافت کنید؛ این فرم مؤسسه را به صورت
          خودکار ناظر دوره نمی‌کند. برای دریافت مجوز همان دوره تأیید مستقل مؤسسه لازم است.
        </p>
        <Button type="submit" disabled={busy || !providerId}
          className="w-full disabled:opacity-50">
          {busy ? "در حال ثبت…" : "ثبت درخواست نظارت"}
        </Button>
      </form>
      <div role="status" aria-live="polite" className="text-sm leading-7">
        {error && <p className="text-red-700">{error}</p>}
        {!error && notice && <p className="text-dena-deep">{notice}</p>}
      </div>
      <section aria-labelledby="provider-course-status" className="border-t border-dena-border pt-7">
        <h2 id="provider-course-status" className="text-lg font-extrabold">دوره‌ها و وضعیت نظارت</h2>
        {items.length === 0
          ? <p className="mt-4 text-sm text-dena-muted">درخواست دوره‌ای ثبت نشده است.</p>
          : <ul className="mt-4 space-y-3">
            {items.map((item) =>
              <li key={item.courseId} className="rounded-xl border border-dena-border p-4">
                <p className="font-bold">{item.title}</p>
                <p className="mt-2 text-xs text-dena-muted">
                  شناسه دوره: <bdi dir="ltr">{item.courseId}</bdi>
                </p>
                <p className="mt-2 text-sm font-semibold text-dena-deep">
                  {labels[item.supervisionStatus]}
                </p>
                <p className="mt-2 text-sm text-dena-muted">
                  وضعیت انتشار: {item.publicationStatus === "published" ? "منتشرشده"
                    : item.publicationStatus === "archived" ? "بایگانی‌شده" : "پیش‌نویس"}
                </p>
                {item.supervisionStatus === "approved" && item.publicationStatus === "draft" && (
                  <Link href={`/provider/courses/${item.courseId}/media`}
                    className="mt-3 inline-block rounded-xl border border-dena-border px-4 py-3 text-sm font-bold text-dena-deep">
                    دریافت و پیگیری ویدئو در قرنطینه
                  </Link>
                )}
                {item.supervisionStatus === "approved" && item.publicationStatus === "draft" && (
                  <Button type="button" disabled={busy}
                    onClick={() => publish(item.courseId)} className="mt-3 disabled:opacity-50">
                    انتشار رایگان با محتوای آماده
                  </Button>
                )}
              </li>)}
          </ul>}
      </section>
    </div>
  );
}
