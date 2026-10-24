"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { normalizeDigits, normalizeIranMobile } from "../../lib/phone-number";

type Phase = "phone" | "code";

export function StudentPhoneChangeForm() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("phone");
  const [phoneInput, setPhoneInput] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function requestCode(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    const normalized = normalizeIranMobile(phoneInput);
    if (!normalized) {
      setError("شماره موبایل ایرانی را بررسی کنید.");
      setBusy(false);
      return;
    }
    try {
      const response = await fetch("/api/student/profile/phone-change/request", {
        method: "POST", credentials: "same-origin", cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber: normalized }),
      });
      if (!response.ok) {
        setError(response.status === 429 ? "تعداد درخواست‌ها زیاد است؛ بعداً دوباره تلاش کنید."
          : response.status === 409 ? "این شماره همان شمارهٔ فعلی است یا قبلاً برای حساب دیگری ثبت شده است."
          : response.status === 503 ? "ارسال کد فعلاً در دسترس نیست."
          : "درخواست تغییر شماره انجام نشد؛ وضعیت حساب را بررسی کنید.");
        return;
      }
      setPhoneNumber(normalized);
      setCode("");
      setPhase("code");
      setNotice("کد تأیید به شمارهٔ جدید ارسال شد. کد تا ۵ دقیقه معتبر است.");
    } catch {
      setError("ارتباط برقرار نشد؛ اتصال را بررسی کنید.");
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const normalizedCode = normalizeDigits(code).replace(/\s/g, "");
    if (!/^\d{6}$/.test(normalizedCode)) {
      setError("کد تأیید باید شش رقم باشد.");
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/student/profile/phone-change/verify", {
        method: "POST", credentials: "same-origin", cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: normalizedCode }),
      });
      if (!response.ok) {
        setError(response.status === 410 ? "زمان کد به پایان رسیده است؛ کد تازه بگیرید."
          : response.status === 409 ? "این شماره در این فاصله برای حساب دیگری ثبت شده است."
          : response.status === 503 ? "تأیید فعلاً در دسترس نیست."
          : "کد معتبر نیست یا فرصت تلاش به پایان رسیده است.");
        return;
      }
      setPhase("phone");
      setPhoneInput("");
      setPhoneNumber("");
      setCode("");
      setNotice("شمارهٔ همراه با موفقیت تغییر کرد.");
      router.refresh();
    } catch {
      setError("ارتباط برقرار نشد؛ وضعیت تغییر شماره را دوباره بررسی کنید.");
    } finally {
      setBusy(false);
    }
  }

  return <section className="space-y-4 rounded-2xl border border-dena-border bg-dena-bg p-5" aria-labelledby="student-phone-change-title">
    <div>
      <h3 id="student-phone-change-title" className="font-extrabold text-dena-deep">تغییر شماره همراه</h3>
      <p className="mt-1 text-sm leading-7 text-dena-muted">
        شمارهٔ جدید فقط پس از تأیید کد یک‌بارمصرف روی همان شماره ثبت می‌شود.
      </p>
    </div>
    {phase === "phone" ? <form onSubmit={(event) => void requestCode(event)} className="flex flex-wrap items-end gap-3">
      <label className="min-w-[220px] flex-1 text-sm font-bold text-dena-deep" htmlFor="student-new-phone">
        شمارهٔ جدید
        <input id="student-new-phone" type="tel" inputMode="tel" autoComplete="tel" dir="ltr"
          value={phoneInput} onChange={(event) => setPhoneInput(event.target.value)} disabled={busy}
          placeholder="09121234567"
          className="mt-1 min-h-11 w-full rounded-xl border border-dena-border bg-white px-3 text-left font-normal outline-none focus:border-dena-brand" />
      </label>
      <button type="submit" disabled={busy}
        className="min-h-11 rounded-xl bg-dena-brand px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
        {busy ? "در حال ارسال…" : "ارسال کد تأیید"}
      </button>
    </form> : <form onSubmit={verifyCode} className="flex flex-wrap items-end gap-3">
      <div className="min-w-[220px] flex-1">
        <p className="text-xs text-dena-muted" dir="ltr">{phoneNumber}</p>
        <label className="mt-1 block text-sm font-bold text-dena-deep" htmlFor="student-phone-change-code">کد یک‌بارمصرف</label>
        <input id="student-phone-change-code" type="text" inputMode="numeric" autoComplete="one-time-code"
          dir="ltr" value={code} onChange={(event) => setCode(event.target.value)} disabled={busy}
          maxLength={8} className="mt-1 min-h-11 w-full rounded-xl border border-dena-border bg-white px-3 text-left font-normal outline-none focus:border-dena-brand" />
      </div>
      <button type="submit" disabled={busy}
        className="min-h-11 rounded-xl bg-dena-brand px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
        {busy ? "در حال بررسی…" : "تأیید و ثبت شماره"}
      </button>
      <button type="button" onClick={() => void requestCode()} disabled={busy}
        className="min-h-11 rounded-xl border border-dena-brand bg-white px-4 py-2 text-sm font-bold text-dena-brand disabled:opacity-50">
        ارسال دوبارهٔ کد
      </button>
      <button type="button" onClick={() => { setPhase("phone"); setError(""); setNotice(""); }} disabled={busy}
        className="min-h-11 rounded-xl px-3 py-2 text-sm font-bold text-dena-muted disabled:opacity-50">
        تغییر شمارهٔ واردشده
      </button>
    </form>}
    {error && <p role="alert" className="text-sm leading-6 text-red-700">{error}</p>}
    {notice && <p role="status" className="text-sm leading-6 text-dena-muted">{notice}</p>}
  </section>;
}
