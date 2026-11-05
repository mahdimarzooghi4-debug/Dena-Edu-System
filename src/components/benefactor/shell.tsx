"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { SignOutButton } from "../auth/sign-out-button";

const navigation = [
  { href: "/benefactor", label: "داشبورد", icon: "dashboard" },
  { href: "/benefactor/students", label: "دانش‌آموزان تحت حمایت", icon: "students" },
  { href: "/benefactor/growth", label: "رشد و پیشرفت", icon: "growth" },
  { href: "/benefactor/reports", label: "گزارش‌ها", icon: "reports" },
  { href: "/benefactor/notifications", label: "اعلان‌ها", icon: "notifications" },
];
const utilities = [
  { href: "/support", label: "پشتیبانی آنلاین", icon: "support" },
  { href: "/account", label: "حساب خیر و حامی", icon: "account" },
];

export function BenefactorShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  function links(items: typeof navigation) {
    return items.map(({ href, label, icon }) => {
      const active = href === "/benefactor" ? pathname === href : pathname === href || pathname.startsWith(href + "/");
      return <li key={href}><Link href={href} aria-current={active ? "page" : undefined}
        className={`flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-300 ${active
          ? "bg-[#382973] font-bold text-[#b08cff]" : "text-[#e5e1ed] hover:bg-[#382973] hover:text-white"}`}>
        <Image src={`/benefactor-nav/${icon}.svg`} width={18} height={18} alt="" className="shrink-0" />
        <span>{label}</span>
      </Link></li>;
    });
  }
  const brand = <Link href="/benefactor" aria-label="خانهٔ پنل خیر و حامی" className="flex items-center gap-3 rounded-lg focus-visible:outline-2 focus-visible:outline-violet-300">
    <span className="rounded-lg bg-white p-1.5"><Image src="/dena-app-logo.png" alt="دنا" width={64} height={36} priority /></span>
    <span className="text-sm font-extrabold">سامانهٔ دنا<span className="mt-1 block text-[11px] font-normal text-[#b08cff]">پنل خیر و حامی</span></span>
  </Link>;

  return <div dir="rtl" className="min-h-screen min-w-0 bg-[#f8f7fc] lg:flex">
    <aside className="sticky top-0 hidden h-dvh w-[260px] shrink-0 flex-col border-l border-white/5 bg-[#1e1145] p-5 text-white lg:flex">
      <div className="px-1 py-2">{brand}</div>
      <nav aria-label="منوی خیر و حامی" className="mt-7 min-h-0 flex-1 overflow-y-auto">
        <ul className="space-y-1.5">{links(navigation)}</ul>
      </nav>
      <div className="mt-5 space-y-3 border-t border-white/15 pt-4">
        <nav aria-label="حساب و پشتیبانی"><ul className="space-y-1">{links(utilities)}</ul></nav>
        <SignOutButton />
      </div>
    </aside>
    <div className="min-w-0 flex-1">
      <header className="border-b border-dena-border bg-[#1e1145] p-4 text-white lg:hidden">
        <div className="flex items-center justify-between gap-3">
          {brand}
          <Link href="/benefactor/notifications" className="rounded-lg border border-white/20 px-3 py-2 text-xs">اعلان‌ها</Link>
        </div>
        <details key={pathname} className="mt-4 rounded-xl border border-white/15">
          <summary className="cursor-pointer px-4 py-3 text-sm font-bold focus-visible:outline-2">منوی پنل</summary>
          <nav aria-label="منوی موبایل خیر و حامی" className="border-t border-white/10 p-2">
            <ul className="space-y-1">{links(navigation)}{links(utilities)}</ul>
            <div className="p-3"><SignOutButton /></div>
          </nav>
        </details>
      </header>
      {children}
    </div>
  </div>;
}
