import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { navigation, sharedTechnicalSupport, type Role } from "@/lib/navigation";
import { previewHref, roleLabels } from "@/lib/preview";

type Props = {
  role: Role | null;
  currentHref: string;
  title: string;
  children: ReactNode;
};

export function DenaShell({ role, currentHref, title, children }: Props) {
  const links = role ? navigation[role] : [];
  return (
    <div className="min-h-screen bg-dena-bg lg:flex">
      <aside className="border-b border-dena-border bg-white px-5 py-6 lg:min-h-screen lg:w-[272px] lg:shrink-0 lg:border-b-0 lg:border-l">
        <Link href="/" className="inline-flex items-center" aria-label="دنا، صفحهٔ اصلی">
          <Image src="/dena-app-logo.png" alt="دنا" width={83} height={48} priority />
        </Link>
        <p className="mt-3 text-sm text-dena-muted">{role ? "فضای " + roleLabels[role] + " دنا" : "پشتیبانی فنی مشترک"}</p>
        <div className="my-5 h-px bg-dena-border" />
        <p className="mb-4 text-xs font-bold text-dena-muted">دسترسی سریع · پیش‌نمایش</p>
        <nav aria-label="منوی پیش‌نمایش">
          <ul className="flex flex-wrap gap-2 lg:flex-col">
            {links.map((item) => (
              <li key={item.href}>
                <Link
                  href={previewHref(role!, item.href)}
                  aria-current={currentHref === item.href ? "page" : undefined}
                  className={
                    "flex min-h-11 items-center rounded-xl px-4 text-sm transition-colors " +
                    (currentHref === item.href
                      ? "bg-dena-lavender font-bold text-dena-brand"
                      : "text-dena-ink hover:bg-dena-bg")
                  }
                >
                  {item.title}
                </Link>
              </li>
            ))}
            <li>
              <Link
                href="/preview/support"
                aria-current={currentHref === sharedTechnicalSupport.href ? "page" : undefined}
                className={
                  "flex min-h-11 items-center rounded-xl px-4 text-sm transition-colors " +
                  (currentHref === sharedTechnicalSupport.href
                    ? "bg-dena-lavender font-bold text-dena-brand"
                    : "text-dena-ink hover:bg-dena-bg")
                }
              >
                {sharedTechnicalSupport.title}
              </Link>
            </li>
          </ul>
        </nav>
        <div className="mt-7 rounded-xl border border-dena-border bg-dena-bg p-4 text-xs leading-6 text-dena-muted">
          این صفحات فقط پوستهٔ عمومی و بدون حساب کاربری، API یا دادهٔ عملیاتی هستند.
        </div>
        <Link href="/" className="mt-5 inline-block text-sm font-semibold text-dena-brand underline-offset-4 hover:underline">
          بازگشت به صفحهٔ اصلی
        </Link>
      </aside>
      <div className="min-w-0 flex-1">
        <header className="flex min-h-[84px] flex-wrap items-center justify-between gap-3 border-b border-dena-border bg-white px-5 py-4 md:px-10">
          <div>
            <p className="font-bold">{title}</p>
            <p className="text-xs text-dena-muted">حسابی متصل نشده است</p>
          </div>
          <p className="text-xs font-semibold text-dena-brand">پیش‌نمایش رابط کاربری · بدون دادهٔ واقعی</p>
        </header>
        <main className="mx-auto w-full max-w-[1168px] px-5 py-8 md:px-10">
          {children}
        </main>
      </div>
    </div>
  );
}
