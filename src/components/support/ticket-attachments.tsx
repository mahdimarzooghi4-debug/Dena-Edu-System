"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "../ui/button";

export type TicketAttachmentInfo = {
  id: string;
  fileName: string;
  contentType: string;
  byteSize: number;
  status: string;
  createdAt: Date;
};

const statusLabels: Record<string, string> = {
  uploading: "در حال بارگذاری",
  quarantined: "در انتظار بررسی امنیتی",
  failed: "بارگذاری انجام نشد",
  ready: "آمادهٔ دریافت",
  rejected: "فایل از بررسی امنیتی عبور نکرد",
};

function sizeLabel(bytes: number) {
  return `${new Intl.NumberFormat("fa-IR").format(Math.ceil(bytes / 1024))} کیلوبایت`;
}

export function TicketAttachments({
  ticketId,
  attachments,
  uploadAvailable,
  remainingSlots,
}: {
  ticketId: string;
  attachments: TicketAttachmentInfo[];
  uploadAvailable: boolean;
  remainingSlots: number;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/support/tickets/${ticketId}/attachments`, {
        method: "POST",
        body: new FormData(formElement),
      });
      if (!response.ok) throw new Error();
      formElement.reset();
      setNotice("فایل‌ها در قرنطینه ثبت شدند و تا تأیید اسکن قابل دریافت نیستند.");
      router.refresh();
    } catch {
      setError("پیوست ثبت نشد؛ نوع فایل، حجم و اتصال امن را بررسی کنید.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby="ticket-attachments-heading" className="space-y-4">
      <div>
        <h2 id="ticket-attachments-heading" className="text-lg font-bold">پیوست‌های تیکت</h2>
        <p className="mt-1 text-xs leading-6 text-dena-muted">
          فقط PDF، JPG و PNG تا ۱۰ مگابایت؛ حداکثر ۳ فایل برای هر تیکت. فایل خصوصی تا تأیید اسکن قابل دریافت نیست.
        </p>
      </div>
      {attachments.length > 0 && (
        <ul className="space-y-2">
          {attachments.map((attachment) => (
            <li key={attachment.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dena-border bg-white p-3">
              <div>
                <p className="text-sm font-semibold">{attachment.fileName}</p>
                <p className="mt-1 text-xs text-dena-muted">
                  {sizeLabel(attachment.byteSize)} · {statusLabels[attachment.status] ?? "نامشخص"}
                </p>
              </div>
              {attachment.status === "ready" && (
                <a href={`/api/support/tickets/${ticketId}/attachments/${attachment.id}`}
                  className="rounded-lg border border-dena-border px-3 py-2 text-xs font-bold text-dena-brand hover:bg-dena-bg">
                  دریافت فایل
                </a>
              )}
            </li>
          ))}
        </ul>
      )}
      {!uploadAvailable ? (
        <p className="rounded-xl bg-dena-bg p-3 text-sm leading-7 text-dena-muted">
          آپلود تا اتصال مخزن خصوصی و سرویس اسکن امن غیرفعال است.
        </p>
      ) : remainingSlots <= 0 ? (
        <p className="text-sm text-dena-muted">سقف ۳ پیوست این تیکت پر شده است.</p>
      ) : (
        <form onSubmit={submit} className="space-y-3">
          <label className="block space-y-2 text-sm font-semibold">
            <span>انتخاب فایل (حداکثر {remainingSlots} فایل دیگر)</span>
            <input name="files" type="file" required multiple
              accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
              className="block w-full rounded-xl border border-dena-border bg-white p-3" />
          </label>
          {notice && <p role="status" className="text-sm text-green-800">{notice}</p>}
          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
          <Button type="submit" disabled={busy}>
            {busy ? "در حال بارگذاری…" : "بارگذاری خصوصی"}
          </Button>
        </form>
      )}
    </section>
  );
}
