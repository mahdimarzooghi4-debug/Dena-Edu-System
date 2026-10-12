"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Button } from "../ui/button";

type Upload = {
  uploadId: string; assetId: string; title: string;
  status: "reserved" | "uploading" | "quarantined" | "ready" | "rejected";
  expectedBytes: number; createdAt: string;
};
const labels = {
  reserved: "رزرو دریافت",
  uploading: "در حال انتقال",
  quarantined: "در قرنطینه؛ منتظر بررسی مستقل",
  ready: "پردازش و تأییدشده؛ قابل انتشار پس از کنترل دوره",
  rejected: "نامعتبر یا انتقال ناموفق",
} as const;
const maxBytes = 8 * 1024 * 1024;

export function MediaIngestForm({ courseId }: { courseId: string }) {
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [problem, setProblem] = useState("");
  const requestId = useRef<string | null>(null);
  const path = `/api/provider/courses/${encodeURIComponent(courseId)}/media-ingest`;

  async function refresh() {
    const response = await fetch(path, {
      cache: "no-store", credentials: "same-origin",
    });
    if (!response.ok) throw new Error("list_unavailable");
    setUploads((await response.json() as { uploads: Upload[] }).uploads);
  }
  useEffect(() => {
    const controller = new AbortController();
    void fetch(path, {
      cache: "no-store", credentials: "same-origin", signal: controller.signal,
    }).then(async (response) => {
      if (!response.ok) throw new Error("list_unavailable");
      return response.json() as Promise<{ uploads: Upload[] }>;
    }).then((data) => {
      if (!controller.signal.aborted) setUploads(data.uploads);
    }).catch(() => {
      if (!controller.signal.aborted) setProblem("فهرست ویدئوهای این دوره در دسترس نیست.");
    });
    return () => controller.abort();
  }, [path]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file || busy) return;
    setBusy(true); setProblem(""); setMessage("");
    if (file.size < 16 || file.size > maxBytes) {
      setProblem("فایل آزمایشی باید بین ۱۶ بایت و ۸ مگابایت باشد.");
      setBusy(false); return;
    }
    requestId.current ??= crypto.randomUUID();
    try {
      const bytes = await file.arrayBuffer();
      const digest = await crypto.subtle.digest("SHA-256", bytes);
      const sha256 = Array.from(new Uint8Array(digest),
        (number) => number.toString(16).padStart(2, "0")).join("");
      const reservation = await fetch(path, {
        method: "POST", credentials: "same-origin", cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(), clientRequestId: requestId.current,
          expectedBytes: file.size, sha256,
        }),
      });
      if (!reservation.ok) {
        setProblem(reservation.status === 409
          ? "شناسه درخواست با مشخصات دیگری رزرو شده یا سقف آزمایشی دوره پر است."
          : reservation.status === 503
            ? "زیرساخت دریافت خصوصی در این محیط فعال نیست."
            : "درخواست دریافت ویدئو رد شد؛ عضویت، تأیید مؤسسه و پیش‌نویس بودن دوره را بررسی کنید.");
        return;
      }
      const job = await reservation.json() as {
        uploadId: string; status: Upload["status"];
      };
      if (job.status === "quarantined" || job.status === "ready") {
        requestId.current = null;
        setFile(null); setTitle("");
        await refresh();
        setMessage("این فایل پیش‌تر دریافت شده است؛ بارگذاری تکراری انجام نشد.");
        return;
      }
      if (job.status !== "reserved") {
        requestId.current = null;
        await refresh();
        setProblem("این نوبت دریافت قابل تکرار نیست؛ یک درخواست تازه ثبت کنید.");
        return;
      }
      const uploaded = await fetch(
        `${path}/${encodeURIComponent(job.uploadId)}`, {
          method: "PUT", cache: "no-store", credentials: "same-origin",
          headers: { "Content-Type": "video/mp4" },
          body: file,
        },
      );
      await refresh();
      if (!uploaded.ok) {
        if (uploaded.status !== 503) requestId.current = null;
        setProblem("انتقال ناموفق بود؛ وضعیت درخواست را بررسی و سپس در صورت لزوم درخواست تازه ایجاد کنید.");
        return;
      }
      requestId.current = null;
      setFile(null); setTitle("");
      const input = document.getElementById("pilot-video-file") as HTMLInputElement | null;
      if (input) input.value = "";
      setMessage("فایل فقط به قرنطینه منتقل شد؛ هنوز برای دانش‌آموز قابل مشاهده نیست.");
    } catch {
      setProblem("ارتباط ناموفق بود. با همان فایل و عنوان وضعیت درخواست را بازیابی کنید.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-7">
      <form className="space-y-5" onSubmit={submit}>
        <label className="block text-sm font-bold" htmlFor="pilot-video-title">
          عنوان ویدئو
          <input id="pilot-video-title" required minLength={3} maxLength={160}
            value={title} onChange={(event) => {
              setTitle(event.target.value); requestId.current = null;
            }} className="mt-2 min-h-12 w-full rounded-xl border border-dena-border px-4" />
        </label>
        <label className="block text-sm font-bold" htmlFor="pilot-video-file">
          فایل MP4 آزمایشی (حداکثر ۸ مگابایت)
          <input id="pilot-video-file" type="file" accept=".mp4,video/mp4" required
            onChange={(event) => {
              setFile(event.target.files?.[0] ?? null);
              requestId.current = null;
            }} className="mt-2 block w-full rounded-xl border border-dena-border p-3" />
        </label>
        <p className="text-xs leading-7 text-dena-muted">
          انتخاب فایل به معنی تأیید امنیت یا کیفیت آن نیست؛ انتقال به قرنطینه
          و راستی‌آزمایی سرویس پردازش مستقل لازم است. فایل نامش به عنوان object key استفاده نمی‌شود.
        </p>
        <Button type="submit" disabled={busy || !file} className="w-full disabled:opacity-50">
          {busy ? "در حال محاسبه و انتقال…" : "انتقال امن به قرنطینه"}
        </Button>
      </form>
      <div role="status" aria-live="polite" className="text-sm leading-7">
        {problem && <p className="text-red-700">{problem}</p>}
        {!problem && message && <p className="text-dena-deep">{message}</p>}
      </div>
      <section className="border-t border-dena-border pt-6" aria-labelledby="pilot-media-status">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="pilot-media-status" className="text-lg font-extrabold">ویدئوهای این نوبت دوره</h2>
          <Button type="button" variant="outline" disabled={busy}
            onClick={() => void refresh().catch(() =>
              setProblem("به‌روزرسانی وضعیت ممکن نشد."))}>
            به‌روزرسانی وضعیت
          </Button>
        </div>
        {!uploads.length
          ? <p className="mt-4 text-sm text-dena-muted">درخواستی ثبت نشده است.</p>
          : <ul className="mt-4 space-y-3">
            {uploads.map((item) => <li key={item.uploadId}
              className="rounded-xl border border-dena-border p-4">
              <p className="font-bold">{item.title}</p>
              <p className="mt-1 text-xs text-dena-muted">
                شناسه درخواست: <bdi dir="ltr">{item.uploadId}</bdi>
              </p>
              <p className="mt-2 text-sm font-semibold text-dena-deep">
                {labels[item.status]}
              </p>
            </li>)}
          </ul>}
      </section>
    </div>
  );
}
