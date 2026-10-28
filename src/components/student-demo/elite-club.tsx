import Link from "next/link";
import { Card } from "@/components/ui/card";
import { buttonClassName } from "@/components/ui/button";
import { SectionHeading } from "@/components/ui/section-heading";

type Props = { path: string[] };

const categories = [
  { slug: "teaching", title: "حمایت تدریس", description: "فرصت مشارکت به‌عنوان پشتیبان تحصیلی در مدارس و مؤسسه‌های همکار.", active: true },
  { slug: "education", title: "حمایت آموزشی", description: "فرصت‌های یادگیری و رشد آموزشی ویژهٔ اعضای باشگاه.", active: true },
  { slug: "business", title: "حمایت کسب‌وکار", description: "فرصت‌ها و حمایت‌های مرتبط با مسیرهای کسب‌وکار.", active: false },
  { slug: "welfare", title: "حمایت رفاهی", description: "خدمات و حمایت‌های رفاهی تعریف‌شده برای اعضای باشگاه.", active: true },
] as const;

const demoBanner = <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-semibold leading-7 text-amber-900">پیش‌نمایش فیگما · اطلاعات و وضعیت‌ها نمایشی‌اند؛ چیزی در پروندهٔ واقعی ثبت نمی‌شود.</div>;

function ClubHome() {
  return <div className="space-y-6">
    <section className="rounded-[22px] bg-dena-lavender p-6 md:p-8">
      <p className="text-sm font-bold text-dena-brand">باشگاه نخبگان</p>
      <h2 className="mt-2 text-2xl font-extrabold text-dena-deep">فضایی ویژه برای فرصت‌ها و مسیرهای رشد بیشتر در دنا.</h2>
      <p className="mt-3 max-w-3xl text-sm leading-8 text-dena-muted">باشگاه نخبگان فضایی برای دسترسی دانش‌آموزان منتخب به فرصت‌ها و برنامه‌هایی است که در چارچوب دنا تعریف می‌شوند.</p>
      <div className="mt-5 flex flex-wrap gap-3">
        <Link href="/student-demo/elite-club/registration" className={buttonClassName()}>ثبت‌نام در باشگاه</Link>
        <Link href="/student-demo/elite-club/member" className={buttonClassName("outline")}>پیش‌نمایش حالت عضو</Link>
      </div>
    </section>
    <Card className="space-y-3 rounded-[20px] p-5 md:p-6">
      <h3 className="font-extrabold text-dena-deep">شما هنوز در باشگاه نخبگان ثبت‌نام نکرده‌اید.</h3>
      <p className="text-sm leading-7 text-dena-muted">برای شروع، توضیحات ثبت‌نام را ببینید و سپس به ارزیابی نمونه بروید.</p>
      <Link href="/student-demo/elite-club/registration" className="inline-flex text-sm font-bold text-dena-brand">ثبت‌نام در باشگاه ←</Link>
    </Card>
    <Card className="space-y-2 rounded-[20px] p-5 md:p-6"><h3 className="font-bold text-dena-deep">باشگاه نخبگان چه فضایی است؟</h3><p className="text-sm leading-8 text-dena-muted">باشگاه نخبگان فضایی برای دسترسی دانش‌آموزان منتخب به فرصت‌ها و برنامه‌هایی است که در چارچوب دنا تعریف می‌شوند.</p></Card>
  </div>;
}

