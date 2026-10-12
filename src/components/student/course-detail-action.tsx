"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, buttonClassName } from "../ui/button";

export function CourseDetailAction({
  courseId, enrollmentStatus,
}: { courseId: string; enrollmentStatus: "active" | "cancelled" | null }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  if (enrollmentStatus === "active") {
    return (
      <Link className={buttonClassName()}
        href={`/student/courses/${courseId}/watch`}>
        مشاهده ویدئوهای دوره
      </Link>
    );
  }
  if (enrollmentStatus === "cancelled") {
    return <p className="rounded-xl bg-dena-bg p-4 text-sm leading-8 text-dena-muted">
      ثبت‌نام این دوره قبلاً لغو شده است. این مسیر ثبت‌نام را خودکار
      بازفعال نمی‌کند؛ گردش‌کار بازگشت به دوره هنوز عملیاتی نشده است.
    </p>;
  }

  async function enroll() {
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(
        `/api/student/courses/${courseId}/enroll`, {
          method: "POST",
          credentials: "same-origin", cache: "no-store",
          headers: { "Content-Type": "application/json" },
          body: "{}",
        },
      );
      if (!response.ok) {
        setMessage(response.status === 404
          ? "دوره دیگر برای ثبت‌نام در دسترس نیست؛ وضعیت آن را دوباره بررسی کنید."
          : response.status === 409
            ? "ثبت‌نام قبلی لغو شده و از این مسیر بازفعال نمی‌شود."
            : "ثبت‌نام انجام نشد؛ نشست و ارتباط خود را بررسی کنید.");
        return;
      }
      router.push(`/student/courses/${courseId}/watch`);
      router.refresh();
    } catch {
      setMessage("ارتباط با سرور برقرار نشد؛ دوباره تلاش کنید.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <Button type="button" disabled={busy}
        className="disabled:opacity-50"
        onClick={() => void enroll()}>
        {busy ? "در حال ثبت‌نام…" : "ثبت‌نام رایگان در همین دوره"}
      </Button>
      <div role="status" aria-live="polite"
        className="text-sm leading-7 text-red-700">
        {message && <p>{message}</p>}
      </div>
    </div>
  );
}
