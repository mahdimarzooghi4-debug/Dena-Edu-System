import Link from "next/link";
import { Card } from "../../../components/ui/card";
import { SupportNotifications } from "../../../components/support/support-notifications";
import { requireProviderAccess } from "../../../server/provider/require-access";
import { getProviderCollaborations } from "../../../server/provider/collaborations";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata = { title: "اعلان‌های ارائه‌دهنده | دنا", robots: { index: false, follow: false } };
const labels = { requested:"درخواست همکاری ارسال شد", institute_approved:"مؤسسه درخواست را پذیرفت", institute_rejected:"مؤسسه درخواست را رد کرد", dena_approved:"همکاری در دنا تأیید شد", dena_rejected:"درخواست در دنا رد شد", provider_withdrew:"درخواست پس گرفته شد" };
export default async function ProviderNotificationsPage() {
  const { actor } = await requireProviderAccess();
  const data = await getProviderCollaborations(actor.userId);
  const events = data.collaborations.flatMap((item) => item.events.map((event) => ({...event,collaborationId:item.id,instituteName:item.instituteName})))
    .sort((a,b) => b.createdAt.getTime()-a.createdAt.getTime() || b.id.localeCompare(a.id)).slice(0,50);
  return <main id="main-content" className="mx-auto min-h-screen max-w-7xl space-y-6 px-5 py-7 md:px-7">
    <header className="space-y-3"><p className="text-xs text-dena-muted">ارائه‌دهنده / پیگیری‌ها</p><h1 className="text-2xl font-extrabold text-dena-deep">اعلان‌ها و رویدادها</h1></header>
    <SupportNotifications />
    <section className="space-y-4" aria-labelledby="collaboration-events"><h2 id="collaboration-events" className="text-lg font-extrabold">رویدادهای همکاری با مؤسسه</h2><p className="text-xs text-dena-muted">۵۰ رویداد اخیر از ۱۰۰ درخواست اخیر؛ این بخش تاریخچهٔ همکاری است و وضعیت خوانده‌شدن جداگانه ندارد.</p>
      {events.length ? <ol className="space-y-3">{events.map((event) => <li key={event.id}><Card className="space-y-2 rounded-xl p-5"><h3 className="text-sm font-bold">{labels[event.kind]}</h3><p className="text-xs text-dena-muted">{event.instituteName}</p><time dateTime={event.createdAt.toISOString()} className="block text-xs text-dena-muted">{new Intl.DateTimeFormat("fa-IR",{dateStyle:"medium",timeStyle:"short",timeZone:"Asia/Tehran"}).format(event.createdAt)}</time><Link href={`/provider/collaborations/${event.collaborationId}`} className="inline-block text-sm font-bold text-dena-brand">مشاهدهٔ درخواست</Link></Card></li>)}</ol> : <Card><p className="text-sm text-dena-muted">رویداد همکاری ثبت‌شده‌ای وجود ندارد.</p></Card>}
    </section>
  </main>;
}