function MemberHome() {
  return <div className="space-y-6">
    <section className="rounded-[22px] bg-dena-lavender p-6 md:p-8"><p className="text-sm font-bold text-dena-brand">باشگاه نخبگان</p><h2 className="mt-2 text-2xl font-extrabold text-dena-deep">فضایی ویژه برای فرصت‌ها و مسیرهای رشد بیشتر در دنا.</h2><p className="mt-2 text-sm leading-7 text-dena-muted">این صفحه، حالت عضو در طرح فیگما را برای بازبینی بصری نشان می‌دهد.</p></section>
    <Card className="flex flex-wrap items-center justify-between gap-3 rounded-[20px] p-5"><div><h3 className="font-extrabold text-dena-deep">وضعیت من در باشگاه</h3><p className="mt-2 text-sm text-dena-muted">شما عضو باشگاه نخبگان دنا هستید.</p></div><span className="rounded-full bg-dena-mint/30 px-4 py-2 text-sm font-bold text-dena-deep">عضو باشگاه · نمونه</span></Card>
    <section className="space-y-4"><SectionHeading id="club-supports">حمایت‌های باشگاه</SectionHeading><div className="grid gap-4 md:grid-cols-2">{categories.map((item)=><Card key={item.slug} className="space-y-4 rounded-[20px] p-5 md:p-6"><div className="flex items-start justify-between gap-3"><h3 className="font-extrabold text-dena-deep">{item.title}</h3><span className="rounded-full bg-dena-lavender px-3 py-1 text-xs font-bold text-dena-brand">{item.active ? "فرصت فعال" : "بدون فرصت فعال"}</span></div><p className="text-sm leading-7 text-dena-muted">{item.description}</p><Link href={`/student-demo/elite-club/${item.slug}`} className={buttonClassName("outline")}>مشاهده فرصت‌ها</Link></Card>)}</div></section>
    <Link href="/student-demo/elite-club" className="inline-flex text-sm font-bold text-dena-brand">نمایش حالت ثبت‌نام‌نشده</Link>
  </div>;
}

function Registration() {
 return <div className="mx-auto max-w-3xl space-y-5"><Card className="space-y-5 rounded-[22px] p-6 md:p-8"><p className="text-sm font-bold text-dena-brand">باشگاه نخبگان</p><h2 className="text-2xl font-extrabold text-dena-deep">ثبت‌نام در باشگاه نخبگان</h2><p className="text-sm leading-8 text-dena-muted">باشگاه نخبگان دنا فضایی برای رشد استعدادها، ارتباط و هم‌افزایی و شکل‌گیری فرصت‌های تازه است.</p><div className="rounded-2xl bg-dena-lavender p-5"><h3 className="font-bold text-dena-deep">پیش از ثبت‌نام</h3><p className="mt-2 text-sm leading-7 text-dena-muted">ثبت‌نام، آغاز فرایند ارزیابی عضویت در باشگاه است. لطفاً برای پاسخ به سؤال‌های ارزیابی صبور و دقیق باشید.</p></div><div className="flex flex-wrap gap-3"><Link href="/student-demo/elite-club" className={buttonClassName("outline")}>انصراف</Link><Link href="/student-demo/elite-club/registration/confirmation" className={buttonClassName()}>ثبت‌نام و ادامه</Link></div></Card></div>;
}

