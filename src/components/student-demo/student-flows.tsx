"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { buttonClassName } from "@/components/ui/button";

const base = "/student-demo";

function PageTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return <header className="space-y-1 text-right"><h2 className="text-base font-extrabold text-dena-deep md:text-2xl">{title}</h2>{subtitle && <p className="text-xs leading-6 text-dena-muted md:text-sm md:leading-7">{subtitle}</p>}</header>;
}
function SectionTitle({ children }: { children: ReactNode }) {
  return <h3 className="text-right text-sm font-extrabold text-dena-deep md:text-base">{children}</h3>;
}
function DemoNote({ children = "این صفحه پیش‌نمایش است و اطلاعات به حساب واقعی متصل نیست." }: { children?: string }) {
  return <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-right text-xs leading-6 text-amber-900">{children}</p>;
}

function PrivacyPage() {
  return <div className="space-y-4">
    <PageTitle title="حریم خصوصی و داده‌ها" />
    <Card className="space-y-4 rounded-2xl p-4">
      <SectionTitle>اطلاعات حساب</SectionTitle>
      <div className="grid gap-3 border-t border-dena-border pt-3 sm:grid-cols-2">
        {[["نام و نام خانوادگی","محمد علوی"],["شماره موبایل","۰۹۱۲*******"],["پایه تحصیلی","پایه دهم"],["رشته تحصیلی","علوم تجربی"]].map(([k,v])=><div key={k} className="text-right"><p className="text-xs text-dena-muted">{k}</p><p className="mt-1 text-sm font-semibold text-dena-deep">{v}</p></div>)}
      </div>
    </Card>
    <Card className="space-y-3 rounded-2xl p-4">
      <SectionTitle>داده‌های یادگیری خصوصی</SectionTitle>
      <div className="rounded-xl bg-dena-lavender/60 p-3 text-right"><p className="text-sm font-bold text-dena-deep">یادداشت‌های شخصی شما فقط برای خودتان قابل مشاهده‌اند.</p><p className="mt-2 text-xs leading-6 text-dena-muted">یادداشت‌های شخصی یادگیری شما (مانند نکته‌برداری در ویدیوها) کاملاً خصوصی هستند و هیچ‌کس جز شما به آن‌ها دسترسی ندارد.</p></div>
    </Card>
    <Card className="space-y-3 rounded-2xl p-4">
      <SectionTitle>دسترسی‌ها و حریم خصوصی</SectionTitle>
      <p className="border-t border-dena-border pt-3 text-right text-xs leading-7 text-dena-muted">اطلاعات پیشرفت، ارزیابی و مسیر رشد شما براساس سطح دسترسی مجاز و ارتباط شما با بخش‌های مختلف اکوسیستم دنا نمایش داده می‌شود. شماره موبایل، اطلاعات احراز هویت و یادداشت‌های شخصی شما در هیچ گزارشی در اختیار سایرین قرار نمی‌گیرد.</p>
    </Card>
    <Link href={`${base}/profile`} className="inline-flex text-sm font-bold text-dena-brand">بازگشت به پروفایل ←</Link>
  </div>;
}

const notices = [
  ["آزمون یادگیری ریاضی دهم آماده شروع است","می‌توانی از بخش تمرین‌ها و آزمون‌ها شروع کنی.","۳ ساعت پیش","/student-demo/assessments"],
  ["نتیجه آزمون شیمی منتشر شد","نتیجه آزمون شما در بخش تمرین‌ها و آزمون‌ها قابل مشاهده است.","۵ ساعت پیش","/student-demo/assessments"],
  ["درس جدید در دوره فیزیک اضافه شد","بخش الکتریسیته ساکن به همراه تمرین‌های جدید اکنون فعال است.","۱ روز پیش","/student-demo/courses"],
  ["عضویت شما در باشگاه نخبگان فعال شد","اکنون می‌توانی وارد باشگاه نخبگان شوی.","۳ روز پیش","/student-demo/elite-club/member"],
  ["پاسخ پشتیبانی دریافت شد","پاسخ جدیدی برای درخواست پشتیبانی شما ثبت شد.","۱ هفته پیش","/student-demo/support/13649"],
];
function NotificationsPage({ empty = false }: { empty?: boolean }) {
  return <div className="space-y-4">
    <PageTitle title="اعلان‌ها" />
    {empty ? <Card className="grid min-h-[280px] place-items-center rounded-2xl p-6 text-center"><div><div className="mx-auto mb-4 grid size-14 place-items-center rounded-full bg-dena-lavender text-2xl text-dena-brand">♧</div><SectionTitle>اعلانی برای نمایش وجود ندارد</SectionTitle><p className="mt-2 text-xs text-dena-muted">اعلان‌های جدید در این بخش نمایش داده می‌شوند.</p></div></Card> :
      <div className="space-y-3">{notices.map(([title,desc,time,href],i)=><Link key={title} href={href} className="block"><Card className={`space-y-2 rounded-2xl p-4 ${i===0?"border-dena-brand/40":""}`}><div className="flex items-start justify-between gap-3"><span className="shrink-0 text-[11px] text-dena-muted">{time}</span><h3 className="text-right text-sm font-bold text-dena-deep">{title}</h3></div><p className="text-right text-xs leading-6 text-dena-muted">{desc}</p></Card></Link>)}</div>}
    <DemoNote>اعلان‌ها برای پیش‌نمایش هستند و از سرویس اعلان واقعی دریافت نمی‌شوند.</DemoNote>
  </div>;
}

