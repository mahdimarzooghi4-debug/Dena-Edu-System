import Link from "next/link";
import { Card } from "../../../components/ui/card";
import { requireProviderAccess } from "../../../server/provider/require-access";
import { getProviderCollaborations } from "../../../server/provider/collaborations";
import { getProviderContact } from "../../../server/provider/contact-profile";
import { getProviderDashboardCourses } from "../../../server/provider/dashboard";
import { providerCategoryLabels } from "../../../lib/provider-profile";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata = { title: "خدمات و دامنهٔ مجاز | دنا", robots: { index: false, follow: false } };
export default async function ProviderServicesPage() {
  const { actor, providerIds } = await requireProviderAccess();
  const [collaborations, profiles, courseData] = await Promise.all([
    getProviderCollaborations(actor.userId), Promise.all(providerIds.map((id) => getProviderContact(actor.userId,id))),
    getProviderDashboardCourses(providerIds),
  ]);
  const approved = collaborations.collaborations.filter((item) => item.status === "approved");
  const categories = [...new Set(profiles.flatMap((profile) => profile?.categories ?? []))];
  return <main id="main-content" className="mx-auto min-h-screen max-w-7xl space-y-5 px-5 py-7 md:px-7">
    <header className="space-y-3"><p className="text-xs text-dena-muted">ارائه‌دهنده / دامنهٔ فعالیت</p><h1 className="text-2xl font-extrabold text-dena-deep">خدمات و دامنهٔ مجاز</h1><p className="text-sm leading-7 text-dena-muted">وضعیت ثبت‌شدهٔ همکاری با مؤسسه‌ها و نظارت مستقل هر دوره.</p></header>
    <div className="grid items-start gap-5 lg:grid-cols-2">
      <Card className="space-y-4 rounded-xl p-5"><h2 className="font-extrabold">مؤسسه‌های ناظر تأییدشده</h2>
        {approved.length ? <ul className="space-y-3">{approved.map((item) => <li key={item.id} className="rounded-lg bg-dena-bg p-4"><p className="text-sm font-bold">{item.instituteName}</p><Link href={`/provider/collaborations/${item.id}`} className="mt-2 inline-block text-xs font-bold text-dena-brand">جزئیات تأیید همکاری</Link></li>)}</ul> : <p className="text-sm leading-7 text-dena-muted">هنوز همکاری تأییدشده‌ای ندارید.</p>}
        <Link href="/provider/collaborations" className="inline-block text-sm font-bold text-dena-brand">مدیریت مؤسسهٔ ناظر</Link>
      </Card>
      <Card className="space-y-4 rounded-xl p-5"><h2 className="font-extrabold">دسته‌های خدمات درخواستی</h2><div className="flex flex-wrap gap-2">{categories.map((key) => <span key={key} className="rounded-md bg-dena-lavender px-3 py-2 text-xs font-bold text-dena-brand">{providerCategoryLabels[key as keyof typeof providerCategoryLabels] ?? key}</span>)}</div>
        {!categories.length && <p className="text-sm text-dena-muted">دسته‌ای در پروفایل انتخاب نشده است.</p>}
        <p className="text-xs leading-7 text-dena-muted">این دسته‌ها انتخاب‌های پروفایل هستند؛ تأیید همکاری، مجوز خودکار ارائهٔ این خدمات نیست.</p><Link href="/provider/profile" className="inline-block text-sm font-bold text-dena-brand">ویرایش پروفایل</Link>
      </Card>
    </div>
    <Card className="space-y-4 rounded-xl p-5"><h2 className="font-extrabold">وضعیت دوره‌ها در محدودهٔ نظارت</h2>
      {!courseData.courses.length ? <p className="text-sm text-dena-muted">دوره‌ای با درخواست نظارت ثبت‌شده وجود ندارد.</p> : <ul className="space-y-3">{courseData.courses.map((course) => <li key={course.courseId} className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-dena-bg p-4"><div><h3 className="text-sm font-bold">{course.title}</h3><p className="mt-1 text-xs text-dena-muted">{course.instituteName} · {course.supervisionStatus === "approved" ? "نظارت این دوره تأییدشده" : course.supervisionStatus === "requested" ? "در انتظار نظارت" : "نظارت لغوشده"}</p></div><Link href={`/provider/courses/${course.courseId}`} className="text-xs font-bold text-dena-brand">جزئیات دوره</Link></li>)}</ul>}
      {courseData.hasMore && <p className="text-xs text-dena-muted">این بخش ۲۰ دورهٔ اخیر را نمایش می‌دهد.</p>}
      <Link href="/provider/courses" className="inline-block text-sm font-bold text-dena-brand">فهرست و صفحه‌بندی همهٔ دوره‌ها</Link>
    </Card>
  </main>;
}
