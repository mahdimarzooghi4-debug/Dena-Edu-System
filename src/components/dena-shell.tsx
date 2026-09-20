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

function PreviewNavigation({
  role,
  currentHref,
  label,
}: {
  role: Role | null;
  currentHref: string;
  label: string;
}) {
  const links = role ? navigation[role] : [];
  return (
    <nav aria-label={label}>
      <ul className="flex flex-col gap-2">
        {links.map((item) => {
          const active = currentHref === item.href;
          return (
            <li key={item.href}>
              <Link
                href={previewHref(role!, item.href)}
                aria-current={active ? "page" : undefined}
                className={
                  "flex min-h-[46px] items-center rounded-xl px-4 py-2 text-[15px] leading-6 transition-colors " +
                  (active
                    ? "bg-dena-lavender font-bold text-dena-brand"
                    : "text-dena-ink hover:bg-dena-bg")
                }
              >
                {item.title}
              </Link>
            </li>
          );
        })}
        <li className="border-t border-dena-border pt-3">
          <Link
            href="/preview/support"
            aria-current={currentHref === sharedTechnicalSupport.href ? "page" : undefined}
            className={
              "flex min-h-[46px] items-center rounded-xl px-4 py-2 text-[15px] leading-6 transition-colors " +
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
  );
}

/**
 * The 272px Figma sidebar stays visible on desktop. On smaller screens an
 * accessible native details element keeps navigation compact without JS.
 * These links ONLY point to publicly available, data-free previews.
 */
export function DenaShell({ role, currentHref, title, children }: Props) {
  return (
    <div className="min-h-screen min-w-0 bg-dena-bg lg:flex">
      <aside className="min-w-0 border-b border-dena-border bg-white px-5 py-5 lg:sticky lg:top-0 lg:h-screen lg:w-[272px] lg:shrink-0 lg:self-start lg:overflow-y-auto lg:border-b-0 lg:border-l lg:py-6">
        <Link href="/" className="inline-flex items-center" aria-label="دنا، صفحهٔ اصلی">
          <Image src="/dena-app-logo.png" alt="دنا" width={83} height={48} priority />
        </Link>
        <p className="mt-3 text-sm text-dena-muted">
          {role ? "فضای " + roleLabels[role] + " دنا" : "پشتیبانی فنی مشترک"}
        </p>

        <details className="group mt-5 rounded-xl border border-dena-border lg:hidden" data-testid="mobile-preview-menu">
          <summary className="flex min-h-12 cursor-pointer items-center justify-between gap-3 px-4 py-3 text-sm font-bold text-dena-ink">
            فهرست بخش‌ها
            <span aria-hidden="true" className="text-xs text-dena-brand">بازکردن / بستن</span>
          </summary>
          <div className="border-t border-dena-border p-3">
            <PreviewNavigation role={role} currentHref={currentHref} label="منوی پیش‌نمایش موبایل" />
          </div>
        </details>

        <div className="mt-5 hidden lg:block">
          <div className="mb-5 h-px bg-dena-border" />
          <p className="mb-4 text-[13px] font-bold text-dena-muted">دسترسی سریع · پیش‌نمایش</p>
          <PreviewNavigation role={role} currentHref={currentHref} label="منوی پیش‌نمایش" />
          <div className="mt-7 rounded-xl border border-dena-border bg-dena-bg p-4 text-xs leading-6 text-dena-muted">
            این صفحات فقط پوستهٔ عمومی و بدون حساب کاربری، API یا دادهٔ عملیاتی هستند.
          </div>
          <p className="mt-5 text-xs leading-6 text-dena-muted">
            پشتیبانی آموزشی: مؤسسه یا ارائه‌دهندهٔ دوره<br />
            پشتیبانی فنی پلتفرم: دنا
          </p>
          <Link href="/" className="mt-5 inline-block text-sm font-semibold text-dena-brand underline-offset-4 hover:underline">
            بازگشت به صفحهٔ اصلی
          </Link>
        </div>
      </aside>

      <div className="min-w-0 flex-1 bg-white">
        <header className="flex min-h-[84px] flex-wrap items-center justify-between gap-3 border-b border-dena-border bg-white px-5 py-4 md:px-8 lg:px-10">
          <div className="min-w-0">
            <p className="font-bold leading-7">{title}</p>
            <p className="text-xs text-dena-muted">حسابی متصل نشده است</p>
          </div>
          <p className="text-xs font-semibold text-dena-brand">
            پیش‌نمایش رابط کاربری · بدون دادهٔ واقعی
          </p>
        </header>
        <main id="main-content" className="mx-auto w-full max-w-[1168px] min-w-0 px-5 py-8 md:px-8 lg:px-10">
          {children}
        </main>
      </div>
    </div>
  );
}
