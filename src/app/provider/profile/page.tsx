import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Card } from "../../../components/ui/card";
import { ProviderContactForm } from "../../../components/provider/contact-profile-form";
import { ProviderSetupProgress } from "../../../components/provider/setup-progress";
import { getProviderContact } from "../../../server/provider/contact-profile";
import { getProviderProfile } from "../../../server/provider/profile";
import { requireProviderAccess } from "../../../server/provider/require-access";
import { getLatestProviderCollaboration } from "../../../server/provider/latest-collaboration";
import { collaborationPhases } from "../../../lib/provider-collaboration-status";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title:"پروفایل ارائه‌دهنده | دنا",robots:{index:false,follow:false} };
export default async function ProviderProfilePage() {
  const {actor,providerIds} = await requireProviderAccess();
  const entities = await getProviderProfile(providerIds);
  if (!entities.length) notFound();
  const profiles = await Promise.all(entities.map(async (entity) => ({
    entity, profile:await getProviderContact(actor.userId,entity.id),
    collaboration:await getLatestProviderCollaboration(actor.userId,entity.id),
  })));
  return <main id="main-content" className="mx-auto min-h-screen max-w-7xl space-y-6 px-5 py-7 md:px-7">
    <header className="space-y-3"><p className="text-xs text-dena-muted">ارائه‌دهنده / هویت و برند</p><h1 className="text-[27px] font-extrabold text-dena-deep">پروفایل ارائه‌دهنده</h1><p className="text-sm leading-7 text-dena-muted">اطلاعات برند و تماس خود را تکمیل کنید و مراحل همکاری با مؤسسهٔ ناظر را پیگیری کنید.</p></header>
    {profiles.map(({entity,profile,collaboration}) => profile && <section key={entity.id} aria-label={`پروفایل ${entity.name}`} className="space-y-5">
      {entities.length > 1 && <h2 className="text-lg font-extrabold text-dena-deep">{entity.name}</h2>}
      <ProviderSetupProgress providerId={entity.id} saved={profile.revision >= 0} hasCategories={profile.categories.length>0} hasRequest={Boolean(collaboration)} />
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.75fr)_minmax(0,1fr)]">
        <ProviderContactForm profile={profile} />
        <aside className="space-y-4">
          <Card className="space-y-4 rounded-xl p-5"><header><p className="text-xs text-dena-muted">اطلاعات تأییدشدهٔ سامانه</p><h2 className="mt-1 font-extrabold text-dena-deep">وضعیت بررسی هویت</h2></header>
            <p className="rounded-lg border-r-[3px] border-blue-500 bg-blue-50 p-3.5 text-xs leading-7 text-dena-deep">مدارک هویتی از مسیر کنترل‌شده بررسی می‌شوند. مراجع محرمانهٔ مدارک در این صفحه نمایش داده نمی‌شوند.</p>
            <dl className="space-y-3"><div className="rounded-lg bg-emerald-50 p-3"><dt className="text-xs text-dena-muted">نام عمومی تأییدشده</dt><dd className="mt-2 text-sm font-bold text-emerald-800">{entity.name}</dd></div><div className="rounded-lg bg-dena-bg p-3"><dt className="text-xs text-dena-muted">تاریخ تأیید داخلی</dt><dd className="mt-2 text-xs font-bold">{new Intl.DateTimeFormat("fa-IR",{dateStyle:"long",timeZone:"Asia/Tehran"}).format(entity.verifiedAt)}</dd></div><div className="rounded-lg bg-dena-bg p-3"><dt className="text-xs text-dena-muted">اطلاعات پروفایل</dt><dd className="mt-2 text-xs font-bold">{profile.revision >= 0 ? "ذخیره‌شده" : "هنوز ذخیره نشده"}</dd></div></dl>
            <p className="text-xs leading-7 text-dena-muted">تأیید هویت، مجوز مستقل آموزشی یا تأیید خودکار دسته‌های خدمات نیست.</p>
          </Card>
          <Card className="space-y-3 rounded-xl p-5"><h2 className="font-extrabold">وضعیت همکاری و قدم بعدی</h2>
            {collaboration ? <><p className="text-sm font-bold text-dena-deep">{collaboration.institute_name}</p><p className="text-xs leading-7 text-dena-muted">مؤسسه: {collaborationPhases(collaboration.status).institute}<br />دنا: {collaborationPhases(collaboration.status).dena}</p><Link href={`/provider/collaborations/${collaboration.id}`} className="inline-block text-sm font-bold text-dena-brand">مشاهدهٔ نتیجه و خط زمانی</Link>
              {(["withdrawn","institute_rejected","dena_rejected"] as string[]).includes(collaboration.status) && <Link href="/provider/collaborations" className="block text-sm font-bold text-dena-brand">انتخاب مؤسسه و ثبت درخواست تازه</Link>}</> : <><p className="text-sm leading-7 text-dena-muted">پس از ذخیرهٔ پروفایل، مؤسسهٔ ناظر را انتخاب و درخواست همکاری را ارسال کنید.</p><Link href="/provider/collaborations" className="inline-block text-sm font-bold text-dena-brand">انتخاب مؤسسهٔ ناظر</Link></>}
          </Card>
        </aside>
      </div>
    </section>)}
  </main>;
}
