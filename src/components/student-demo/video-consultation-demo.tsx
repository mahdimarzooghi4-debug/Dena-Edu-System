"use client";

import { useState } from "react";

type Status = "ready" | "joined" | "ended";

export function VideoConsultationDemo() {
  const [status, setStatus] = useState<Status>("ready");
  const [audioOnly, setAudioOnly] = useState(false);
  const [microphoneEnabled, setMicrophoneEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [confirmEnd, setConfirmEnd] = useState(false);

  const joined = status === "joined";

  function start() {
    setStatus("joined");
    setConfirmEnd(false);
    setMicrophoneEnabled(true);
    setCameraEnabled(!audioOnly);
  }

  function end() {
    setStatus("ended");
    setConfirmEnd(false);
    setMicrophoneEnabled(false);
    setCameraEnabled(false);
  }

  return (
    <section aria-label="پیش‌نمایش تماس تصویری" className="space-y-5">
      <header className="rounded-[22px] bg-dena-lavender p-5 md:p-8">
        <span className="inline-flex rounded-full bg-white px-3 py-1 text-xs font-extrabold text-dena-brand">
          فقط نمایش · بدون تماس واقعی
        </span>
        <h2 className="mt-3 text-2xl font-extrabold text-dena-deep md:text-3xl">جلسه مشاوره تصویری</h2>
        <p className="mt-2 text-sm leading-8 text-dena-muted">
          این صفحه نمونهٔ رابط تماس دناست. هیچ شخص واقعی متصل نمی‌شود، پرداختی انجام نمی‌شود
          و دوربین یا میکروفن دستگاه درخواست یا فعال نمی‌شود.
        </p>
      </header>

      <div className="grid gap-3 rounded-[22px] border border-dena-border bg-white p-4 md:grid-cols-[1fr_auto] md:items-center md:p-6">
        <div>
          <p className="text-xs font-bold text-dena-brand">خدمت نمونه · مشاوره برنامه‌ریزی تحصیلی</p>
          <h3 className="mt-1 text-lg font-extrabold text-dena-deep">نمای تماس با مشاور دوره</h3>
          <p className="mt-1 text-xs leading-6 text-dena-muted">
            نام‌ها، وضعیت جلسه و تصاویر نمادین هستند؛ هیچ ثبت سفارش یا رزرو واقعی وجود ندارد.
          </p>
        </div>
        <span aria-live="polite" role="status" className={
          "w-fit rounded-full px-4 py-2 text-xs font-bold " +
          (joined ? "bg-emerald-50 text-emerald-800" : "bg-dena-bg text-dena-muted")
        }>
          {joined ? "در حال نمایش جلسه" : status === "ended" ? "جلسه نمایشی پایان یافت" : "آماده پیش‌نمایش"}
        </span>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="flex min-h-56 flex-col items-center justify-center gap-4 rounded-[22px] bg-[#211E36] p-6 text-white md:min-h-80">
          <div aria-hidden="true" className="grid size-24 place-items-center rounded-full border-4 border-white/15 bg-[#554776] text-4xl font-bold">
            م
          </div>
          <div className="text-center">
            <h3 className="font-extrabold">مشاور نمونه</h3>
            <p className="mt-1 text-xs text-white/70">
              {joined ? "نمایش چهره نمادین؛ ارتباط واقعی برقرار نیست" : "منتظر شروع پیش‌نمایش"}
            </p>
          </div>
        </div>
        <div className="flex min-h-56 flex-col items-center justify-center gap-4 rounded-[22px] bg-[#343950] p-6 text-white md:min-h-80">
          <div aria-hidden="true" className="grid size-24 place-items-center rounded-full border-4 border-white/15 bg-[#64718A] text-4xl font-bold">
            {joined && !cameraEnabled ? "×" : "ش"}
          </div>
          <div className="text-center">
            <h3 className="font-extrabold">دانش‌آموز (شما)</h3>
            <p aria-live="polite" className="mt-1 text-xs text-white/70">
              {!joined ? "پیش‌نمایش بدون دوربین" : cameraEnabled ? "دوربین نمایشی روشن" : "دوربین نمایشی خاموش"}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-[22px] border border-dena-border bg-white p-5 md:p-6">
        {!joined ? (
          <div className="space-y-4">
            <label className="flex items-center gap-3 text-sm font-semibold text-dena-deep">
              <input
                type="checkbox"
                checked={audioOnly}
                onChange={(event) => setAudioOnly(event.target.checked)}
                className="size-5 accent-dena-brand"
              />
              پیش‌نمایش فقط با صدا
            </label>
            <button type="button" onClick={start} className="min-h-12 w-full rounded-xl bg-dena-brand px-6 py-3 text-sm font-extrabold text-white md:w-auto">
              {audioOnly ? "شروع پیش‌نمایش صوتی" : "شروع پیش‌نمایش تصویری"}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                aria-pressed={microphoneEnabled}
                onClick={() => setMicrophoneEnabled((current) => !current)}
                className="min-h-11 rounded-xl border border-dena-border px-4 py-2 text-sm font-bold text-dena-deep"
              >
                {microphoneEnabled ? "خاموش کردن میکروفن نمایشی" : "روشن کردن میکروفن نمایشی"}
              </button>
              <button
                type="button"
                aria-pressed={cameraEnabled}
                onClick={() => setCameraEnabled((current) => !current)}
                className="min-h-11 rounded-xl border border-dena-border px-4 py-2 text-sm font-bold text-dena-deep"
              >
                {cameraEnabled ? "خاموش کردن دوربین نمایشی" : "روشن کردن دوربین نمایشی"}
              </button>
              <button
                type="button"
                onClick={() => setConfirmEnd(true)}
                className="min-h-11 rounded-xl bg-red-700 px-4 py-2 text-sm font-bold text-white"
              >
                پایان جلسه نمایشی
              </button>
            </div>
            <p aria-live="polite" className="text-xs text-dena-muted">
              {microphoneEnabled ? "میکروفن نمادین روشن" : "میکروفن نمادین خاموش"} · {cameraEnabled ? "دوربین نمادین روشن" : "دوربین نمادین خاموش"}
            </p>
            {confirmEnd && (
              <div role="alertdialog" aria-labelledby="demo-end-title" aria-describedby="demo-end-desc" className="space-y-3 rounded-xl border border-amber-300 bg-amber-50 p-4">
                <h4 id="demo-end-title" className="font-bold text-dena-deep">پایان پیش‌نمایش؟</h4>
                <p id="demo-end-desc" className="text-sm text-dena-muted">فقط وضعیت این صفحه تغییر می‌کند؛ هیچ جلسه واقعی ایجاد نشده است.</p>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setConfirmEnd(false)} className="min-h-10 rounded-lg border border-dena-border bg-white px-4 py-2 text-sm font-bold">بازگشت به پیش‌نمایش</button>
                  <button type="button" onClick={end} className="min-h-10 rounded-lg bg-red-700 px-4 py-2 text-sm font-bold text-white">تأیید پایان نمایشی</button>
                </div>
              </div>
            )}
          </div>
        )}
        <p className="mt-5 border-t border-dena-border pt-4 text-xs leading-7 text-dena-muted">
          این رابط فقط در حافظه همین صفحه کار می‌کند. نه اتصال LiveKit دارد، نه دسترسی به دوربین یا میکروفن، نه ذخیره اطلاعات و نه پرداخت.
        </p>
      </div>
    </section>
  );
}