function SupportList() {
  return <div className="space-y-4">
    <PageTitle title="پشتیبانی آنلاین دنا" subtitle="برای مسائل فنی و استفاده از دنا می‌توانی از این بخش با پشتیبانی در ارتباط باشی." />
    <Link href={`${base}/support/new`} className={buttonClassName()+" h-11 w-full md:w-auto"}>درخواست جدید</Link>
    <section className="space-y-3"><SectionTitle>درخواست‌های من</SectionTitle>
      {[
        ["13649","در انتظار پاسخ","۳ روز پیش","مشکل در پخش ویدیو"],
        ["13622","پاسخ داده شده","۱ هفته پیش","مشکل در نمایش نتیجه آزمون"],
      ].map(([id,status,time,title])=><Link key={id} href={`${base}/support/${id}`} className="block"><Card className="space-y-3 rounded-2xl p-4"><div className="flex items-center justify-between gap-2"><span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${status==="در انتظار پاسخ"?"bg-amber-50 text-amber-800":"bg-emerald-50 text-emerald-700"}`}>{status}</span><h3 className="text-right text-sm font-bold text-dena-deep">{title}</h3></div><p className="text-right text-xs text-dena-muted">#{id} · {time}</p></Card></Link>)}
    </section>
    <DemoNote>درخواست‌ها و پاسخ‌ها نمونه‌اند و به سامانهٔ پشتیبانی واقعی متصل نیستند.</DemoNote>
  </div>;
}
function SupportNew() {
  const [sent,setSent]=useState(false);
  if(sent) return <div className="space-y-4"><Card className="space-y-3 rounded-2xl p-5 text-right"><span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">درخواست ثبت شد</span><h2 className="text-lg font-extrabold text-dena-deep">درخواست نمونهٔ شما ارسال شد</h2><p className="text-sm leading-7 text-dena-muted">این تأیید فقط برای نمایش جریان فیگماست؛ داده‌ای به سامانه ارسال نشده است.</p></Card><Link href={`${base}/support`} className={buttonClassName()}>بازگشت به درخواست‌ها</Link></div>;
  return <div className="space-y-4"><PageTitle title="ثبت درخواست جدید پشتیبانی" /><Card className="space-y-4 rounded-2xl p-4"><label className="block space-y-2 text-right text-xs font-semibold text-dena-muted">موضوع درخواست<input placeholder="موضوع خود را وارد کنید..." className="w-full rounded-xl border border-dena-border bg-white px-3 py-3 text-sm font-normal text-dena-deep outline-none focus:border-dena-brand" /></label><label className="block space-y-2 text-right text-xs font-semibold text-dena-muted">پیام شما<textarea rows={6} placeholder="شرح مشکل یا سؤال خود را به طور کامل بنویسید..." className="w-full resize-y rounded-xl border border-dena-border bg-white px-3 py-3 text-sm font-normal leading-6 text-dena-deep outline-none focus:border-dena-brand" /></label><DemoNote>ارسال در این پیش‌نمایش به پشتیبانی واقعی انجام نمی‌شود.</DemoNote><div className="flex gap-2"><Link href={`${base}/support`} className="flex h-11 flex-1 items-center justify-center rounded-xl border border-dena-border text-sm font-semibold text-dena-muted">انصراف</Link><button onClick={()=>setSent(true)} className={buttonClassName()+" flex-1"}>ارسال درخواست</button></div></Card></div>;
}
function SupportDetail() {
  return <div className="space-y-4">
    <Card className="space-y-3 rounded-2xl p-4 text-right">
      <div className="flex items-center justify-between gap-2"><span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-800">در انتظار پاسخ</span><h2 className="font-extrabold text-dena-deep">مشکل در پخش ویدیو</h2></div>
      <p className="text-xs text-dena-muted">کد درخواست: #۱۳۶۴۹</p><p className="text-xs text-dena-muted">ثبت شده در ۳ روز پیش • بخش فنی</p>
    </Card>
    <div className="space-y-3">
      <Card className="max-w-[92%] space-y-2 rounded-2xl p-4 text-right"><p className="text-sm leading-7 text-dena-deep">سلام، من در بخش دوره‌های من وقتی روی ویدیوی درس اول فیزیک دهم کلیک می‌کنم، صفحه سیاه می‌ماند و ویدیو لود نمی‌شود. اینترنت من وصل است و بقیه صفحات لود می‌شوند. لطفاً راهنمایی کنید.</p><p className="text-[11px] text-dena-muted">محمد علوی • ۳ روز پیش</p></Card>
      <Card className="mr-auto max-w-[92%] space-y-2 rounded-2xl border-dena-lavender bg-dena-lavender/50 p-4 text-right"><p className="text-sm leading-7 text-dena-deep">سلام محمد عزیز، درخواست شما دریافت شد و تیم فنی در حال بررسی سرورهای پخش ویدیو است. لطفاً یک بار حافظهٔ کش مرورگر خود را پاک کرده یا از بخش تنظیمات اپلیکیشن کیفیت پخش را روی خودکار قرار دهید. نتیجه نهایی را به زودی اطلاع می‌دهیم.</p><p className="text-[11px] text-dena-muted">پشتیبانی دنا • ۳ روز پیش</p></Card>
    </div>
    <DemoNote>گفت‌وگوی نمونه است؛ امکان ارسال پیام واقعی در این نسخه وجود ندارد.</DemoNote>
    <Link href={`${base}/support`} className="text-sm font-bold text-dena-brand">بازگشت به درخواست‌ها ←</Link>
  </div>;
}

function ChangePhone({ step }: { step: string }) {
 const steps=[["شروع",base+"/profile/change-phone"],["شماره جدید",base+"/profile/change-phone/new"],["تأیید نهایی",base+"/profile/change-phone/otp"]];
 const active=step==="intro"?0:step==="new"?1:step==="otp"?2:3;
 if(step==="success") return <div className="space-y-4"><Card className="space-y-4 rounded-2xl p-6 text-center"><div className="mx-auto grid size-14 place-items-center rounded-full bg-emerald-50 text-2xl text-emerald-700">✓</div><h2 className="text-lg font-extrabold text-dena-deep">تغییر موفقیت‌آمیز شماره</h2><p className="text-sm leading-7 text-dena-muted">از این پس با شماره جدید <b className="text-dena-deep">۰۹۳۸***۱۲۳۴</b> وارد حساب خود شوید.</p><Link href={base+"/profile"} className={buttonClassName()}>بازگشت به پروفایل</Link></Card><DemoNote>وضعیت موفق فقط نمایشی است و شمارهٔ حساب واقعی تغییر نکرده است.</DemoNote></div>;
 return <div className="space-y-4"><div className="flex flex-row-reverse justify-between gap-2">{steps.map(([label,href],i)=><Link key={href} href={href} className={`flex-1 rounded-xl px-2 py-2 text-center text-[11px] font-bold ${active===i?"bg-dena-lavender text-dena-brand":"bg-white text-dena-muted"}`}><span className="ml-1">{i+1}</span>{label}</Link>)}</div>
 <Card className="space-y-4 rounded-2xl p-4">
 {step==="intro"?<><PageTitle title="تغییر شماره موبایل" subtitle="شماره موبایل شما به عنوان شناسه ورود به حساب دنا استفاده می‌شود. برای تغییر آن، مراحل تأیید هویت را طی کنید."/><div className="rounded-xl bg-dena-bg p-3 text-right"><p className="text-xs text-dena-muted">شماره فعلی شما</p><p dir="ltr" className="mt-1 text-sm font-bold text-dena-deep">۰۹۱۲***۴۵۶۷</p></div><Link href={base+"/profile/change-phone/new"} className={buttonClassName()+" w-full"}>شروع فرآیند تغییر</Link><Link href={base+"/profile"} className="block text-center text-sm text-dena-muted">بازگشت به پروفایل</Link></>:
 step==="new"?<><PageTitle title="شماره موبایل جدید" subtitle="شماره موبایل جدید خود را وارد کنید. کد تأیید به این شماره ارسال خواهد شد."/><label className="block space-y-2 text-right text-xs text-dena-muted">شماره موبایل جدید<input dir="ltr" readOnly value="۰۹۳۸۱۲۳۴۵۶۷" className="w-full rounded-xl border border-dena-border px-3 py-3 text-right text-sm text-dena-deep"/></label><Link href={base+"/profile/change-phone/otp"} className={buttonClassName()+" w-full"}>ارسال کد تأیید</Link><Link href={base+"/profile"} className="block text-center text-sm text-dena-muted">انصراف</Link></>:
 <><PageTitle title="تأیید شماره جدید" subtitle="کد تأیید ۶ رقمی ارسال شده به ۰۹۳۸***۱۲۳۴ را وارد کنید."/><div className="flex justify-center gap-2" dir="ltr">{Array.from({length:6},(_,i)=><span key={i} className="grid size-10 place-items-center rounded-lg border border-dena-border text-lg text-dena-muted">•</span>)}</div><p className="text-center text-xs text-dena-brand">ارسال مجدد کد</p><Link href={base+"/profile/change-phone/success"} className={buttonClassName()+" w-full"}>تأیید و تغییر شماره</Link><Link href={base+"/profile/change-phone/new"} className="block text-center text-sm text-dena-muted">ویرایش شماره</Link></>}
 </Card><DemoNote>مراحل نمایش داده می‌شوند؛ ارسال پیامک و تغییر شماره واقعی فعال نیست.</DemoNote></div>;
}

const clubConfigs = {
 education:{title:"حمایت آموزشی",subtitle:"آموزش‌ها و فرصت‌های غیردرسی برای رشد و توسعه اعضای باشگاه.",foot:"این آموزش‌ها مستقل از دوره‌های درسی دانش‌آموز هستند.",activeTitle:"کارگاه مهارت‌های ارتباطی",activeTag:"توسعه فردی",nextTitle:"دوره تفکر خلاق و حل مسئله",nextTag:"مهارت‌های نرم",detail:"این کارگاه برای تقویت مهارت‌های ارتباطی و بین‌فردی اعضای باشگاه نخبگان طراحی شده است.",cta:"ثبت‌نام در آموزش"},
 welfare:{title:"حمایت رفاهی",subtitle:"خدمات و حمایت‌های رفاهی تعریف‌شده برای اعضای باشگاه.",foot:"حمایت‌های رفاهی جدید پس از انتشار در این بخش نمایش داده می‌شوند.",activeTitle:"خدمت رفاهی نمونه",activeTag:"(تعیین‌شده توسط سیستم)",nextTitle:"خدمت رفاهی نمونه ۲",nextTag:"(تعیین‌شده توسط سیستم)",detail:"توضیحات این حمایت در صورت تعریف در این بخش نمایش داده می‌شود.",cta:"درخواست حمایت"},
 business:{title:"حمایت کسب‌وکار",subtitle:"فرصت‌ها و حمایت‌های مرتبط با مسیرهای کسب‌وکار اعضای باشگاه.",foot:"فرصت‌ها و حمایت‌های جدید پس از انتشار در این بخش نمایش داده می‌شوند.",activeTitle:"فرصت کسب‌وکار نمونه",activeTag:"نمونه نمایشی",nextTitle:"فرصت کسب‌وکار نمونه ۲",nextTag:"نمونه نمایشی",detail:"جزئیات این فرصت پس از تعریف و انتشار نمایش داده می‌شود.",cta:"اعلام علاقه‌مندی"},
};
function ClubCategory({ category, rest }: { category: keyof typeof clubConfigs; rest: string[] }) {
 const cfg=clubConfigs[category], root=base+"/elite-club/"+category;
 if(rest[0]==="state"){
  const name=rest[1]||"empty", labels:Record<string,string>={empty:"فعلاً مورد فعالی وجود ندارد","request-submitted":"درخواست ثبت شد",pending:"در انتظار بررسی",active:"وضعیت فعال","not-eligible":"شرایط لازم احراز نشده",ended:"این فرصت پایان یافته است"};
  return <div className="space-y-4"><PageTitle title={cfg.title} subtitle={cfg.subtitle}/><Card className="space-y-3 rounded-2xl p-5 text-center"><h3 className="font-extrabold text-dena-deep">{labels[name]||labels.empty}</h3><p className="text-sm leading-7 text-dena-muted">{name==="empty"?cfg.foot:"این وضعیت نمونه است و به پرونده یا درخواست واقعی متصل نیست."}</p><Link href={root} className={buttonClassName("outline")}>بازگشت</Link></Card></div>;
 }
 if(rest[0]==="detail"){
  return <div className="space-y-4"><Link href={root} className="text-xs font-bold text-dena-brand">بازگشت به {cfg.title} ←</Link><Card className="space-y-4 rounded-2xl p-4"><div className="flex items-center justify-between gap-2"><span className="rounded-full bg-dena-lavender px-2.5 py-1 text-[11px] font-bold text-dena-brand">نمونه نمایشی · فعال</span><h2 className="text-right font-extrabold text-dena-deep">{cfg.activeTitle}</h2></div>{[["نوع",cfg.activeTag],["ارائه‌دهنده","(تعیین‌شده توسط سیستم)"],["توضیحات",cfg.detail],["شرایط",category==="education"?"شرایط شرکت در صورت تعریف در این بخش نمایش داده می‌شود.":"شرایط استفاده در صورت تعریف در این بخش نمایش داده می‌شود."],["نحوه استفاده",category==="welfare"?"نحوه استفاده در صورت تعریف در این بخش نمایش داده می‌شود.":"در صورت نیاز، جزئیات اجرایی پس از تعریف نمایش داده می‌شود."]].map(([k,v])=><div key={k} className="border-t border-dena-border pt-3 text-right"><p className="text-xs text-dena-muted">{k}</p><p className="mt-1 text-sm leading-6 text-dena-deep">{v}</p></div>)}<Link href={root+"/state/request-submitted"} className={buttonClassName()+" w-full"}>{cfg.cta}</Link><p className="text-center text-xs text-dena-muted">{category==="welfare"?"نوع اقدام بسته به نوع حمایت متفاوت است.":"این اقدام در نسخهٔ نمایشی ثبت واقعی نمی‌کند."}</p></Card></div>;
 }
 return <div className="space-y-4"><PageTitle title={cfg.title} subtitle={cfg.subtitle}/>{category==="education"&&<p className="rounded-xl bg-dena-lavender/60 p-3 text-right text-xs leading-6 text-dena-muted">{cfg.foot}</p>}<div className="grid gap-3 md:grid-cols-2"><Card className="space-y-3 rounded-2xl p-4"><div className="flex items-center justify-between gap-2"><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">فعال</span><h3 className="text-right text-sm font-extrabold text-dena-deep">{cfg.activeTitle}</h3></div><p className="text-right text-xs text-dena-muted">{category==="education"?"حوزه آموزش · ":"نوع: "}{cfg.activeTag}</p><Link href={root+"/detail"} className="block text-right text-sm font-bold text-dena-brand">مشاهده جزئیات ←</Link></Card><Card className="space-y-3 rounded-2xl p-4 opacity-90"><div className="flex items-center justify-between gap-2"><span className="rounded-full bg-dena-bg px-2.5 py-1 text-[11px] font-bold text-dena-muted">به‌زودی</span><h3 className="text-right text-sm font-extrabold text-dena-deep">{cfg.nextTitle}</h3></div><p className="text-right text-xs text-dena-muted">{cfg.nextTag}</p><span className="block text-right text-sm text-dena-muted">مشاهده جزئیات</span></Card></div><p className="text-right text-xs leading-6 text-dena-muted">{cfg.foot}</p><div className="flex flex-wrap gap-2">{["empty","request-submitted","pending","active","not-eligible","ended"].map(x=><Link key={x} href={root+"/state/"+x} className="rounded-full border border-dena-border px-3 py-2 text-[11px] text-dena-muted">{x}</Link>)}</div></div>;
}

export function StudentFlowDemo({ kind, path = [] }: { kind: string; path?: string[] }) {
 if(kind==="privacy") return <PrivacyPage/>;
 if(kind==="notifications") return <NotificationsPage empty={path[0]==="empty"}/>;
 if(kind==="support") return path[0]==="new"?<SupportNew/>:path[0]?<SupportDetail/>:<SupportList/>;
 if(kind==="change-phone") return <ChangePhone step={path[0]||"intro"}/>;
 if(kind==="club-category" && (path[0]==="education"||path[0]==="welfare"||path[0]==="business")) return <ClubCategory category={path[0]} rest={path.slice(1)}/>;
 return null;
}
