import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { Card } from "../../../../components/ui/card";
import { getServerAccessContext } from "../../../../server/access/actor";
import { getProviderCollaborations } from "../../../../server/provider/collaborations";
import { collaborationPhases } from "../../../../lib/provider-collaboration-status";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata = { title: "وضعیت درخواست همکاری | دنا", robots: { index: false, follow: false } };
const eventLabels = {
  requested: "درخواست برای مؤسسه ارسال شد", institute_approved: "مؤسسه درخواست را پذیرفت",
  institute_rejected: "مؤسسه درخواست را رد کرد", dena_approved: "دنا همکاری را تأیید کرد",
  dena_rejected: "دنا درخواست را رد کرد", provider_withdrew: "درخواست پس گرفته شد",
};
const date = (value: Date) => new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Tehran" }).format(value);
export default async function CollaborationDetailPage({ params }: { params: Promise<{ collaborationId: string }> }) {
  if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET || !process.env.BETTER_AUTH_URL) redirect("/login");
  const actor = await getServerAccessContext();
  if (!actor) redirect("/login");
  const { collaborationId } = await params;
  if (!z.uuid().safeParse(collaborationId).success) notFound();
  const data = await getProviderCollaborations(actor.userId, collaborationId);
  const collaboration = data.collaborations[0];
  if (!collaboration) notFound();
  const phases = collaborationPhases(collaboration.status);
  return <main id="main-content" className="mx-auto min-h-screen max-w-7xl space-y-5 px-5 py-7 md:px-7">
    <header className="space-y-3"><Link href="/provider/collaborations" className="text-xs font-bold text-dena-brand">بازگشت به مؤسسهٔ ناظر</Link><h1 className="text-2xl font-extrabold text-dena-deep">وضعیت درخواست همکاری</h1><p className="text-sm text-dena-muted">{collaboration.instituteName} · ثبت در {date(collaboration.createdAt)}</p></header>
    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <Card className="space-y-4 rounded-xl p-5">
        <h2 className="text-base font-extrabold text-dena-deep">بررسی مؤسسه و دنا</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <section className="rounded-lg border border-dena-border p-4"><h3 className="text-sm font-bold">بررسی مؤسسه</h3><p className="mt-2 text-sm font-semibold text-dena-brand">{phases.institute}</p><p className="mt-3 whitespace-pre-wrap break-words text-xs leading-7 text-dena-muted">{collaboration.instituteDecisionReason ?? "هنوز تصمیمی از مؤسسه ثبت نشده است."}</p></section>
          <section className="rounded-lg border border-dena-border p-4"><h3 className="text-sm font-bold">بررسی دنا</h3><p className="mt-2 text-sm font-semibold text-dena-brand">{phases.dena}</p><p className="mt-3 whitespace-pre-wrap break-words text-xs leading-7 text-dena-muted">{collaboration.denaDecisionReason ?? "هنوز تصمیم نهایی دنا ثبت نشده است."}</p></section>
        </div>
        <p className="rounded-lg border-r-[3px] border-blue-500 bg-blue-50 p-4 text-xs leading-7 text-dena-deep">پس از پذیرش مؤسسه، دنا درخواست را بررسی می‌کند. تأیید همکاری جایگزین تأیید مستقل نظارت و انتشار هر دوره نیست.</p>
        <dl className="grid gap-3 sm:grid-cols-2"><div className="rounded-lg bg-dena-bg p-3"><dt className="text-xs text-dena-muted">شناسهٔ درخواست</dt><dd className="mt-2 break-all text-xs"><bdi>{collaboration.id}</bdi></dd></div><div className="rounded-lg bg-dena-bg p-3"><dt className="text-xs text-dena-muted">آخرین به‌روزرسانی</dt><dd className="mt-2 text-xs font-bold">{date(collaboration.updatedAt)}</dd></div></dl>
        {phases.approved && <Link href="/provider/courses" className="inline-flex rounded-lg bg-dena-brand px-4 py-3 text-sm font-bold text-white">رفتن به دوره‌های من</Link>}
      </Card>
      <Card className="space-y-4 rounded-xl p-5"><h2 className="text-base font-extrabold text-dena-deep">خط زمانی درخواست</h2>
        {collaboration.events.length ? <ol className="space-y-4">{collaboration.events.map((event) => <li key={event.id} className="border-b border-dena-border pb-4"><p className="text-sm font-bold text-dena-deep">{eventLabels[event.kind]}</p><time dateTime={event.createdAt.toISOString()} className="mt-2 block text-xs text-dena-muted">{date(event.createdAt)}</time>{event.reason && <p className="mt-2 whitespace-pre-wrap break-words text-xs leading-7 text-dena-muted">{event.reason}</p>}</li>)}</ol> : <p className="text-sm text-dena-muted">رویدادی برای این درخواست ثبت نشده است.</p>}
      </Card>
    </div>
  </main>;
}
