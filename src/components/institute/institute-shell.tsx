"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const sections = [
  { href: "/institute", label: "داشبورد" },
  { href: "/institute/courses", label: "دوره‌ها" },
  { href: "/institute/providers", label: "ارائه‌دهندگان و مدرس‌ها" },
  { href: "/institute/question-bank", label: "بانک سؤال" },
  { href: "/institute/exams", label: "آزمون‌ها" },
  { href: "/institute/services", label: "خدمات جانبی" },
  { href: "/institute/service-orders", label: "درخواست‌های خدمات" },
  { href: "/institute/assessments", label: "آزمون‌ها و ارزیابی‌ها" },
  { href: "/institute/learning", label: "مسیر رشد دانش‌آموزان" },
  { href: "/institute/profile", label: "پروفایل مؤسسه" },
] as const;

function Navigation({ currentPath, mobile = false }: {
  currentPath: string; mobile?: boolean;
}) {
  return (
    <nav aria-label={mobile ? "منوی موبایل مؤسسه" : "منوی مؤسسه"}>
      <ul className="space-y-1">
        {sections.map((section) => {
          const selected = section.href === "/institute"
            ? currentPath === section.href
            : currentPath === section.href || currentPath.startsWith(`${section.href}/`);
          return (
            <li key={section.href}>
              <Link href={section.href} aria-current={selected ? "page" : undefined}
                className={
                  "flex min-h-11 items-center rounded-lg px-4 text-sm transition-colors " +
                  (selected
                    ? "bg-[#382973] font-bold text-[#b08cff]"
                    : "text-[#e5e1ed] hover:bg-[#382973] hover:text-white")
                }>
                {section.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function InstituteShell({ children }: { children: ReactNode }) {
  const currentPath = usePathname();
  return (
    <div className="min-h-screen min-w-0 bg-dena-bg lg:flex">
      <aside className="hidden h-screen w-[260px] shrink-0 flex-col justify-between bg-[#1d124e] p-6 text-white lg:sticky lg:top-0 lg:flex">
        <div>
          <Link href="/institute" aria-label="خانهٔ پنل مؤسسه"
            className="flex items-center justify-end gap-3 text-base font-extrabold">
            پنل آموزشگاه
            <span className="grid size-8 place-items-center rounded-lg bg-dena-brand">د</span>
          </Link>
          <div className="mt-8">
            <Navigation currentPath={currentPath} />
          </div>
        </div>
        <div className="space-y-1 border-t border-white/15 pt-4">
          <Link href="/support" className="flex min-h-11 items-center rounded-lg px-4 text-sm text-[#e5e1ed] hover:bg-[#382973]">
            پشتیبانی آنلاین
          </Link>
          <Link href="/account" className="flex min-h-11 items-center rounded-lg px-4 text-sm text-[#e5e1ed] hover:bg-[#382973]">
            خروج از حساب
          </Link>
        </div>
      </aside>
      <div className="min-w-0 flex-1">
        <div className="border-b border-dena-border bg-white px-5 py-3 lg:hidden">
          <div className="flex items-center justify-between">
            <Link href="/institute" aria-label="دنا، خانهٔ مؤسسه" className="inline-flex">
              <Image src="/dena-app-logo.png" alt="دنا" width={72} height={40} priority />
            </Link>
            <Link href="/account" className="text-sm font-semibold text-dena-brand">حساب من</Link>
          </div>
          <details className="mt-3 rounded-xl border border-dena-border">
            <summary className="flex min-h-11 cursor-pointer items-center justify-between px-4 text-sm font-bold text-dena-deep">
              بخش‌های پنل مؤسسه
              <span className="text-xs font-normal text-dena-muted">بازکردن / بستن</span>
            </summary>
            <div className="rounded-b-xl bg-[#1d124e] p-3">
              <Navigation currentPath={currentPath} mobile />
            </div>
          </details>
        </div>
        {children}
      </div>
    </div>
  );
}
