"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const links = [
  ["/organization", "داشبورد"], ["/organization/students", "دانش‌آموزان"],
  ["/organization/growth", "رشد و پیشرفت"], ["/organization/reports", "گزارش‌ها"],
  ["/organization/notifications", "اعلان‌ها"], ["/organization/support", "پشتیبانی آنلاین"],
  ["/organization/access", "محدودهٔ دسترسی"],
  ["/organization/profile", "پروفایل سازمان"],
];

export function OrganizationShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  function navigation() {
    return <nav aria-label="منوی سازمان"><ul className="space-y-1">
      {links.map(([href, label]) => {
        const active = href === "/organization" ? pathname === href : pathname.startsWith(href);
        return <li key={href}><Link href={href} aria-current={active ? "page" : undefined}
          className={`flex min-h-11 items-center rounded-lg px-4 text-sm ${active ? "bg-[#382973] font-bold text-[#b08cff]" : "text-[#e5e1ed] hover:bg-[#382973]"}`}>{label}</Link></li>;
      })}
    </ul></nav>;
  }
  return <div dir="rtl" className="min-h-screen min-w-0 bg-dena-bg lg:flex">
    <aside className="sticky top-0 hidden h-screen w-[248px] shrink-0 flex-col bg-[#1e1145] p-6 text-white lg:flex">
      <Link href="/organization" className="mb-7 text-lg font-extrabold">سامانهٔ دنا <span className="block text-xs font-normal text-[#b08cff]">پنل سازمان</span></Link>
      {navigation()}
    </aside>
    <div className="min-w-0 flex-1">
      <header className="border-b border-dena-border bg-white px-5 py-3 lg:hidden">
        <Link href="/organization" className="font-extrabold text-dena-brand">دنا · پنل سازمان</Link>
        <details className="mt-3 rounded-lg bg-[#1e1145] p-3 text-white">
          <summary className="cursor-pointer text-sm font-bold">بخش‌های پنل</summary>
          <div className="mt-3">{navigation()}</div>
        </details>
      </header>
      {children}
    </div>
  </div>;
}
