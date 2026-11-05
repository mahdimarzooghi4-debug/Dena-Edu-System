"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignOutButton } from "../auth/sign-out-button";
import type { ReactNode } from "react";

const sections = [
  { href: "/provider", label: "داشبورد" },
  { href: "/provider/courses", label: "دوره‌های من" },
  { href: "/provider/assessments", label: "ارزیابی‌های یادگیری" },
  { href: "/provider/learning", label: "پیگیری یادگیری" },
  { href: "/provider/supervision", label: "درخواست‌های نظارت" },
  { href: "/provider/collaborations", label: "همکاری با مؤسسه‌ها" },
  { href: "/provider/profile", label: "پروفایل ارائه‌دهنده" },
] as const;

function Navigation({ currentPath, mobile = false }: {
  currentPath: string; mobile?: boolean;
}) {
  return <nav aria-label={mobile ? "منوی موبایل ارائه‌دهنده" : "منوی ارائه‌دهنده"}>
    <ul className="space-y-1">
      {sections.map((section) => {
        const selected = section.href === "/provider"
          ? currentPath === section.href
          : currentPath === section.href || currentPath.startsWith(`${section.href}/`);
        return <li key={section.href}>
          <Link href={section.href} aria-current={selected ? "page" : undefined}
            className={
              "flex min-h-10 items-center gap-2.5 rounded-lg px-3 py-2.5 text-[13px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b08cff] " +
              (selected
                ? "bg-[#493887] font-bold text-[#b08cff]"
                : "font-medium text-white hover:bg-[#493887]")
            }>
            <Image src={selected ? "/provider-nav/indicator-active.svg" : "/provider-nav/indicator.svg"} alt="" width={7} height={7} className="shrink-0" />
            <span className="min-w-0 flex-1">{section.label}</span>
          </Link>
        </li>;
      })}
    </ul>
  </nav>;
}

export function ProviderShell({ children }: { children: ReactNode }) {
  const currentPath = usePathname();
  return <div className="min-h-screen min-w-0 bg-dena-bg lg:flex">
    <aside className="hidden h-dvh w-[260px] shrink-0 flex-col justify-between gap-5 bg-[#352b68] p-6 text-white lg:sticky lg:top-0 lg:flex">
      <div className="flex min-h-0 flex-1 flex-col">
        <Link href="/provider" aria-label="خانهٔ پنل ارائه‌دهنده"
          className="flex shrink-0 items-center gap-3 rounded-lg text-base font-extrabold">
          <span className="inline-flex rounded-lg bg-white p-1.5"><Image src="/dena-app-logo.png" alt="دنا" width={63} height={36} priority /></span>
          <span><span className="block">سامانه دنا</span><span className="mt-1 block text-[10px] font-normal text-[#b08cff]">پنل ارائه‌دهنده</span></span>
        </Link>
        <div className="mt-7 min-h-0 flex-1 overflow-y-auto overscroll-contain"><Navigation currentPath={currentPath} /></div>
      </div>
      <div className="space-y-1 border-t border-white/15 pt-4">
        <Link href="/support" className="flex min-h-11 items-center rounded-lg px-4 text-sm text-[#e5e1ed] hover:bg-[#493887]">
          پشتیبانی آنلاین
        </Link>
        <Link href="/account" className="flex min-h-11 items-center rounded-lg px-4 text-sm text-[#e5e1ed] hover:bg-[#493887]">
          حساب من
        </Link>
        <SignOutButton appearance="sidebar" />
      </div>
    </aside>
    <div className="min-w-0 flex-1">
      <div className="border-b border-dena-border bg-white px-5 py-3 lg:hidden">
        <div className="flex items-center justify-between">
          <Link href="/provider" aria-label="دنا، خانهٔ ارائه‌دهنده" className="inline-flex">
            <Image src="/dena-app-logo.png" alt="دنا" width={72} height={40} priority />
          </Link>
          <Link href="/account" className="text-sm font-semibold text-dena-brand">حساب من</Link>
        </div>
        <details className="mt-3 rounded-xl border border-dena-border">
          <summary className="flex min-h-11 cursor-pointer items-center justify-between px-4 text-sm font-bold text-dena-deep">
            بخش‌های پنل ارائه‌دهنده
            <span className="text-xs font-normal text-dena-muted">بازکردن / بستن</span>
          </summary>
          <div className="max-h-[65dvh] overflow-y-auto overscroll-contain rounded-b-xl bg-[#352b68] p-3">
            <Navigation currentPath={currentPath} mobile />
            <div className="mt-3 space-y-2 border-t border-white/15 pt-3">
              <Link href="/support" className="block px-3 py-2 text-sm text-white">پشتیبانی آنلاین</Link>
              <SignOutButton appearance="sidebar" />
            </div>
          </div>
        </details>
      </div>
      {children}
    </div>
  </div>;
}
