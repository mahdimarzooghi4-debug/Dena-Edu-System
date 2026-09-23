"use client";

import { useState } from "react";
import { Button } from "../ui/button";

type Video = { assetId: string; title: string; completed: boolean };

/** Self-reported markers: the server never infers completion from streamed bytes. */
export function VideoProgress({
  courseId, videos,
}: { courseId: string; videos: Video[] }) {
  const [items, setItems] = useState(videos);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const marked = items.filter((item) => item.completed).length;

  async function toggle(video: Video) {
    if (busyId) return;
    setBusyId(video.assetId);
    setError("");
    setNotice("");
    const path = `/api/student/courses/${courseId}/media/${video.assetId}/completion`;
    try {
      const response = await fetch(path, {
        method: video.completed ? "DELETE" : "POST",
        credentials: "same-origin", cache: "no-store",
        headers: { "Content-Type": "application/json" },
        ...(video.completed ? {} : { body: "{}" }),
      });
      if (!response.ok) {
        setError(response.status === 404 || response.status === 401
          ? "دسترسی به این ویدئو تغییر کرده است؛ وضعیت دوره را دوباره بررسی کنید."
          : "ثبت وضعیت ویدئو ممکن نشد. دوباره تلاش کنید.");
        return;
      }
      setItems((current) => current.map((item) =>
        item.assetId === video.assetId
          ? { ...item, completed: !video.completed } : item));
      setNotice(video.completed
        ? "علامت انجام‌شده برای این ویدئو برداشته شد."
        : "علامت انجام‌شده برای این ویدئو ذخیره شد.");
    } catch {
      setError("ارتباط با سرور برقرار نشد؛ دوباره تلاش کنید.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-7">
      <p className="rounded-xl bg-dena-bg p-4 text-sm leading-8 text-dena-deep">
        ویدئوهای علامت‌گذاری‌شده به انتخاب خودت:{" "}
        <strong>{marked.toLocaleString("fa-IR")}</strong> از{" "}
        <strong>{items.length.toLocaleString("fa-IR")}</strong> ویدئوی
        نمایش‌داده‌شده. این علامت نمره یا اثبات تماشای کامل نیست.
      </p>
      <div role="status" aria-live="polite" className="text-sm leading-7">
        {error && <p className="text-red-700">{error}</p>}
        {!error && notice && <p className="text-dena-deep">{notice}</p>}
      </div>
      {items.map((video) => (
        <section key={video.assetId} aria-label={video.title}
          className="space-y-3 rounded-xl border border-dena-border p-4">
          <h2 className="text-lg font-bold">{video.title}</h2>
          <video controls preload="none" playsInline
            controlsList="nodownload" className="aspect-video w-full rounded-xl bg-black"
            aria-label={video.title}
            src={`/api/student/courses/${courseId}/media/${video.assetId}`}>
            مرورگر شما از پخش ویدئو پشتیبانی نمی‌کند.
          </video>
          <p className="text-sm text-dena-muted">
            {video.completed ? "به انتخاب شما انجام‌شده" : "هنوز انجام‌شده علامت نخورده"}
          </p>
          <Button type="button" variant={video.completed ? "outline" : "primary"}
            disabled={Boolean(busyId)}
            className="disabled:opacity-50"
            onClick={() => toggle(video)}>
            {busyId === video.assetId ? "در حال ذخیره…" :
              video.completed ? "برداشتن علامت انجام‌شده" :
                "علامت‌گذاری به‌عنوان انجام‌شده"}
          </Button>
        </section>
      ))}
    </div>
  );
}