function EvalPage({ step }: { step: string }) {
 const flow: Record<string,{title:string;desc:string;next:string;cta:string}> = {
  evaluation:{title:"ارزیابی عضویت",desc:"این ارزیابی نمونه برای نمایش مسیر طراحی‌شده در فیگماست. پاسخ‌ها ذخیره یا به سامانه ارسال نمی‌شوند.",next:"question/1",cta:"شروع ارزیابی"},
  "question/1":{title:"ارزیابی عضویت · سؤال ۱ از ۳",desc:"کدام فعالیت را برای رشد مهارت‌های خود بیشتر می‌پسندید؟",next:"question/2",cta:"ثبت پاسخ و ادامه"},
  "question/2":{title:"ارزیابی عضویت · سؤال ۲ از ۳",desc:"در یک فعالیت گروهی، معمولاً کدام نقش را ترجیح می‌دهید؟",next:"question/3",cta:"ثبت پاسخ و ادامه"},
  "question/3":{title:"ارزیابی عضویت · سؤال ۳ از ۳",desc:"برای یادگیری یک موضوع تازه، کدام روش را انتخاب می‌کنید؟",next:"review",cta:"مرور پاسخ‌ها"},
  review:{title:"مرور ارزیابی",desc:"پاسخ‌های نمونه آمادهٔ بررسی هستند. در نسخهٔ واقعی، این مرحله باید پیش از ارسال نهایی امکان بازبینی و اصلاح پاسخ‌ها را فراهم کند.",next:"submit",cta:"تأیید و ارسال"},
  submit:{title:"تأیید ارسال ارزیابی",desc:"با ادامه، ارزیابی نمونه به وضعیت «ارسال‌شده» می‌رود؛ هیچ داده‌ای به سرور ارسال نمی‌شود.",next:"submitted",cta:"ارسال ارزیابی"},
  submitted:{title:"ارزیابی ارسال شد",desc:"در طرح فیگما، پس از ثبت ارزیابی وضعیت در انتظار بررسی نمایش داده می‌شود.",next:"pending",cta:"مشاهده وضعیت"},
  pending:{title:"ارزیابی در حال بررسی است",desc:"وضعیت نمونه: نتیجهٔ ارزیابی هنوز اعلام نشده است.",next:"result",cta:"پیش‌نمایش نتیجه"},
  result:{title:"نتیجهٔ ارزیابی",desc:"این نمای نمونهٔ نتیجه است. نتیجهٔ واقعی عضویت فقط باید از سرویس رسمی دریافت شود.",next:"member",cta:"بازگشت به باشگاه"},
 };
 const item=flow[step];
 if(!item) return <ClubHome />;
 const href=item.next==="member"?"/student-demo/elite-club/member":`/student-demo/elite-club/evaluation/${item.next}`;
 return <div className="mx-auto max-w-3xl space-y-5"><Card className="space-y-5 rounded-[22px] p-6 md:p-8"><p className="text-sm font-bold text-dena-brand">باشگاه نخبگان · فرایند عضویت</p><h2 className="text-2xl font-extrabold text-dena-deep">{item.title}</h2><p className="text-sm leading-8 text-dena-muted">{item.desc}</p>{step.startsWith("question/")&&<div className="grid gap-3 sm:grid-cols-2">{["گزینهٔ اول", "گزینهٔ دوم", "گزینهٔ سوم", "گزینهٔ چهارم"].map((x,i)=><div key={i} className="rounded-xl border border-dena-border p-4 text-sm font-semibold">{x}</div>)}</div>}<div className="h-2 overflow-hidden rounded-full bg-dena-lavender"><div className="h-full rounded-full bg-dena-brand" style={{width:step.startsWith("question/")?`${Number(step.split("/")[1])*25}%`:step==="evaluation"?"8%":"100%"}}/></div><div className="flex flex-wrap gap-3"><Link href={href} className={buttonClassName()}>{item.cta}</Link><Link href="/student-demo/elite-club" className={buttonClassName("outline")}>بازگشت به باشگاه</Link></div></Card></div>;
}

function Opportunities({ category, detail }: {category:string;detail:boolean}) {
 const item=categories.find(x=>x.slug===category);
 if(!item) return null;
 const active=category!=="business";
 const title=category==="teaching"?"پشتیبان تحصیلی ریاضی":category==="education"?"کارگاه مهارت‌های یادگیری":category==="welfare"?"بستهٔ خدمات رفاهی":"فرصت کسب‌وکار دانش‌آموزی";
 return detail?<div className="space-y-5"><Link href={`/student-demo/elite-club/${category}`} className="text-sm font-bold text-dena-brand">بازگشت به فرصت‌ها ←</Link><Card className="space-y-5 rounded-[22px] p-6 md:p-8"><p className="text-sm font-bold text-dena-brand">{item.title}</p><h2 className="text-2xl font-extrabold text-dena-deep">{category==="teaching"?"پشتیبان تحصیلی پایه دهم ریاضی":title}</h2><div className="grid gap-3 sm:grid-cols-2"><p className="rounded-xl bg-dena-lavender p-4 text-sm">مؤسسه: آموزشگاه البرز</p><p className="rounded-xl bg-dena-lavender p-4 text-sm">پایه: دهم دورهٔ دوم متوسطه</p></div><p className="text-sm leading-8 text-dena-muted">{category==="teaching"?"این فرصت نمونه برای همکاری اعضای باشگاه به‌عنوان پشتیبان تحصیلی در آموزشگاه البرز است. شرایط همکاری توسط مدرسه تعریف می‌شود.":item.description}</p><p className="text-xs leading-6 text-dena-muted">اعلام علاقه‌مندی به‌معنای پذیرش نهایی نیست؛ این تعامل در حالت پیش‌نمایش ثبت نمی‌شود.</p><Link href={`/student-demo/elite-club/${category}/interest-submitted`} className={buttonClassName()}>اعلام علاقه‌مندی</Link></Card></div>:<div className="space-y-5"><Link href="/student-demo/elite-club/member" className="text-sm font-bold text-dena-brand">بازگشت به باشگاه ←</Link><section className="rounded-[22px] bg-dena-lavender p-6"><p className="text-sm font-bold text-dena-brand">باشگاه نخبگان</p><h2 className="mt-2 text-2xl font-extrabold text-dena-deep">{item.title}</h2><p className="mt-2 text-sm leading-7 text-dena-muted">{item.description}</p></section>{active?<Card className="space-y-4 rounded-[20px] p-5 md:p-6"><div className="flex flex-wrap justify-between gap-3"><h3 className="font-extrabold text-dena-deep">{title}</h3><span className="rounded-full bg-dena-mint/30 px-3 py-1 text-xs font-bold">فرصت فعال</span></div><p className="text-sm text-dena-muted">{category==="teaching"?"آموزشگاه البرز · ریاضی دهم":"فرصت نمونه برای اعضای باشگاه"}</p><Link href={`/student-demo/elite-club/${category}/opportunity`} className={buttonClassName("outline")}>مشاهده جزئیات</Link></Card>:<Card className="p-6 text-sm leading-7 text-dena-muted">در حال حاضر فرصت فعالی برای نمایش وجود ندارد.</Card>}</div>;
}

