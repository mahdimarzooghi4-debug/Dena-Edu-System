"use client";

import { useRef, useState, type ChangeEvent, type ClipboardEvent, type FormEvent } from "react";
import Link from "next/link";
import { normalizeDigits, normalizeIranMobile } from "@/lib/phone-number";

type Phase = "intro" | "phone" | "code" | "success";

function maskedPhone(value: string) {
  const national = value.replace(/^\+98/, "0");
  const masked = national.slice(0, 4) + "***" + national.slice(-3);
  return masked.replace(/\d/g, (digit) => "۰۱۲۳۴۵۶۷۸۹"[Number(digit)] ?? digit);
}

function normalizedPhone(value: string) {
  const digits = normalizeDigits(value).replace(/[\s-]/g, "");
  return normalizeIranMobile(digits.startsWith("9") && digits.length === 10 ? "+98" + digits : digits);
}

function Stepper({ active }: { active: 1 | 2 | 3 }) {
  const steps = ["شروع", "شماره جدید", "تأیید نهایی"];
  return (
    <ol className="mb-7 flex items-center justify-center gap-2" aria-label="مراحل تغییر شماره">
      {steps.map((label, index) => {
        const number = index + 1;
        const selected = number <= active;
        return (
          <li key={label} className="flex items-center gap-2">
            <span className={"grid size-5 place-items-center rounded-full text-[10px] font-bold " + (selected ? "bg-dena-brand text-white" : "bg-dena-bg text-dena-muted")}>{number.toLocaleString("fa-IR")}</span>
            <span className={"whitespace-nowrap text-[11px] " + (selected ? "font-bold text-dena-deep" : "text-dena-muted")}>{label}</span>
            {index < steps.length - 1 && <span aria-hidden="true" className={"h-px w-5 " + (number < active ? "bg-dena-brand" : "bg-dena-border")} />}
          </li>
        );
      })}
    </ol>
  );
}

function ShieldIcon() {
  return <svg viewBox="0 0 24 24" className="size-5 text-dena-brand" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" /><path d="m9 12 2 2 4-4" /></svg>;
}

