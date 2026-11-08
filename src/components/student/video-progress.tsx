"use client";

import { useState } from "react";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { VideoNote } from "./video-note";

type Video = { assetId: string; title: string; completed: boolean; note: string | null };

/** Player workspace matching the student learning screen; completion stays self-reported. */
export function VideoProgress({
  courseId, courseTitle, providerName, teacherName, videos, initialVideoId,
}: {
  courseId: string;
  courseTitle: string;
  providerName: string;
  teacherName: string | null;
  videos: Video[];
  initialVideoId?: string;
}) {
  const [items, setItems] = useState(videos);
  const [selectedId, setSelectedId] = useState(initialVideoId && videos.some((video) => video.assetId === initialVideoId) ? initialVideoId : videos[0]?.assetId ?? "");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const selectedIndex = items.findIndex((item) => item.assetId === selectedId);
  const selected = selectedIndex >= 0 ? items[selectedIndex] : items[0];
  const nextUnmarked = items.findIndex((item) => !item.completed);

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
        ? "علامت انجام‌شده برای این جلسه برداشته شد."
        : "علامت انجام‌شده برای این جلسه ذخیره شد.");
    } catch {
      setError("ارتباط با سرور برقرار نشد؛ دوباره تلاش کنید.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div role="status" aria-live="polite" className="text-sm leading-7">
        {error && <p className="rounded-xl bg-red-50 p-3 text-red-800">{error}</p>}
        {!error && notice && <p className="rounded-xl bg-dena-bg p-3 text-dena-deep">{notice}</p>}
      </div>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_290px]" dir="rtl">
        <div className="min-w-0 space-y-4">
          {selected ? (
            <>
              <video key={selected.assetId} controls preload="none" playsInline
                controlsList="nodownload"
                className="aspect-video w-full rounded-[18px] bg-[#171426]"
                aria-label={selected.title}
                src={`/api/student/courses/${courseId}/media/${selected.assetId}`}>
                مرورگر شما از پخش ویدئو پشتیبانی نمی‌کند.
              </video>
              <div className="grid gap-3 md:grid-cols-[1fr_280px]">
                <Card className="space-y-3 rounded-[18px] p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="font-extrabold text-dena-deep">{courseTitle} — {selected.title}</h2>
                      <p className="mt-2 text-xs text-dena-muted">ارائه‌دهنده: {providerName}</p>
                      {teacherName && <p className="mt-1 text-xs text-dena-muted">مدرس: {teacherName}</p>}
                    </div>
                    <span className="shrink-0 rounded-full bg-dena-lavender px-3 py-1 text-xs font-bold text-dena-brand">
                      {selected.completed ? "تکمیل‌شده" : "در حال یادگیری"}
                    </span>
                  </div>
                </Card>
                <Card className="space-y-3 rounded-[18px] p-5">
                  <h3 className="text-sm font-extrabold text-dena-deep">وضعیت این جلسه</h3>
                  <p className="text-xs leading-6 text-dena-muted">
                    تکمیل جلسه را خودت علامت می‌زنی؛ این ثبت، اثبات تماشا یا نمرهٔ رسمی نیست.
                  </p>
                  <Button type="button" variant={selected.completed ? "outline" : "primary"}
                    disabled={Boolean(busyId)} onClick={() => void toggle(selected)}
                    className="w-full disabled:opacity-50">
                    {busyId === selected.assetId ? "در حال ذخیره…" :
                      selected.completed ? "برداشتن علامت تکمیل" : "علامت‌گذاری به‌عنوان تکمیل‌شده"}
                  </Button>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" disabled={selectedIndex <= 0}
                      onClick={() => setSelectedId(items[selectedIndex - 1]?.assetId ?? "")}
                      className="flex-1">جلسه قبلی</Button>
                    <Button type="button" variant="outline"
                      disabled={selectedIndex < 0 || selectedIndex >= items.length - 1}
                      onClick={() => setSelectedId(items[selectedIndex + 1]?.assetId ?? "")}
                      className="flex-1">جلسه بعدی</Button>
                  </div>
                </Card>
              </div>
              <Card className="rounded-[18px] p-5 md:p-6">
                <h3 className="mb-4 font-extrabold text-dena-deep">یادداشت شخصی من</h3>
                <p className="mb-3 text-xs text-dena-muted">
                  فقط خودت می‌توانی این یادداشت را ببینی.
                </p>
                <VideoNote courseId={courseId} assetId={selected.assetId}
                  title={selected.title} initialNote={selected.note} />
              </Card>
            </>
          ) : (
            <Card className="grid min-h-64 place-items-center rounded-[18px] p-6 text-center">
              <div><h2 className="font-extrabold text-dena-deep">جلسهٔ آماده‌ای برای پخش وجود ندارد</h2>
                <p className="mt-2 text-sm leading-7 text-dena-muted">وقتی محتوای مجاز و آمادهٔ این دوره منتشر شود، جلسه‌ها اینجا نمایش داده می‌شوند.</p></div>
            </Card>
          )}
        </div>

        <Card className="h-fit space-y-4 rounded-[18px] p-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-extrabold text-dena-deep">محتوای این دوره</h2>
            <span className="text-xs text-dena-muted">{items.length.toLocaleString("fa-IR")} جلسه</span>
          </div>
          {nextUnmarked >= 0 && (
            <button type="button" onClick={() => setSelectedId(items[nextUnmarked].assetId)}
              className="text-xs font-bold text-dena-brand hover:underline">
              ادامه از جلسهٔ بعدی
            </button>
          )}
          {items.length === 0 ? (
            <p className="rounded-xl bg-dena-bg p-4 text-sm leading-7 text-dena-muted">محتوای این دوره در حال آماده‌سازی است.</p>
          ) : (
            <ol className="space-y-2">
              {items.map((video, index) => {
                const active = video.assetId === selected?.assetId;
                return <li key={video.assetId}>
                  <button type="button" onClick={() => setSelectedId(video.assetId)}
                    aria-current={active ? "true" : undefined}
                    className={`w-full rounded-xl border px-3 py-3 text-right transition ${active
                      ? "border-dena-brand bg-dena-lavender"
                      : "border-dena-border bg-white hover:border-dena-brand"}`}>
                    <span className="flex items-start justify-between gap-2">
                      <span className="text-sm font-semibold leading-6 text-dena-ink">
                        جلسهٔ {(index + 1).toLocaleString("fa-IR")} — {video.title}
                      </span>
                      <span className={`mt-1 size-2 shrink-0 rounded-full ${video.completed ? "bg-dena-mint" : active ? "bg-dena-brand" : "bg-dena-muted/40"}`} aria-hidden="true" />
                    </span>
                    <span className="mt-1 block text-xs text-dena-muted">
                      {video.completed ? "تکمیل‌شده" : active ? "در حال یادگیری" : "شروع‌نشده"}
                    </span>
                  </button>
                </li>;
              })}
            </ol>
          )}
          {items.length > 0 && (
            <p className="border-t border-dena-border pt-3 text-xs leading-6 text-dena-muted">
              وضعیت تکمیل، فقط با انتخاب خودت ثبت می‌شود و زمان تماشا را اندازه نمی‌گیرد.
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}
