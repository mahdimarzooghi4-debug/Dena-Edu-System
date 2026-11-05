import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { SignOutButton } from "../auth/sign-out-button";

type AdminSection = "home" | "role-applications" | "provider-collaborations" | "service-accounting" | "audit" | "support" | "question-bank" | "exams";

type Props = {
  active: AdminSection;
  canHandleSupport?: boolean;
  children: ReactNode;
};

const links: ReadonlyArray<{
  key: AdminSection;
  href: string;
  label: string;
  group: string;
}> = [
  { key: "home", group: "مدیریت", href: "/admin", label: "نمای کلی" },
  { key: "role-applications", group: "نقش‌ها و موجودیت‌ها", href: "/admin/role-applications", label: "درخواست‌های نقش" },
  { key: "provider-collaborations", group: "ارائه‌دهندگان", href: "/admin/provider-collaborations", label: "بررسی همکاری ارائه‌دهنده" },
  { key: "service-accounting", group: "خدمات مؤسسه", href: "/admin/service-accounting", label: "خدمات و حسابداری" },
  { key: "question-bank", group: "آموزش", href: "/admin/question-bank", label: "بانک سؤال دنا" },
  { key: "exams", group: "آموزش", href: "/admin/exams", label: "آزمون‌های هماهنگ دنا" },
  { key: "audit", group: "نظارت", href: "/admin/audit", label: "رویدادهای سیستم" },
];

function AdminNavigation({ active, canHandleSupport, mobile = false }: {
  active: AdminSection;
  canHandleSupport: boolean;
  mobile?: boolean;
}) {
  const items = canHandleSupport
    ? [...links, { key: "support" as const, group: "پشتیبانی", href: "/admin/support", label: "پشتیبانی فنی" }]
    : links;
  return (
    <nav aria-label={mobile ? "منوی ادمین موبایل" : "منوی ادمین"}>
      <ul className="space-y-1.5">
        {items.map((item, index) => {
          const selected = active === item.key;
          return (
            <li key={item.key}>
              {(index === 0 || items[index - 1].group !== item.group) && (
                <p className="px-4 pb-2 pt-4 text-[10px] font-semibold text-[#b9acd8]">{item.group}</p>
              )}
              <Link
                href={item.href}
                aria-current={selected ? "page" : undefined}
                className={
                  "flex min-h-11 items-center rounded-xl px-4 text-sm transition-colors " +
                  (selected
                    ? "bg-[#6048e8] font-bold text-white"
                    : "text-[#e5e1ed] hover:bg-[#443678] hover:text-white")
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
      <aside className="hidden h-dvh w-[260px] shrink-0 border-l border-white/10 bg-[#342b63] px-4 py-5 text-white lg:sticky lg:top-0 lg:flex lg:flex-col">
        <Link href="/admin" aria-label="دنا، خانهٔ ادمین" className="inline-flex rounded-xl bg-white px-3 py-1">
          <Image src="/dena-app-logo.png" alt="دنا" width={84} height={48} priority />
        </Link>
        <p className="mt-3 px-3 text-sm font-bold text-white">مدیریت دنا</p>
        <div className="mt-7 min-h-0 flex-1 overflow-y-auto">
          <AdminNavigation active={active} canHandleSupport={canHandleSupport} />
        </div>
        <div className="mt-5 space-y-3 border-t border-white/15 pt-4">
          <Link href="/account" className="flex min-h-11 items-center rounded-xl px-4 text-sm text-[#e5e1ed] hover:bg-[#443678]">
            حساب من
          </Link>
          <SignOutButton />
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
            <div className="rounded-b-xl border-t border-white/10 bg-[#342b63] p-3">
              <AdminNavigation active={active} canHandleSupport={canHandleSupport} mobile />
              <div className="mt-3 border-t border-white/15 pt-3"><SignOutButton /></div>
            </div>
          </details>
        </div>
        {children}
      </div>
    </div>
  );
}
