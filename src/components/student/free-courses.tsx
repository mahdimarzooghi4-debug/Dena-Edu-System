"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { Button } from "../ui/button";

type Course = {
  courseId: string;
  title: string;
  providerId: string;
  responsibleInstituteId: string;
  free: true;
  enrolled: boolean;
};
type CatalogPage = { courses: Course[]; nextCursor: string | null };
type Filter = { q: string; mine: boolean };
const initialFilter: Filter = { q: "", mine: false };

export function FreeCourses() {
  const [items, setItems] = useState<Course[]>([]);
  const [queryText, setQueryText] = useState("");
  const [onlyMine, setOnlyMine] = useState(false);
  const [applied, setApplied] = useState<Filter>(initialFilter);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [problem, setProblem] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  // Ignore obsolete network replies when filters change or a search is retried.
  const serial = useRef(0);

  const loadPage = useCallback(async (
    filter: Filter, cursor: string | null = null,
    signal?: AbortSignal,
  ) => {
    const requestId = ++serial.current;
    if (cursor) setLoadingMore(true);
    else {
      setLoading(true);
      setItems([]);
      setNextCursor(null);
    }
    setProblem("");
    const params = new URLSearchParams();
    if (filter.q) params.set("q", filter.q);
    if (filter.mine) params.set("mine", "1");
    if (cursor) params.set("cursor", cursor);
    try {
      const response = await fetch(
        `/api/student/courses${params.size ? `?${params}` : ""}`, {
          credentials: "same-origin", cache: "no-store", signal,
        },
      );
      if (!response.ok) throw new Error("catalog_unavailable");
      const data = await response.json() as CatalogPage;
      if (requestId !== serial.current) return;
      setItems((previous) => cursor
        ? [...previous, ...data.courses.filter((course) =>
          !previous.some((existing) => existing.courseId === course.courseId))]
        : data.courses);
      setNextCursor(data.nextCursor);
    } catch {
      if (requestId !== serial.current || signal?.aborted) return;
      setProblem("دریافت فهرست دوره‌ها ممکن نشد؛ دوباره تلاش کنید.");
    } finally {
      if (requestId === serial.current) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const requestId = ++serial.current;
    // Mount fetch updates state only from its async callbacks; searching and
    // pagination use loadPage from explicit user events.
    void fetch("/api/student/courses", {
      credentials: "same-origin", cache: "no-store", signal: controller.signal,
    }).then(async (response) => {
      if (!response.ok) throw new Error("catalog_unavailable");
      return response.json() as Promise<CatalogPage>;
    }).then((data) => {
      if (controller.signal.aborted || requestId !== serial.current) return;
      setItems(data.courses);
      setNextCursor(data.nextCursor);
    }).catch(() => {
      if (!controller.signal.aborted && requestId === serial.current) {
        setProblem("دریافت فهرست دوره‌ها ممکن نشد؛ دوباره تلاش کنید.");
      }
    }).finally(() => {
      if (!controller.signal.aborted && requestId === serial.current) {
        setLoading(false);
      }
    });
    return () => {
      serial.current += 1;
      controller.abort();
    };
  }, []);

  async function enroll(courseId: string) {
    if (busy || loading || loadingMore) return;
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
      await loadPage(applied);
      setNotice("ثبت‌نام رایگان شما برای همین دوره ثبت شد.");
    } catch {
      setProblem("ارتباط برقرار نشد؛ فهرست را دوباره بررسی کنید.");
    } finally {
      setBusy(null);
    }
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading || loadingMore || busy) return;
    const filter = { q: queryText.trim(), mine: onlyMine };
    setApplied(filter);
    setNotice("");
    void loadPage(filter);
  }

  return (
    <div className="space-y-6">
      <form onSubmit={submitSearch}
        className="space-y-4 rounded-xl border border-dena-border bg-dena-bg p-4">
        <label htmlFor="free-course-search"
          className="block text-sm font-bold text-dena-deep">
          جست‌وجوی عنوان دوره
        </label>
        <input id="free-course-search" type="search"
          value={queryText} maxLength={80}
          onChange={(event) => setQueryText(event.target.value)}
          placeholder="بخشی از نام دوره را وارد کنید"
          className="min-h-12 w-full rounded-xl border border-dena-border bg-white px-4 text-sm" />
        <label className="flex items-center gap-3 text-sm font-semibold">
          <input type="checkbox" checked={onlyMine}
            onChange={(event) => setOnlyMine(event.target.checked)}
            className="h-5 w-5 accent-dena-brand" />
          فقط ثبت‌نام‌های من
        </label>
        <div className="flex flex-wrap gap-3">
          <Button type="submit" disabled={loading || loadingMore || Boolean(busy)}
            className="disabled:opacity-50">
            جست‌وجو
          </Button>
          {(applied.q || applied.mine) && (
            <Button type="button" variant="outline"
              disabled={loading || loadingMore || Boolean(busy)}
              onClick={() => {
                setQueryText(""); setOnlyMine(false);
                setApplied(initialFilter); setNotice("");
                void loadPage(initialFilter);
              }} className="disabled:opacity-50">
              پاک‌کردن فیلترها
            </Button>
          )}
        </div>
      </form>

      <div role="status" aria-live="polite" className="text-sm leading-7">
        {problem && <p className="text-red-700">{problem}</p>}
        {!problem && notice && <p className="text-dena-deep">{notice}</p>}
        {loading && <p className="text-dena-muted">در حال دریافت دوره‌ها…</p>}
      </div>
      {!loading && items.length === 0 && (
        <p className="text-sm leading-8 text-dena-muted">
          {applied.q || applied.mine
            ? "دوره‌ای مطابق این جست‌وجو و فیلتر یافت نشد."
            : "فعلاً دوره رایگان دارای تأیید نظارت و محتوای آماده برای ثبت‌نام وجود ندارد."}
        </p>
      )}
      {!loading && items.length > 0 && (
        <ul className="grid gap-4 md:grid-cols-2">
          {items.map((course) =>
            <li key={course.courseId}
              className="space-y-3 rounded-2xl border border-dena-border bg-white p-5">
              <h2 className="text-lg font-extrabold leading-8">{course.title}</h2>
              <p className="text-sm font-bold text-dena-deep">
                رایگان · نظارت مؤسسه تأیید شده
              </p>
              <Link href={`/student/courses/${course.courseId}`}
                className="inline-block text-sm font-bold text-dena-brand hover:underline">
                جزئیات دوره و مؤسسهٔ مسئول
              </Link>
              <p className="text-xs leading-6 text-dena-muted">
                تأیید نظارت فقط برای این دوره است؛ وضعیت دسترسی پیش از هر درخواست محتوا دوباره بررسی می‌شود.
              </p>
              {course.enrolled
                ? <Link href={`/student/courses/${course.courseId}/watch`}
                    className="inline-block rounded-xl bg-dena-deep px-4 py-3 text-sm font-bold text-white">
                    مشاهده محتوای دوره
                  </Link>
                : <Button type="button" disabled={Boolean(busy) || loadingMore}
                    onClick={() => enroll(course.courseId)}
                    className="disabled:opacity-50">
                    {busy === course.courseId ? "در حال ثبت…" : "ثبت‌نام رایگان"}
                  </Button>}
            </li>)}
        </ul>
      )}
      {nextCursor && !loading && (
        <Button type="button" variant="outline"
          disabled={loadingMore || Boolean(busy)}
          onClick={() => void loadPage(applied, nextCursor)}
          className="disabled:opacity-50">
          {loadingMore ? "در حال دریافت…" : "نمایش دوره‌های بیشتر"}
        </Button>
      )}
      {!loading && items.length > 0 && (
        <p className="text-xs leading-7 text-dena-muted">
          نتیجه‌ها به‌ترتیب عنوان و در صفحه‌های حداکثر ۲۰ دوره‌ای از سرور دریافت می‌شوند؛
          فقط دوره‌های دارای نظارت و دسترسی فعلی نمایش داده می‌شوند.
        </p>
      )}
    </div>
  );
}
