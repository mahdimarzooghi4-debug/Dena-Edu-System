"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "../ui/button";

export function ExamStatusAction({ id, role, status }: {
  id: string; role: "admin" | "institute";
  status: "draft" | "published" | "cancelled";
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  if (status === "cancelled") return <span className="text-xs text-dena-muted">لغوشده</span>;

  async function update(next: "published" | "cancelled") {
    if (busy) return;
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/" + role + "/exams/" + encodeURIComponent(id), {
        method: "PATCH", credentials: "same-origin", cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!response.ok) {
        setMessage("این تغییر اکنون ممکن نیست؛ زمان‌بندی یا وضعیت آزمون را بررسی کنید.");
        return;
      }
      router.refresh();
    } catch {
      setMessage("ارتباط با سرور برقرار نشد؛ دوباره تلاش کنید.");
    } finally { setBusy(false); }
  }
  return <div className="flex flex-wrap items-center gap-2">
    {status === "draft" && <Button disabled={busy} onClick={() => void update("published")}>
      {busy ? "در حال ثبت…" : "انتشار"}
    </Button>}
    <Button variant="outline" disabled={busy} onClick={() => void update("cancelled")}>لغو</Button>
    {message && <span role="status" className="basis-full text-xs text-dena-deep">{message}</span>}
  </div>;
}
