"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const publicLinks = [
  ["درباره دنا", "/about"],
  ["باشگاه نخبگان", "/elite-club"],
  ["آزمون‌ها", "/assessments"],
  ["مسیر رشد", "/growth"],
  ["دوره‌ها", "/courses"],
  ["خانه", "/"],
] as const;

/** Keep the common header navigation aware of the public route, including course details. */
export function DenaSiteNavigation() {
  const pathname = usePathname();
  return (
    <nav className="dena-nav" aria-label="ناوبری اصلی">
      {publicLinks.map(([label, href]) => {
        const active = href === "/"
          ? pathname === "/"
          : pathname === href || pathname.startsWith(`${href}/`);
        return <Link
          key={href}
          href={href}
          className={active ? "is-active" : undefined}
          aria-current={active ? "page" : undefined}
        >{label}</Link>;
      })}
    </nav>
  );
}
