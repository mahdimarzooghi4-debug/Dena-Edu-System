"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Button } from "../ui/button";

// This UI does not read file bytes or offer direct-upload grants. In particular,
// do not hash a multi-GiB File with crypto.subtle.digest: it buffers the whole
// file in the browser. The provider supplies size + independently calculated
// whole-file SHA-256 metadata until a streaming, reviewed adapter is connected.
type Plan = {
  uploadId: string; title: string;
  status: "planned" | "expired" | "cancelled";
  expectedBytes: number; expectedSha256: string;
  expiresAt: string; cancelledAt: string | null;
};
type NewPlan = {
  uploadId: string; status: Plan["status"];
  replayed: boolean; expiresAt: string;
  plan: { key: string; parts: { partNumber: number; bytes: number }[];
    ttlSeconds: number } | null;
};
const MIN_BYTES = 16 * 1024 * 1024 + 1;
const MAX_BYTES = 5 * 1024 * 1024 * 1024;
const shaPattern = /^[0-9a-f]{64}$/;
const stateLabels = {
  planned: "طرح فعال؛ بدون انتقال فایل",
  expired: "منقضی‌شده؛ نیازمند درخواست تازه",
  cancelled: "لغوشده؛ بدون مجوز آپلود",
} as const;
const digits = new Intl.NumberFormat("fa-IR");
function numberText(value: number) {
  return digits.format(value);
}

