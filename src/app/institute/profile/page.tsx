import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { buttonClassName } from "../../../components/ui/button";
import { Card } from "../../../components/ui/card";
import { SectionHeading } from "../../../components/ui/section-heading";
import { getServerAccessContext } from "../../../server/access/actor";
import { getInstituteProfile } from "../../../server/institute/profile";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "پروفایل مؤسسه | دنا",
  robots: { index: false, follow: false },
};

export default async function InstituteProfilePage() {
  if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET ||
      !process.env.BETTER_AUTH_URL) redirect("/login");
  const actor = await getServerAccessContext();
  if (!actor) redirect("/login");
  const instituteIds = [...new Set(actor.memberships.flatMap((membership) =>
    membership.role === "institute" ? [membership.instituteId] : []))];
  if (!instituteIds.length) notFound();
  const entities = await getInstituteProfile(instituteIds);
  if (!entities.length) notFound();

  return (
    <main id="main-content" className="mx-auto min-h-screen max-w-4xl space-y-8 px-5 py-8 md:px-10 md:py-12">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <Link href="/institute" className="text-sm font-bold text-dena-brand hover:underline">
          بازگشت به خانهٔ مؤسسه
        </Link>
        <Link href="/account" className={buttonClassName("secondary")}>
          حساب من
        </Link>
      </header>

      <section className="rounded-[20px] bg-dena-lavender px-6 py-7 md:px-8">
        <p className="text-sm font-bold text-dena-brand">مشخصات تأییدشده</p>
        <h1 className="mt-2 text-[27px] font-extrabold leading-relaxed text-dena-deep md:text-[31px]">
          پروفایل مؤسسه
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-8 text-dena-muted">
          این صفحه نام و زمان تأیید داخلی دامنه‌های مؤسسهٔ متصل به حساب شما را نشان می‌دهد.
        </p>
      </section>

      <section aria-labelledby="institute-profile-scopes" className="space-y-4">
        <SectionHeading id="institute-profile-scopes">دامنه‌های فعال مؤسسه</SectionHeading>
        <ul className="grid gap-4 md:grid-cols-2">
          {entities.map((entity) => (
            <li key={entity.id}>
              <Card className="space-y-3 p-6">
                <h2 className="text-lg font-extrabold">{entity.name}</h2>
                <p className="text-sm text-dena-muted">
                  تأیید داخلی: {new Intl.DateTimeFormat("fa-IR", {
                    dateStyle: "long", timeZone: "Asia/Tehran",
                  }).format(entity.verifiedAt)}
                </p>
              </Card>
            </li>
          ))}
        </ul>
      </section>

      <Card className="space-y-3">
        <h2 className="font-extrabold">اطلاعات فقط‌خواندنی</h2>
        <p className="text-sm leading-7 text-dena-muted">
          این نسخه تغییر نام، جابه‌جایی دامنه یا مدیریت نمایندگان را پشتیبانی نمی‌کند.
        </p>
      </Card>
    </main>
  );
}
