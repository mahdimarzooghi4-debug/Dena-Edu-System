import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

type AdminSection = "home" | "role-applications" | "audit" | "support" | "question-bank" | "exams";

type Props = {
  active: AdminSection;
  canHandleSupport?: boolean;
  children: ReactNode;
};

const links: ReadonlyArray<{
  key: AdminSection;
  href: string;
  label: string;
}> = [
  { key: "home", href: "/admin", label: "نمای کلی" },
  { key: "role-applications", href: "/admin/role-applications", label: "درخواست‌های نقش" },
  { key: "question-bank", href: "/admin/question-bank", label: "بانک سؤال دنا" },
  { key: "exams", href: "/admin/exams", label: "آزمون‌های هماهنگ دنا" },
  { key: "audit", href: "/admin/audit", label: "رویدادهای سیستم" },
];

function AdminNavigation({ active, canHandleSupport, mobile = false }: {
  active: AdminSection;
  canHandleSupport: boolean;
  mobile?: boolean;
}) {
  const items = canHandleSupport
    ? [...links, { key: "support" as const, href: "/admin/support", label: "پشتیبانی فنی" }]
    : links;
  return (
    <nav aria-label={mobile ? "منوی ادمین موبایل" : "منوی ادمین"}>
      <ul className="space-y-2">
        {items.map((item) => {
          const selected = active === item.key;
          return (
            <li key={item.key}>
              <Link
                href={item.href}
                aria-current={selected ? "page" : undefined}
                className={
                  "flex min-h-11 items-center rounded-xl px-4 text-sm transition-colors " +
                  (selected
                    ? "bg-dena-lavender font-bold text-dena-brand"
                    : "text-dena-muted hover:bg-dena-bg hover:text-dena-ink")
                }
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function AdminShell({ active, canHandleSupport = false, children }: Props) {
  return (
    <div className="min-h-screen min-w-0 bg-dena-bg lg:flex">
      <aside className="hidden h-screen w-[260px] shrink-0 border-l border-dena-border bg-white px-4 py-5 lg:sticky lg:top-0 lg:flex lg:flex-col">
        <Link href="/admin" aria-label="دنا، خانهٔ ادمین" className="inline-flex px-3">
          <Image src="/dena-app-logo.png" alt="دنا" width={84} height={48} priority />
        </Link>
        <p className="mt-3 px-3 text-sm font-bold text-dena-deep">مدیریت دنا</p>
        <div className="mt-7">
          <AdminNavigation active={active} canHandleSupport={canHandleSupport} />
        </div>
        <div className="mt-auto border-t border-dena-border pt-4">
          <Link href="/account" className="flex min-h-11 items-center rounded-xl px-4 text-sm text-dena-muted hover:bg-dena-bg">
            بازگشت به حساب من
          </Link>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <div className="border-b border-dena-border bg-white px-5 py-4 lg:hidden">
          <div className="flex items-center justify-between gap-4">
            <Link href="/admin" aria-label="دنا، خانهٔ ادمین" className="inline-flex">
              <Image src="/dena-app-logo.png" alt="دنا" width={74} height={42} priority />
            </Link>
            <Link href="/account" className="text-sm font-semibold text-dena-brand">حساب من</Link>
          </div>
          <details className="group mt-3 rounded-xl border border-dena-border">
            <summary className="flex min-h-11 cursor-pointer items-center justify-between px-4 text-sm font-bold text-dena-deep">
              بخش‌های پنل ادمین
              <span className="text-xs font-normal text-dena-muted">بازکردن / بستن</span>
            </summary>
            <div className="border-t border-dena-border p-3">
              <AdminNavigation active={active} canHandleSupport={canHandleSupport} mobile />
            </div>
          </details>
        </div>
        {children}
      </div>
    </div>
  );
}