export function MultipartPlanningForm({
  courseId, canCreate,
}: { courseId: string; canCreate: boolean }) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [title, setTitle] = useState("");
  const [size, setSize] = useState("");
  const [sha256, setSha256] = useState("");
  const [recent, setRecent] = useState<NewPlan | null>(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const requestId = useRef<string | null>(null);
  const path = `/api/provider/courses/${encodeURIComponent(courseId)}/multipart-plans`;

  async function refresh() {
    const response = await fetch(path, {
      credentials: "same-origin", cache: "no-store",
    });
    if (!response.ok) throw new Error("plan_list_unavailable");
    const body = await response.json() as { plans: Plan[] };
    setPlans(body.plans);
  }

  useEffect(() => {
    const controller = new AbortController();
    void fetch(path, {
      credentials: "same-origin", cache: "no-store",
      signal: controller.signal,
    }).then(async response => {
      if (!response.ok) throw new Error("plan_list_unavailable");
      return response.json() as Promise<{ plans: Plan[] }>;
    }).then(body => {
      if (!controller.signal.aborted) setPlans(body.plans);
    }).catch(() => {
      if (!controller.signal.aborted) {
        setProblem("فهرست طرح‌های آپلود در دسترس نیست.");
      }
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, [path]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !canCreate) return;
    setProblem(""); setNotice("");
    const expectedBytes = Number(size);
    const digest = sha256.trim().toLowerCase();
    if (!Number.isSafeInteger(expectedBytes) ||
        expectedBytes < MIN_BYTES || expectedBytes > MAX_BYTES ||
        !shaPattern.test(digest)) {
      setProblem("اندازه باید بیش از ۱۶ MiB و حداکثر ۵ GiB، و SHA-256 شامل ۶۴ رقم هگز باشد.");
      return;
    }
    requestId.current ??= crypto.randomUUID();
    setBusy(true);
    try {
      const response = await fetch(path, {
        method: "POST", credentials: "same-origin", cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(), clientRequestId: requestId.current,
          expectedBytes, sha256: digest,
        }),
      });
      if (!response.ok) {
        setProblem(response.status === 409
          ? "مشخصات شناسهٔ قبلی متفاوت است یا سهمیهٔ دوره پر شده؛ اطلاعات را بررسی کنید."
          : response.status === 503
            ? "برنامه‌ریزی در این محیط فعال نیست."
            : "طرح ثبت نشد؛ پیش‌نویس بودن دوره و مجوز مستقل مؤسسه را بررسی کنید.");
        return;
      }
      const result = await response.json() as NewPlan;
      setRecent(result);
      requestId.current = null;
      await refresh();
      setNotice(result.status === "planned"
        ? "فقط طرح و اندازهٔ بخش‌ها ثبت شد. هنوز هیچ فایلی آپلود نشده است."
        : "این درخواست قبلاً خاتمه یافته است؛ شناسهٔ تازه لازم است.");
    } catch {
      setProblem("ارتباط قطع شد؛ با همین مشخصات دوباره اقدام کنید تا طرح تکراری ساخته نشود.");
    } finally {
      setBusy(false);
    }
  }

  async function cancel(uploadId: string) {
    if (busy) return;
    setBusy(true); setProblem(""); setNotice("");
    try {
      const response = await fetch(
        `${path}/${encodeURIComponent(uploadId)}/cancel`, {
          method: "POST", credentials: "same-origin", cache: "no-store",
          headers: { "Content-Type": "application/json" },
          body: "{}",
        },
      );
      if (!response.ok) {
        setProblem("لغو ممکن نشد؛ عضویت فعال ارائه‌دهنده و وضعیت طرح را بررسی کنید.");
        return;
      }
      const body = await response.json() as { status: Plan["status"] };
      await refresh();
      setRecent(current => current?.uploadId === uploadId ? null : current);
      setNotice(body.status === "expired"
        ? "طرح قبلاً منقضی شده است؛ طرح تازه با شناسهٔ جدید ثبت کنید."
        : "طرح لغو شد. هیچ انتقال فایل یا حذف فایل ذخیره‌شده‌ای انجام نشد.");
    } catch {
      setProblem("نتیجهٔ لغو مشخص نیست؛ فهرست را به‌روزرسانی و دوباره بررسی کنید.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-7">
      <div className="rounded-xl border border-dena-border bg-dena-bg p-4 text-sm leading-8">
        <p className="font-extrabold text-dena-deep">فقط برنامه‌ریزی؛ آپلود واقعی فعال نیست</p>
        <p>
          این بخش برای آزمایش مسیر آیندهٔ ویدئوهای حجیم است. اندازه و SHA-256
          کل فایل را وارد کنید؛ هیچ فایلی انتخاب، منتقل، اسکن یا منتشر نمی‌شود.
          کلید قرنطینه در طرح، URL یا مجوز دسترسی به فضای ذخیره‌سازی نیست.
        </p>
      </div>
      {canCreate
        ? <form className="space-y-5" onSubmit={submit}>
          <label htmlFor="multipart-plan-title" className="block text-sm font-bold">
            عنوان طرح ویدئوی حجیم
            <input id="multipart-plan-title" value={title} required
              minLength={3} maxLength={160}
              onChange={event => { setTitle(event.target.value); requestId.current = null; }}
              className="mt-2 min-h-12 w-full rounded-xl border border-dena-border px-4" />
          </label>
          <label htmlFor="multipart-plan-size" className="block text-sm font-bold">
            اندازهٔ دقیق کل فایل (بایت)
            <input id="multipart-plan-size" type="number" inputMode="numeric"
              min={MIN_BYTES} max={MAX_BYTES} step={1} required value={size}
              onChange={event => { setSize(event.target.value); requestId.current = null; }}
              className="mt-2 min-h-12 w-full rounded-xl border border-dena-border px-4" />
          </label>
          <label htmlFor="multipart-plan-sha" className="block text-sm font-bold">
            SHA-256 کل فایل (۶۴ رقم هگز)
            <input id="multipart-plan-sha" required minLength={64} maxLength={64}
              spellCheck={false} autoComplete="off" dir="ltr"
              value={sha256} onChange={event => {
                setSha256(event.target.value); requestId.current = null;
              }} placeholder="0123456789abcdef…"
              className="mt-2 min-h-12 w-full rounded-xl border border-dena-border px-4 text-left font-mono text-xs" />
          </label>
          <p className="text-xs leading-7 text-dena-muted">
            برای به‌دست آوردن هش کامل فایل می‌توان از فرمان
            <code dir="ltr" className="mx-1 inline-block rounded bg-dena-bg px-2">
              sha256sum video.mp4
            </code>
            در Linux یا macOS با
            <code dir="ltr" className="mx-1 inline-block rounded bg-dena-bg px-2">
              shasum -a 256 video.mp4
            </code>
            استفاده کرد. هش را از محتوای کامل فایل محاسبه کنید، نه از نام آن.
          </p>
          <Button type="submit" disabled={busy} className="w-full disabled:opacity-50">
            {busy ? "در حال ثبت طرح…" : "ثبت طرح بدون آپلود فایل"}
          </Button>
        </form>
        : <p role="note" className="text-sm leading-8 text-dena-muted">
          ساخت طرح جدید فقط برای دورهٔ پیش‌نویس با تأیید مؤسسه مجاز است.
          طرح‌های قبلی خود را همچنان می‌توانید مشاهده و لغو کنید.
        </p>}
      <div role="status" aria-live="polite" className="text-sm leading-7">
        {problem && <p className="text-red-700">{problem}</p>}
        {!problem && notice && <p className="text-dena-deep">{notice}</p>}
      </div>
      {recent?.status === "planned" && recent.plan && (
        <section className="rounded-xl border border-dena-border p-4"
          aria-labelledby="multipart-plan-summary">
          <h3 id="multipart-plan-summary" className="font-extrabold">
            خلاصهٔ طرح؛ نه مجوز آپلود
          </h3>
          <p className="mt-2 text-sm">
            تعداد بخش‌ها: {numberText(recent.plan.parts.length)}
          </p>
          <p className="mt-2 text-sm">
            اندازهٔ بخش اول: {numberText(recent.plan.parts[0].bytes)} بایت
          </p>
          <p className="mt-2 text-sm">
            عمر پیشنهادی مجوز آینده: {numberText(recent.plan.ttlSeconds)} ثانیه
          </p>
          <p className="mt-2 text-sm">
            مهلت طرح: <time dateTime={recent.expiresAt}>
              {new Date(recent.expiresAt).toLocaleString("fa-IR")}
            </time>
          </p>
          <p className="mt-2 break-all text-xs" dir="ltr">
            {recent.plan.key}
          </p>
        </section>
      )}
      <section className="border-t border-dena-border pt-6"
        aria-labelledby="multipart-plan-list">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 id="multipart-plan-list" className="text-lg font-extrabold">
            طرح‌های ثبت‌شدهٔ شما
          </h3>
          <Button variant="outline" disabled={busy} onClick={() => void refresh()
            .catch(() => setProblem("به‌روزرسانی طرح‌ها ممکن نشد."))}>
            به‌روزرسانی طرح‌ها
          </Button>
        </div>
        {loading
          ? <p className="mt-4 text-sm text-dena-muted">در حال دریافت طرح‌ها…</p>
          : plans.length === 0
            ? <p className="mt-4 text-sm text-dena-muted">هنوز طرحی ثبت نکرده‌اید.</p>
            : <ul className="mt-4 space-y-3">
              {plans.map(item => <li key={item.uploadId}
                className="rounded-xl border border-dena-border p-4">
                <p className="font-bold">{item.title}</p>
                <p className="mt-2 text-sm">
                  اندازه: {numberText(item.expectedBytes)} بایت
                </p>
                <p className="mt-2 text-sm font-semibold text-dena-deep">
                  {stateLabels[item.status]}
                </p>
                <p className="mt-2 text-xs text-dena-muted">
                  شناسه: <bdi dir="ltr">{item.uploadId}</bdi>
                </p>
                <p className="mt-2 text-xs text-dena-muted">
                  انقضا: <time dateTime={item.expiresAt}>
                    {new Date(item.expiresAt).toLocaleString("fa-IR")}
                  </time>
                </p>
                {item.status === "planned" &&
                  <Button variant="outline" className="mt-3 disabled:opacity-50"
                    disabled={busy} onClick={() => void cancel(item.uploadId)}>
                    لغو طرح «{item.title}»
                  </Button>}
              </li>)}
            </ul>}
      </section>
    </div>
  );
}
