import Image from "next/image";
import Link from "next/link";

export function BenefactorPageHeader({ title, section }: { title: string; section: string }) {
  return <header className="flex min-h-[72px] flex-wrap items-center justify-between gap-3 border-b border-dena-border bg-white px-5 py-4 md:px-8">
    <div><p className="text-[11px] text-dena-muted">{section}</p>
      <h1 className="mt-1 text-xl font-extrabold text-dena-deep">{title}</h1></div>
    <Link href="/benefactor/notifications" aria-label="اعلان‌های خیر و حامی"
      className="grid size-10 place-items-center rounded-full bg-dena-bg focus-visible:outline-2 focus-visible:outline-dena-brand">
      <Image src="/benefactor-nav/notifications.svg" width={18} height={18} alt="" />
    </Link>
  </header>;
}
