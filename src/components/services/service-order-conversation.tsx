"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";

type Role = "student" | "institute";
type Message = {
  id: string;
  senderUserId: string;
  senderRole: Role;
  senderName: string;
  body: string;
  createdAt: string | Date;
};
type Attachment = {
  id: string; uploadedByUserId: string; fileName: string; contentType: string;
  byteSize: number; status: string;
  createdAt: string | Date;
};

const dateFormatter = new Intl.DateTimeFormat("fa-IR", {
  timeZone: "Asia/Tehran", dateStyle: "short", timeStyle: "short",
});

export function ServiceOrderConversation({
  orderId, orderTitle, viewerRole, viewerUserId, initialMessages,
  initialAttachments, uploadAvailable,
}: {
  orderId: string; orderTitle: string; viewerRole: Role; viewerUserId: string;
  initialMessages: Message[];
  initialAttachments: Attachment[]; uploadAvailable: boolean;
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [attachments, setAttachments] = useState(initialAttachments);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  // Reuse the same UUID after an uncertain network acknowledgement; a retry
  // must never produce two messages from one user's submission.
  const pendingSend = useRef<{ body: string; key: string } | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const conversationUrl = `/api/service-orders/${encodeURIComponent(orderId)}/messages`;
  const attachmentsUrl = `/api/service-orders/${encodeURIComponent(orderId)}/attachments`;

  const refresh = useCallback(async () => {
    try {
      const response = await fetch(conversationUrl, { credentials: "same-origin", cache: "no-store" });
      if (!response.ok) return;
      const data = await response.json() as { conversation?: { messages?: Message[] } };
      if (data.conversation?.messages) setMessages(data.conversation.messages);
    } catch { /* Keep the last readable conversation during transient disconnects. */ }
  }, [conversationUrl]);

  const refreshAttachments = useCallback(async () => {
    try {
      const response = await fetch(attachmentsUrl, { credentials: "same-origin", cache: "no-store" });
      if (!response.ok) return;
      const data = await response.json() as { attachments?: Attachment[] };
      if (data.attachments) setAttachments(data.attachments);
    } catch { /* Keep the last readable file list during transient disconnects. */ }
  }, [attachmentsUrl]);

  useEffect(() => {
    const timer = window.setInterval(() => { void refresh(); void refreshAttachments(); }, 15_000);
    return () => window.clearInterval(timer);
  }, [refresh, refreshAttachments]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [messages]);

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = body.trim();
    if (!message || busy) return;
    setBusy(true);
    setError("");
    const pending = pendingSend.current?.body === message
      ? pendingSend.current
      : { body: message, key: crypto.randomUUID() };
    pendingSend.current = pending;
    try {
      const response = await fetch(conversationUrl, {
        method: "POST", credentials: "same-origin", cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: message, idempotencyKey: pending.key }),
      });
      await response.json().catch(() => null);
      if (!response.ok) {
        setError(response.status === 429 ? "تعداد پیام‌ها زیاد است؛ کمی بعد دوباره تلاش کنید."
          : response.status === 409 ? "این شناسه ارسال قبلاً با متن متفاوت استفاده شده است."
          : "پیام ارسال نشد؛ وضعیت دسترسی را بررسی کنید.");
        return;
      }
      pendingSend.current = null;
      setBody("");
      await refresh();
    } catch {
      setError("ارتباط برقرار نشد؛ پیام را دوباره ارسال کنید.");
    } finally {
      setBusy(false);
    }
  }

  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (uploading || !uploadAvailable) return;
    const form = event.currentTarget;
    const input = form.elements.namedItem("files");
    if (!(input instanceof HTMLInputElement) || !input.files?.length) return;
    setUploading(true);
    setError("");
    try {
      const data = new FormData();
      for (const file of Array.from(input.files)) data.append("files", file);
      const response = await fetch(attachmentsUrl, {
        method: "POST", credentials: "same-origin", cache: "no-store", body: data,
      });
      if (!response.ok) {
        setError(response.status === 503 ? "ذخیره‌سازی امن یا اسکن فایل در این محیط تنظیم نشده است." :
          response.status === 413 ? "حجم فایل‌ها بیش از حد مجاز است." : "فایل ارسال نشد؛ نوع و حجم فایل را بررسی کنید.");
        return;
      }
      form.reset();
      await refreshAttachments();
    } catch {
      setError("ارتباط برقرار نشد؛ بارگذاری فایل را دوباره امتحان کنید.");
    } finally {
      setUploading(false);
    }
  }

  return <section aria-label="گفت‌وگوی امن درخواست خدمت" className="mx-auto w-full max-w-3xl overflow-hidden rounded-2xl border border-dena-border bg-white shadow-sm">
    <header className="border-b border-dena-border bg-dena-lavender p-4 sm:p-5">
      <p className="text-xs font-bold text-dena-brand">{viewerRole === "student" ? "پیام امن به مؤسسه" : "گفت‌وگو با دانش‌آموز"}</p>
      <h2 className="mt-1 text-lg font-extrabold text-dena-deep">{orderTitle}</h2>
      <p className="mt-2 text-xs leading-6 text-dena-muted">گفت‌وگو در دنا نگهداری می‌شود؛ شماره تماس و ایمیل شخصی نمایش داده نمی‌شود.</p>
    </header>
    <div className="max-h-[58vh] min-h-64 space-y-3 overflow-y-auto bg-dena-bg p-4 sm:p-5" aria-live="polite">
      {messages.length === 0 ? <div className="rounded-xl border border-dashed border-dena-line bg-white p-5 text-center">
        <p className="font-bold text-dena-deep">هنوز پیامی در این گفت‌وگو نیست.</p>
        <p className="mt-2 text-sm leading-6 text-dena-muted">برای هماهنگی دربارهٔ همین خدمت، پیام امن بفرستید.</p>
      </div> : messages.map((message) => {
        const own = message.senderUserId === viewerUserId;
        const date = message.createdAt instanceof Date ? message.createdAt : new Date(message.createdAt);
        return <article key={message.id} className={`flex ${own ? "justify-start" : "justify-end"}`}>
          <div className={`max-w-[88%] rounded-2xl px-4 py-3 ${own ? "rounded-tr-sm bg-white text-dena-deep" : "rounded-tl-sm bg-dena-brand text-white"}`}>
            <p className={`mb-1 text-[11px] font-bold ${own ? "text-dena-brand" : "text-white/80"}`}>
              {own ? "شما" : message.senderRole === "institute" ? "نماینده مؤسسه" : "دانش‌آموز"}
            </p>
            <p className="whitespace-pre-wrap break-words text-sm leading-7">{message.body}</p>
            <time dateTime={date.toISOString()} className={`mt-1 block text-[10px] ${own ? "text-dena-muted" : "text-white/75"}`}>
              {dateFormatter.format(date)}
            </time>
          </div>
        </article>;
      })}
      <div ref={endRef} />
    </div>
    <section aria-label="فایل‌های مشترک" className="space-y-3 border-t border-dena-border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-bold text-dena-deep">فایل‌های مشترک</h3>
        <span className="rounded-full bg-dena-lavender px-3 py-1 text-xs font-bold text-dena-brand">{attachments.length.toLocaleString("fa-IR")} فایل</span>
      </div>
      {attachments.length === 0 ? <p className="rounded-xl bg-dena-bg p-3 text-sm text-dena-muted">هنوز فایلی در این گفت‌وگو به‌اشتراک گذاشته نشده است.</p> :
        <ul className="space-y-2">
          {attachments.map((file) => <li key={file.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dena-border bg-white p-3">
            <div className="min-w-0"><p className="truncate text-sm font-bold text-dena-deep">{file.fileName}</p>
              <p className="mt-1 text-xs text-dena-muted">{(file.byteSize / 1024).toLocaleString("fa-IR", { maximumFractionDigits: 0 })} کیلوبایت · {file.status === "ready" ? "اسکن تأیید شد" : file.status === "rejected" ? "فایل تأیید نشد" : file.status === "failed" ? "بارگذاری ناموفق" : "در حال بررسی امنیتی"}</p>
            </div>
            {file.status === "ready" && <a href={`${attachmentsUrl}/${encodeURIComponent(file.id)}`} className="min-h-9 rounded-lg border border-dena-brand px-3 py-2 text-xs font-bold text-dena-brand">دریافت فایل</a>}
          </li>)}
        </ul>}
      <form onSubmit={upload} className="flex flex-wrap items-center gap-2">
        <label className="flex min-h-10 flex-1 cursor-pointer items-center rounded-lg border border-dena-line bg-white px-3 py-2 text-xs text-dena-muted">
          <span className="sr-only">انتخاب PDF یا تصویر</span>
          <input name="files" type="file" multiple accept="application/pdf,image/jpeg,image/png" disabled={!uploadAvailable || uploading}
            className="w-full text-xs file:me-3 file:rounded-lg file:border-0 file:bg-dena-lavender file:px-3 file:py-2 file:font-bold file:text-dena-brand disabled:opacity-50" />
        </label>
        <button type="submit" disabled={!uploadAvailable || uploading} className="min-h-10 rounded-lg bg-dena-brand px-4 py-2 text-xs font-bold text-white disabled:opacity-50">
          {uploading ? "در حال بارگذاری…" : "اشتراک‌گذاری فایل"}
        </button>
      </form>
      <p className="text-xs leading-6 text-dena-muted">PDF و تصویر JPG/PNG تا ۱۰ مگابایت؛ دریافت پس از تأیید اسکن امنیتی فعال می‌شود.</p>
      {!uploadAvailable && <p className="text-xs font-semibold text-amber-800">ذخیره‌سازی امن یا اسکن فایل در این محیط تنظیم نشده است.</p>}
    </section>
    <form onSubmit={send} className="space-y-2 border-t border-dena-border p-3 sm:p-4">
      <label className="sr-only" htmlFor="service-order-message">متن پیام</label>
      <textarea id="service-order-message" value={body} onChange={(event) => setBody(event.target.value)}
        maxLength={4000} rows={3} disabled={busy} placeholder="پیام خود را بنویسید…"
        className="w-full resize-y rounded-xl border border-dena-line bg-white p-3 text-sm leading-7 text-dena-ink outline-none focus:border-dena-brand focus:ring-2 focus:ring-dena-brand/20 disabled:opacity-60" />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-dena-muted">فقط اعضای همین درخواست خدمت به گفت‌وگو دسترسی دارند.</p>
        <button type="submit" disabled={busy || !body.trim()} className="min-h-10 rounded-xl bg-dena-brand px-5 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">
          {busy ? "در حال ارسال…" : "ارسال پیام"}
        </button>
      </div>
      {error && <p role="alert" className="text-sm font-semibold text-red-700">{error}</p>}
    </form>
  </section>;
}