export function StudentPhoneChangeWizard({ currentPhone }: { currentPhone: string }) {
  const [phase, setPhase] = useState<Phase>("intro");
  const [phoneInput, setPhoneInput] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const inputs = useRef<Array<HTMLInputElement | null>>([]);

  async function requestCode(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    if (busy) return;
    const normalized = normalizedPhone(phoneInput);
    if (!normalized) {
      setError("شماره موبایل را درست وارد کنید.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/student/profile/phone-change/request", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber: normalized }),
      });
      if (!response.ok) {
        setError(response.status === 429 ? "تعداد درخواست‌ها زیاد است؛ کمی بعد دوباره تلاش کنید."
          : response.status === 409 ? "این شماره همان شماره فعلی است یا برای حساب دیگری ثبت شده است."
          : response.status === 503 ? "ارسال کد فعلاً در دسترس نیست."
          : "درخواست تغییر شماره انجام نشد؛ وضعیت حساب را بررسی کنید.");
        return;
      }
      setPhoneNumber(normalized);
      setCode("");
      setPhase("code");
    } catch {
      setError("ارتباط برقرار نشد؛ اتصال را بررسی کنید.");
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const normalized = normalizeDigits(code).replace(/\s/g, "");
    if (!/^\d{6}$/.test(normalized)) {
      setError("کد تأیید باید شش رقم باشد.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/student/profile/phone-change/verify", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: normalized }),
      });
      if (!response.ok) {
        setError(response.status === 410 ? "زمان کد به پایان رسیده است؛ کد تازه بگیرید."
          : response.status === 409 ? "این شماره در این فاصله برای حساب دیگری ثبت شده است."
          : response.status === 503 ? "تأیید فعلاً در دسترس نیست."
          : "کد معتبر نیست یا فرصت تلاش به پایان رسیده است.");
        return;
      }
      setPhase("success");
    } catch {
      setError("ارتباط برقرار نشد؛ وضعیت تغییر شماره را دوباره بررسی کنید.");
    } finally {
      setBusy(false);
    }
  }

  function updateDigit(event: ChangeEvent<HTMLInputElement>, index: number) {
    const digits = normalizeDigits(event.target.value).replace(/\D/g, "");
    if (!digits) return;
    const next = code.split("");
    for (let offset = 0; offset < digits.length && index + offset < 6; offset++) next[index + offset] = digits[offset]!;
    const value = next.join("").slice(0, 6);
    setCode(value);
    inputs.current[Math.min(index + digits.length, 5)]?.focus();
    setError("");
  }

  function pasteCode(event: ClipboardEvent<HTMLInputElement>) {
    const digits = normalizeDigits(event.clipboardData.getData("text")).replace(/\D/g, "").slice(0, 6);
    if (!digits) return;
    event.preventDefault();
    setCode(digits);
    inputs.current[Math.min(digits.length, 5)]?.focus();
    setError("");
  }

  const cardClass = "w-full max-w-[390px] rounded-[22px] border border-dena-border bg-white px-5 py-6 sm:px-6";

  return (
    <div className="flex min-h-[calc(100dvh-150px)] items-center justify-center py-4">
      <section className={cardClass} aria-labelledby="phone-change-title">
        {phase !== "success" ? (
          <>
            <Stepper active={phase === "intro" ? 1 : phase === "phone" ? 2 : 3} />
            {phase === "intro" && (
              <>
                <div className="flex items-center justify-center gap-2">
                  <h2 id="phone-change-title" className="text-lg font-extrabold text-dena-deep">تغییر شماره موبایل</h2>
                  <ShieldIcon />
                </div>
                <p className="mt-3 text-center text-sm leading-7 text-dena-muted">شماره موبایل شما به‌عنوان شناسه ورود به حساب دنا استفاده می‌شود. برای تغییر آن، مراحل تأیید هویت را طی کنید.</p>
                <div className="mt-6 flex min-h-12 items-center justify-between rounded-xl border border-dena-border bg-dena-bg px-3 text-sm">
                  <span className="text-dena-muted">شماره فعلی شما</span>
                  <strong dir="ltr" className="text-dena-deep">{maskedPhone(currentPhone)}</strong>
                </div>
                <button type="button" onClick={() => { setPhase("phone"); setError(""); }} className="mt-6 min-h-12 w-full rounded-xl bg-dena-brand px-4 text-sm font-bold text-white hover:opacity-95">شروع فرآیند تغییر</button>
                <Link href="/student/profile" className="mt-3 flex min-h-8 items-center justify-center gap-1 text-sm text-dena-muted hover:text-dena-brand">بازگشت به پروفایل <span aria-hidden="true">‹</span></Link>
              </>
            )}
            {phase === "phone" && (
              <>
                <h2 id="phone-change-title" className="text-center text-lg font-extrabold text-dena-deep">شماره موبایل جدید</h2>
                <p className="mt-3 text-center text-sm leading-7 text-dena-muted">شماره موبایل جدید خود را وارد کنید. کد تأیید به این شماره ارسال خواهد شد.</p>
                <form onSubmit={(event) => void requestCode(event)} className="mt-6">
                  <label htmlFor="new-student-phone" className="block text-sm font-bold text-dena-deep">شماره موبایل جدید</label>
                  <div className="mt-2 flex min-h-12 items-center gap-2 rounded-xl border border-dena-brand px-3">
                    <span className="text-sm font-bold text-dena-brand" dir="ltr">+۹۸</span>
                    <input id="new-student-phone" type="tel" inputMode="tel" autoComplete="tel-national" dir="ltr" value={phoneInput} onChange={(event) => { setPhoneInput(event.target.value); setError(""); }} placeholder="۹۱۲۳۴۵۶۷۸۹" disabled={busy} className="min-w-0 flex-1 bg-transparent text-left text-sm font-bold text-dena-deep outline-none placeholder:text-dena-muted" />
                    <svg viewBox="0 0 24 24" className="size-5 text-dena-brand" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><rect x="6" y="2" width="12" height="20" rx="2" /><path d="M11 18h2" /></svg>
                  </div>
                  <button type="submit" disabled={busy} className="mt-6 min-h-12 w-full rounded-xl bg-dena-brand px-4 text-sm font-bold text-white disabled:opacity-60">{busy ? "در حال ارسال…" : "ارسال کد تأیید"}</button>
                  <button type="button" onClick={() => { setPhase("intro"); setError(""); }} className="mt-3 min-h-8 w-full text-sm text-dena-muted">انصراف</button>
                </form>
              </>
            )}
            {phase === "code" && (
              <>
                <h2 id="phone-change-title" className="text-center text-lg font-extrabold text-dena-deep">تأیید شماره جدید</h2>
                <p className="mt-3 text-center text-sm leading-7 text-dena-muted">کد تأیید ۶ رقمی ارسال‌شده به <strong dir="ltr" className="text-dena-deep">{maskedPhone(phoneNumber)}</strong> را وارد کنید.</p>
                <form onSubmit={(event) => void verifyCode(event)} className="mt-6">
                  <div dir="ltr" className="flex justify-center gap-1.5 sm:gap-2" aria-label="کد شش رقمی">
                    {Array.from({ length: 6 }, (_, index) => (
                      <input key={index} ref={(element) => { inputs.current[index] = element; }} type="text" inputMode="numeric" autoComplete={index === 0 ? "one-time-code" : "off"} aria-label={\`رقم \${(index + 1).toLocaleString("fa-IR")} کد\`} maxLength={1} value={code[index] ?? ""} onChange={(event) => updateDigit(event, index)} onPaste={pasteCode} onKeyDown={(event) => { if (event.key === "Backspace" && !code[index] && index > 0) inputs.current[index - 1]?.focus(); }} disabled={busy} className="size-10 rounded-lg border border-dena-border bg-white text-center text-base font-bold text-dena-deep outline-none focus:border-dena-brand focus:ring-1 focus:ring-dena-brand sm:size-11" />
                    ))}
                  </div>
                  <button type="button" onClick={() => void requestCode()} disabled={busy} className="mt-5 text-sm text-dena-muted underline underline-offset-4 disabled:opacity-60">ارسال مجدد کد</button>
                  <button type="submit" disabled={busy} className="mt-6 min-h-12 w-full rounded-xl bg-dena-brand px-4 text-sm font-bold text-white disabled:opacity-60">{busy ? "در حال تأیید…" : "تأیید و تغییر شماره"}</button>
                  <button type="button" onClick={() => { setPhase("phone"); setPhoneInput(""); setCode(""); setError(""); }} className="mt-3 min-h-8 w-full text-sm text-dena-muted">ویرایش شماره</button>
                </form>
              </>
            )}
          </>
        ) : (
          <div className="py-4 text-center">
            <div className="mx-auto grid size-14 place-items-center rounded-full bg-emerald-50 text-emerald-600"><svg viewBox="0 0 24 24" className="size-7" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="m8 12 2.5 2.5L16.5 9" /></svg></div>
            <h2 id="phone-change-title" className="mt-5 text-lg font-extrabold text-dena-deep">تغییر شماره با موفقیت انجام شد</h2>
            <p className="mt-3 text-sm leading-7 text-dena-muted">از این پس با شماره جدید <strong dir="ltr" className="text-dena-deep">{maskedPhone(phoneNumber)}</strong> وارد حساب خود شوید.</p>
            <Link href="/student/profile" className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-dena-brand px-4 text-sm font-bold text-white hover:opacity-95">بازگشت به پروفایل</Link>
          </div>
        )}
        {error && <p role="alert" className="mt-4 text-center text-sm leading-6 text-red-700">{error}</p>}
      </section>
    </div>
  );
}
