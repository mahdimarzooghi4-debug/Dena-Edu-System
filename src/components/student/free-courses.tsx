"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "../ui/button";

type Course = {
  courseId: string;
  title: string;
  providerId: string;
  responsibleInstituteId: string;
  free: true;
  enrolled: boolean;
};

export function FreeCourses() {
  const [items, setItems] = useState<Course[]>([]);
  const [problem, setProblem] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  async function refresh() {
    const response = await fetch("/api/student/courses", {
      credentials: "same-origin", cache: "no-store",
    });
    if (!response.ok) throw new Error("catalog_unavailable");
    const data = await response.json() as { courses: Course[] };
    setItems(data.courses);
  }
  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/student/courses", {
      credentials: "same-origin", cache: "no-store", signal: controller.signal,
    }).then(async (response) => {
      if (!response.ok) throw new Error("catalog_unavailable");
      return response.json() as Promise<{ courses: Course[] }>;
    }).then((data) => {
      if (!controller.signal.aborted) setItems(data.courses);
    }).catch(() => {
      if (!controller.signal.aborted) setProblem("دریافت فهرست دوره‌ها ممکن نشد.");
    });
    return () => controller.abort();
  }, []);

  async function enroll(courseId: string) {
    if (busy) return;
    setBusy(courseId); setProblem(""); setNotice("");
    try {
      const response = await fetch(
        `/api/student/courses/${encodeURIComponent(courseId)}/enroll`, {
          method: "POST", credentials: "same-origin", cache: "no-store",
          headers: { "Content-Type": "application/json" },
          body: "{}",
        },
      );
      if (!response.ok) {
        setProblem(response.status === 404
          ? "دوره دیگر برای ثبت‌نام در دسترس نیست؛ وضعیت نظارت یا انتشار آن تغییر کرده است."
          : response.status === 409
            ? "ثبت‌نام لغوشده از این مسیر خودکار بازفعال نمی‌شود."
            : "ثبت‌نام انجام نشد؛ وضعیت نشست خود را بررسی کنید.");
        return;
      }
      await refresh();
      setNotice("ثبت‌نام رایگان شما برای همین دوره ثبت شد.");
    } catch {
      setProblem("ارتباط برقرار نشد؛ فهرست را دوباره بررسی کنید.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      <div role="status" aria-live="polite" className="text-sm leading-7">
        {problem && <p className="text-red-700">{problem}</p>}
        {!problem && notice && <p className="text-dena-deep">{notice}</p>}
      </div>
      {items.length === 0
        ? <p className="text-sm leading-8 text-dena-muted">
            فعلاً دوره رایگان دارای تأیید نظارت و محتوای آماده برای ثبت‌نام وجود ندارد.
          </p>
        : <ul className="grid gap-4 md:grid-cols-2">
          {items.map((course) =>
            <li key={course.courseId}
              className="space-y-3 rounded-2xl border border-dena-border bg-white p-5">
              <h2 className="text-lg font-extrabold leading-8">{course.title}</h2>
              <p className="text-sm font-bold text-dena-deep">رایگان · نظارت مؤسسه تأیید شده</p>
              <p className="text-xs leading-6 text-dena-muted">
                تأیید نظارت فقط برای این دوره است؛ وضعیت دسترسی پیش از هر درخواست محتوا دوباره بررسی می‌شود.
              </p>
              {course.enrolled
                ? <Link href={`/student/courses/${course.courseId}/watch`}
                    className="inline-block rounded-xl bg-dena-deep px-4 py-3 text-sm font-bold text-white">
                    مشاهده محتوای دوره
                  </Link>
                : <Button type="button" disabled={Boolean(busy)}
                    onClick={() => enroll(course.courseId)}
                    className="disabled:opacity-50">
                    {busy === course.courseId ? "در حال ثبت…" : "ثبت‌نام رایگان"}
                  </Button>}
            </li>)}
          </ul>}
    </div>
  );
}
