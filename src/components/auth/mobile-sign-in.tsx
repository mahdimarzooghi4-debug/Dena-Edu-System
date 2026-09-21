"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "../ui/button";
import { normalizeDigits, normalizeIranMobile } from "../../lib/phone-number";

type Stage = "phone" | "code";
type Submission = "idle" | "busy";

async function apiPost(url: string, body: object): Promise<Response> {
  return fetch(url, {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
}

function explain(status: number, stage: Stage): string {
  if (status === 429) return "تعداد درخواست‌ها بیش از حد مجاز است. کمی بعد دوباره تلاش کنید.";
  if (status === 503 || status >= 500) return "این خدمت در حال حاضر در دسترس نیست.";
  if (stage === "code") return "کد واردشده معتبر نیست یا زمان آن به پایان رسیده است.";
  return "شماره واردشده پذیرفته نشد. شماره موبایل ایرانی خود را بررسی کنید.";
}

export function MobileSignIn({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("phone");
  const [submission, setSubmission] = useState<Submission>("idle");
  const [inputPhone, setInputPhone] = useState("");
  const [canonicalPhone, setCanonicalPhone] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function submitPhone(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!enabled || submission === "busy") return;
    setError("");
    setNotice("");
    const mobile = normalizeIranMobile(inputPhone);
    if (!mobile) {
      setError("شماره موبایل ایرانی را مانند ۰۹۱۲۱۲۳۴۵۶۷ وارد کنید.");
      return;
    }
    setSubmission("busy");
    try {
      const response = await apiPost("/api/auth/phone-number/send-otp", {
        phoneNumber: mobile,
      });
      if (!response.ok) {
        setError(explain(response.status, "phone"));
        return;
      }
      setCanonicalPhone(mobile);
      setCode("");
      setStage("code");
      setNotice("کد تأیید برای شماره واردشده درخواست شد.");
    } catch {
      setError("ارتباط برقرار نشد. اتصال خود را بررسی کنید.");
    } finally {
      setSubmission("idle");
    }
  }

  async function submitCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!enabled || submission === "busy") return;
    setError("");
    setNotice("");
    const normalizedCode = normalizeDigits(code).replace(/\s/g, "");
    if (!/^\d{6}$/.test(normalizedCode)) {
      setError("کد تأیید باید شش رقم باشد.");
      return;
    }
    setSubmission("busy");
    try {
      const verified = await apiPost("/api/auth/phone-number/verify", {
        phoneNumber: canonicalPhone,
        code: normalizedCode,
      });
      if (!verified.ok) {
        setError(explain(verified.status, "code"));
        return;
      }

      // A verified session is not equivalent to being authorized for any role.
      // Check persisted memberships first; only new users enter student onboarding.
      const actor = await fetch("/api/access/me", {
        credentials: "same-origin", cache: "no-store",
      });
      if (actor.status === 401) {
        const onboard = await apiPost("/api/access/onboard", {});
        if (!onboard.ok) {
          setError("ورود انجام شد، اما دسترسی دانش‌آموزی قابل فعال‌سازی نیست. با پشتیبانی تماس بگیرید.");
          return;
        }
      } else if (!actor.ok) {
        setError("تأیید دسترسی کامل نشد. دوباره تلاش کنید.");
        return;
      }
      router.replace("/account");
      router.refresh();
    } catch {
      setError("ارتباط برقرار نشد. مجدداً تلاش کنید.");
    } finally {
      setSubmission("idle");
    }
  }

  const busy = submission === "busy";
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-xs font-semibold text-dena-muted" aria-label="مرحله ورود">
        <span className={stage === "phone" ? "text-dena-brand" : "text-dena-deep"}>۱. شماره موبایل</span>
        <span aria-hidden="true">←</span>
        <span className={stage === "code" ? "text-dena-brand" : ""}>۲. تأیید کد</span>
      </div>
      {!enabled && (
        <div role="status" className="rounded-xl border border-dena-border bg-dena-bg p-4 text-sm leading-7 text-dena-muted">
          ورود با پیامک در این محیط هنوز فعال نشده است. این صفحه برای آماده‌سازی و آزمون رابط کاربری در دسترس است.
        </div>
      )}
      {stage === "phone" ? (
        <form onSubmit={submitPhone} className="space-y-5" noValidate>
          <div className="space-y-2">
            <label htmlFor="mobile-number" className="block text-sm font-bold">شماره موبایل</label>
            <input
              id="mobile-number"
              name="phone"
              type="tel"
              autoComplete="tel"
              inputMode="tel"
              dir="ltr"
              placeholder="09121234567"
              value={inputPhone}
              onChange={(event) => setInputPhone(event.target.value)}
              disabled={!enabled || busy}
              aria-invalid={Boolean(error)}
              aria-describedby="mobile-hint"
              className="min-h-12 w-full rounded-xl border border-dena-border bg-white px-4 text-left text-base outline-none focus-visible:border-dena-brand disabled:bg-dena-bg"
              required
            />
            <p id="mobile-hint" className="text-xs leading-6 text-dena-muted">
              کد فقط برای شماره‌ای که مالک آن هستید ارسال می‌شود. نیازی به انتخاب نقش نیست.
            </p>
          </div>
          <Button type="submit" disabled={!enabled || busy} className="w-full disabled:cursor-not-allowed disabled:opacity-50">
            {busy ? "در حال ثبت درخواست…" : "دریافت کد تأیید"}
          </Button>
        </form>
      ) : (
        <form onSubmit={submitCode} className="space-y-5" noValidate>
          <p className="text-sm leading-7 text-dena-muted">
            کد شش‌رقمی ارسال‌شده به <bdi dir="ltr" className="font-semibold text-dena-ink">{canonicalPhone}</bdi> را وارد کنید.
          </p>
          <div className="space-y-2">
            <label htmlFor="sms-code" className="block text-sm font-bold">کد تأیید</label>
            <input
              id="sms-code"
              name="one-time-code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              dir="ltr"
              maxLength={6}
              pattern="[0-9۰-۹٠-٩]{6}"
              placeholder="••••••"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              disabled={busy}
              aria-invalid={Boolean(error)}
              className="min-h-12 w-full rounded-xl border border-dena-border bg-white px-4 text-center text-2xl tracking-[0.4em] outline-none focus-visible:border-dena-brand disabled:bg-dena-bg"
              required
            />
            <p className="text-xs leading-6 text-dena-muted">اعتبار کد: پنج دقیقه. درخواست دوباره مشمول محدودیت زمانی است.</p>
          </div>
          <Button type="submit" disabled={busy} className="w-full disabled:opacity-50">
            {busy ? "در حال بررسی…" : "تأیید و ورود"}
          </Button>
          <button
            type="button"
            disabled={busy}
            onClick={() => { setStage("phone"); setCode(""); setError(""); setNotice(""); }}
            className="w-full py-2 text-sm font-semibold text-dena-brand underline-offset-4 hover:underline"
          >
            ویرایش شماره موبایل
          </button>
        </form>
      )}
      <div aria-live="polite" aria-atomic="true" className="min-h-6 text-sm leading-7">
        {error && <p role="alert" className="text-red-700">{error}</p>}
        {!error && notice && <p className="text-dena-deep">{notice}</p>}
      </div>
    </div>
  );
}