function StatusPage({ status, category }: {status:string;category?:string}) {
 const names:Record<string,string>={ "interest-submitted":"علاقه‌مندی ثبت شد","request-submitted":"درخواست ثبت شد",pending:"در انتظار بررسی",active:"فرصت فعال",empty:"فرصتی برای نمایش وجود ندارد","not-eligible":"شرایط این فرصت را ندارید",ended:"این فرصت پایان یافته است"};
 return <div className="mx-auto max-w-3xl"><Card className="space-y-4 rounded-[22px] p-6 md:p-8"><p className="text-sm font-bold text-dena-brand">باشگاه نخبگان · وضعیت نمونه</p><h2 className="text-2xl font-extrabold text-dena-deep">{names[status]||"وضعیت فرصت"}</h2><p className="text-sm leading-7 text-dena-muted">این حالت برای تطبیق با فریم‌های وضعیت فیگماست و تغییری در درخواست یا عضویت واقعی ایجاد نمی‌کند.</p><div className="flex flex-wrap gap-3"><Link href={category?`/student-demo/elite-club/${category}`:"/student-demo/elite-club"} className={buttonClassName()}>بازگشت</Link>{category&&<Link href={`/student-demo/elite-club/${category}/status/pending`} className={buttonClassName("outline")}>دیدن حالت‌های دیگر</Link>}</div>{category&&<div className="flex flex-wrap gap-2 pt-2">{Object.keys(names).map(x=><Link key={x} href={`/student-demo/elite-club/${category}/status/${x}`} className="rounded-full border border-dena-border px-3 py-2 text-xs font-semibold text-dena-muted">{names[x]}</Link>)}</div>}</Card></div>;
}

export function EliteClubDemo({ path }: Props) {
 if(path.length===0) return <>{demoBanner}<div className="mt-5"><ClubHome/></div></>;
 if(path[0]==="member") return <>{demoBanner}<div className="mt-5"><MemberHome/></div></>;
 if(path[0]==="registration") {
  const confirm=path[1]==="confirmation";
  return <>{demoBanner}<div className="mt-5">{confirm?<StatusPage status="request-submitted"/>:<Registration/>}{confirm&&<div className="mx-auto mt-4 max-w-3xl"><Link href="/student-demo/elite-club/evaluation" className={buttonClassName()}>ادامه به ارزیابی</Link></div>}</div></>;
 }
 if(path[0]==="evaluation") return <>{demoBanner}<div className="mt-5"><EvalPage step={path.slice(1).join("/")||"evaluation"}/></div></>;
 const category=path[0];
 if(categories.some(x=>x.slug===category)){
  if(path[1]==="status"&&path[2]) return <>{demoBanner}<div className="mt-5"><StatusPage status={path[2]} category={category}/></div></>;
  if(path[1]==="interest-submitted") return <>{demoBanner}<div className="mt-5"><StatusPage status="interest-submitted" category={category}/></div></>;
  return <>{demoBanner}<div className="mt-5"><Opportunities category={category} detail={path.length>1}/></div></>;
 }
 return <>{demoBanner}<div className="mt-5"><ClubHome/></div></>;
}
