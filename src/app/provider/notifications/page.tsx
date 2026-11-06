import Link from "next/link";
import { notFound } from "next/navigation";
import { Card } from "../../../components/ui/card";
import { SupportNotifications } from "../../../components/support/support-notifications";
import { requireProviderAccess } from "../../../server/provider/require-access";
import { getProviderCollaborationEvents } from "../../../server/provider/collaboration-events";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata = { title: "اعلان‌های ارائه‌دهنده | دنا", robots: { index: false, follow: false } };
const labels = { requested:"درخواست همکاری ارسال شد", institute_approved:"مؤسسه درخواست را پذیرفت", institute_rejected:"مؤسسه درخواست را رد کرد", dena_approved:"همکاری در دنا تأیید شد", dena_rejected:"درخواست در دنا رد شد", provider_withdrew:"درخواست پس گرفته شد" };
export default async function ProviderNotificationsPage({searchParams}:{searchParams:Promise<{cursor?:string}>}) {
  const { actor } = await requireProviderAccess();
  const {cursor} = await searchParams;
  const data = await getProviderCollaborationEvents(actor.userId,cursor);
  if (data.invalidCursor) notFound();
  const {events} = data;
  return <main id="main-content" className="mx-auto min-h-screen max-w-7xl space-y-6 px-5 py-7 md:px-7">
    <header className="space-y-3"><p className="text-xs text-dena-muted">ارائه‌دهنده / پیگیری‌ها</p><h1 className="text-2xl font-extrabold text-dena-deep">اعلان‌ها و رویدادها</h1></header>
    <SupportNotifications />
    <section className="space-y-4" aria-labelledby="collaboration-events"><h2 id="collaboration-events" className="text-lg font-extrabold">رویدادهای همکاری با مؤسسه</h2><p className="text-xs text-dena-muted">هر صفحه ۵۰ رویداد؛ این بخش تاریخچهٔ همکاری است و وضعیت خوانده‌شدن جداگانه ندارد.</p>
      {events.length ? <ol className="space-y-3">{events.map((event) => <li key={event.id}><Card className="space-y-2 rounded-xl p-5"><h3 className="text-sm font-bold">{labels[event.kind]}</h3><p className="text-xs text-dena-muted">{event.instituteName}</p><time dateTime={event.createdAt.toISOString()} className="block text-xs text-dena-muted">{new Intl.DateTimeFormat("fa-IR",{dateStyle:"medium",timeStyle:"short",timeZone:"Asia/Tehran"}).format(event.createdAt)}</time><Link href={`/provider/collaborations/${event.collaborationId}`} className="inline-block text-sm font-bold text-dena-brand">مشاهدهٔ درخواست</Link></Card></li>)}</ol> : <Card><p className="text-sm text-dena-muted">رویداد همکاری ثبت‌شده‌ای وجود ندارد.</p></Card>}
      <nav aria-label="صفحه‌بندی رویدادهای همکاری" className="flex justify-between gap-3 text-sm font-bold text-dena-brand">
        {cursor ? <Link href="/provider/notifications">تازه‌ترین رویدادها</Link> : <span />}
        {data.nextCursor && <Link href={`/provider/notifications?cursor=${encodeURIComponent(data.nextCursor)}`}>رویدادهای قدیمی‌تر</Link>}
      </nav>
    </section>
  </main>;
}
