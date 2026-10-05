import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

type StudentSection =
  | "home"
  | "courses"
  | "assessments"
  | "services"
  | "growth"
  | "elite"
  | "account";

type Props = {
  active: StudentSection;
  title: string;
  children: ReactNode;
};

type IconName =
  | "home"
  | "book"
  | "assessment"
  | "growth"
  | "star"
  | "user"
  | "bell"
  | "help"
  | "logout";

const desktopItems: ReadonlyArray<{
  key: StudentSection;
  href: string;
  label: string;
  icon: IconName;
}> = [
  { key: "home", href: "/student", label: "خانه من", icon: "home" },
  { key: "courses", href: "/student/courses", label: "دوره‌های من", icon: "book" },
  { key: "assessments", href: "/student/assessments", label: "تمرین‌ها و آزمون‌ها", icon: "assessment" },
  { key: "services", href: "/student/services", label: "خدمات مؤسسه‌ها", icon: "help" },
  { key: "growth", href: "/student/growth", label: "مسیر رشد", icon: "growth" },
  { key: "elite", href: "/student/elite-club", label: "باشگاه نخبگان", icon: "star" },
  { key: "account", href: "/student/profile", label: "پروفایل کاربری", icon: "user" },
];

const mobileItems: ReadonlyArray<{
  key: StudentSection;
  href: string;
  label: string;
  icon: IconName;
}> = [
  { key: "home", href: "/student", label: "خانه", icon: "home" },
  { key: "courses", href: "/student/courses", label: "دوره‌ها", icon: "book" },
  { key: "assessments", href: "/student/assessments", label: "تمرین‌ها", icon: "assessment" },
  { key: "services", href: "/student/services", label: "خدمات", icon: "help" },
  { key: "growth", href: "/student/growth", label: "رشد", icon: "growth" },
  { key: "account", href: "/student/profile", label: "حساب", icon: "user" },
];

function Icon({ name, className = "size-5" }: { name: IconName; className?: string }) {
  const common = {
    className,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  switch (name) {
    case "home":
      return <svg {...common}><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /><path d="M9 21v-7h6v7" /></svg>;
    case "book":
      return <svg {...common}><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5z" /><path d="M4 5.5v16" /></svg>;
    case "assessment":
      return <svg {...common}><path d="M7 3h10v4H7z" /><path d="M5 5h14v16H5z" /><path d="m8 13 2 2 4-4" /></svg>;
    case "growth":
      return <svg {...common}><path d="M4 17l5-5 4 3 7-8" /><path d="M16 7h4v4" /></svg>;
    case "star":
      return <svg {...common}><path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" /></svg>;
    case "user":
      return <svg {...common}><circle cx="12" cy="8" r="4" /><path d="M4.5 21a7.5 7.5 0 0 1 15 0" /></svg>;
    case "bell":
      return <svg {...common}><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 21h4" /></svg>;
    case "help":
      return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="M9.8 9a2.5 2.5 0 1 1 3.6 2.3c-.9.5-1.4 1-1.4 2.2" /><path d="M12 17h.01" /></svg>;
    case "logout":
      return <svg {...common}><path d="M10 17l5-5-5-5" /><path d="M15 12H3" /><path d="M14 3h7v18h-7" /></svg>;
  }
}

function DesktopNavigation({ active }: { active: StudentSection }) {
  return (
    <nav aria-label="منوی دانش‌آموز" className="mt-7">
      <ul className="space-y-2">
        {desktopItems.map((item) => {
          const selected = active === item.key;
          return (
            <li key={item.key}>
              <Link
                href={item.href}
                aria-current={selected ? "page" : undefined}
                className={
                  "flex min-h-[46px] items-center gap-3 rounded-xl px-4 text-sm transition-colors " +
                  (selected
                    ? "bg-dena-lavender font-bold text-dena-brand"
                    : "text-dena-muted hover:bg-dena-bg hover:text-dena-ink")
                }
              >
                <Icon name={item.icon} />
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function MobileNavigation({ active }: { active: StudentSection }) {
  return (
    <nav
      aria-label="منوی پایین دانش‌آموز"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-dena-border bg-white px-2 pb-[max(.55rem,env(safe-area-inset-bottom))] pt-2 lg:hidden"
    >
      <ul className="mx-auto grid max-w-[430px] grid-cols-5 gap-1">
        {mobileItems.map((item) => {
          const selected = active === item.key;
          return (
            <li key={item.key}>
              <Link
                href={item.href}
                aria-current={selected ? "page" : undefined}
                className={
                  "flex min-h-[52px] flex-col items-center justify-center gap-1 rounded-xl px-1 text-[11px] transition-colors " +
                  (selected
                    ? "bg-dena-lavender font-bold text-dena-brand"
                    : "text-dena-muted")
                }
              >
                <Icon name={item.icon} className="size-[19px]" />
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function StudentShell({ active, title, children }: Props) {
  const eliteActive = active === "elite";
  return (
    <div className="min-h-screen bg-dena-bg lg:flex">
      <aside className="hidden h-screen w-[260px] shrink-0 border-l border-dena-border bg-white lg:sticky lg:top-0 lg:flex lg:flex-col lg:px-4 lg:py-5">
        <Link href="/student" aria-label="دنا، خانه دانش‌آموز" className="inline-flex px-3">
          <Image src="/dena-app-logo.png" alt="دنا" width={84} height={48} priority />
        </Link>

        <DesktopNavigation active={active} />

        <div className="mt-auto border-t border-dena-border pt-4">
          <div className="flex min-h-[44px] items-center gap-3 rounded-xl px-4 text-sm text-dena-muted" aria-disabled="true">
            <Icon name="help" />
            <span>پشتیبانی آنلاین</span>
          </div>
          <div className="mt-2 flex min-h-[44px] items-center gap-3 rounded-xl px-4 text-sm text-dena-muted">
            <Icon name="user" />
            <span>دانش‌آموز دنا</span>
          </div>
          <Link
            href="/account"
            className="mt-4 flex min-h-[44px] items-center gap-3 rounded-xl px-4 text-sm font-semibold text-red-600 hover:bg-red-50"
          >
            <Icon name="logout" />
            <span>خروج / حساب کاربری</span>
          </Link>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex min-h-[76px] items-center justify-between border-b border-dena-border bg-white/95 px-4 backdrop-blur md:px-7 lg:px-10">
          <div className="flex items-center gap-2 lg:hidden">
            <span className="grid size-10 place-items-center text-dena-muted" aria-label="اعلان‌ها">
              <Icon name="bell" />
            </span>
            <span
              className={
                "grid size-10 place-items-center rounded-xl " +
                (eliteActive ? "bg-dena-lavender text-dena-brand" : "text-dena-muted")
              }
              aria-label="باشگاه نخبگان"
            >
              <Icon name="star" />
            </span>
          </div>
          <h1 className="text-lg font-extrabold text-dena-ink md:text-xl">{title}</h1>
          <Link href="/student" className="lg:hidden" aria-label="دنا، خانه دانش‌آموز">
            <Image src="/dena-app-logo.png" alt="دنا" width={55} height={33} priority />
          </Link>
          <span className="hidden size-10 place-items-center text-dena-muted lg:grid" aria-label="اعلان‌ها">
            <Icon name="bell" />
          </span>
        </header>

        <main id="main-content" className="mx-auto w-full max-w-[1180px] px-4 py-5 pb-24 md:px-7 md:py-7 lg:px-10 lg:py-10 lg:pb-10">
          {children}
        </main>
      </div>

      <MobileNavigation active={active} />
    </div>
  );
}
