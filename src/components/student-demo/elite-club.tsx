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
 const questions=[
  "معرفی کوتاهی از خود و علاقه‌مندی‌هایتان بنویسید.",
  "به نظر شما چه مسئله‌ای در مدرسه یا جامعه نیاز به راه‌حل دارد؟",
  "فکر می‌کنید خلاقیت و کارآفرینی چگونه می‌تواند در بهبود مسیر تحصیلی شما مؤثر باشد؟",
  "در یک فعالیت گروهی، چه نقشی می‌توانید بر عهده بگیرید؟",
  "برای توسعه استعدادهای خود چه برنامه‌ای دارید؟",
  "چرا علاقه‌مند به عضویت در باشگاه نخبگان هستید؟",
 ];
 const questionMatch=step.match(/^question\/(\d+)$/);
 const questionNumber=questionMatch?Number(questionMatch[1]):0;
 const questionHref=(n:number)=>`/student-demo/elite-club/evaluation/question/${n}`;
 const panel=(title:string,description:string,children?:React.ReactNode)=><div className="mx-auto max-w-3xl space-y-4"><Card className="space-y-4 rounded-2xl p-4 md:rounded-[22px] md:p-8"><p className="text-sm font-bold text-dena-brand">باشگاه نخبگان</p><h2 className="text-lg font-extrabold text-dena-deep md:text-2xl">{title}</h2><p className="text-sm leading-7 text-dena-muted">{description}</p>{children}</Card></div>;
 if(step===""||step==="intro") return panel("ارزیابی باشگاه نخبگان","این ارزیابی بخشی از فرایند عضویت در باشگاه نخبگان است. به سوالات با دقت و تمرکز پاسخ دهید.",<><div className="grid gap-3 sm:grid-cols-3">{["نگاه بنیادی‌شناسه","ارتباط و هم‌افزایی","رشد استعدادها"].map((x,i)=><div key={x} className="rounded-xl bg-dena-lavender p-3 text-right"><span className="text-xs font-bold text-dena-brand">۰{i+1}</span><p className="mt-2 text-sm font-semibold text-dena-deep">{x}</p></div>)}</div><DemoClubNotice/><Link href={questionHref(1)} className={buttonClassName()+" w-full"}>شروع ارزیابی</Link></>);
 if(questionNumber>=1&&questionNumber<=6){
  const progress=questionNumber/6*100;
  return panel("ارزیابی باشگاه نخبگان",`مرحله ${questionNumber.toLocaleString("fa-IR")} از ۶`,<><div className="h-2 overflow-hidden rounded-full bg-dena-lavender"><div className="h-full rounded-full bg-dena-brand" style={{width:`${progress}%`}}/></div><label className="block space-y-2 text-right"><span className="text-sm font-semibold text-dena-deep">سؤال {questionNumber.toLocaleString("fa-IR")}: {questions[questionNumber-1]}</span><span className="block text-xs leading-6 text-dena-muted">پاسخ خود را به صورت تشریحی و خلاصه در کادر زیر بنویسید.</span><textarea rows={5} placeholder="پاسخ خود را اینجا بنویسید..." className="w-full resize-y rounded-xl border border-dena-border bg-white p-3 text-sm leading-7 outline-none focus:border-dena-brand"/></label><div className="flex flex-row-reverse gap-3">{questionNumber<6?<Link href={questionHref(questionNumber+1)} className={buttonClassName()+" flex-1"}>بعدی</Link>:<Link href="/student-demo/elite-club/evaluation/review" className={buttonClassName()+" flex-1"}>مرور پاسخ‌ها</Link>}{questionNumber>1&&<Link href={questionHref(questionNumber-1)} className={buttonClassName("outline")+" flex-1"}>قبلی</Link>}</div><DemoClubNotice/></>);
 }
 if(step==="review") return panel("مرور پاسخ‌ها","پاسخ‌های ثبت‌شده را مرور کرده و در صورت نیاز ویرایش کنید.",<><div className="space-y-3">{questions.map((q,i)=><div key={q} className="rounded-xl border border-dena-border p-3 text-right"><div className="flex items-center justify-between gap-2"><Link href={questionHref(i+1)} className="text-xs font-bold text-dena-brand">ویرایش پاسخ</Link><h3 className="text-sm font-bold text-dena-deep">سؤال {i+1} ارزیابی عضویت</h3></div><p className="mt-2 text-xs leading-6 text-dena-muted">پاسخ داده‌شده به این سؤال به صورت خلاصه در اینجا قرار می‌گیرد...</p></div>)}</div><Link href="/student-demo/elite-club/evaluation/confirm-submit" className={buttonClassName()+" w-full"}>ثبت نهایی ارزیابی</Link><DemoClubNotice/></>);
 if(step==="confirm-submit") return panel("ثبت نهایی ارزیابی","پس از ثبت، ارزیابی برای بررسی ارسال می‌شود. در این پیش‌نمایش پاسخ‌ها به پرونده‌ای ارسال نمی‌شوند.",<div className="flex gap-3"><Link href="/student-demo/elite-club/evaluation/review" className={buttonClassName("outline")+" flex-1"}>بازگشت</Link><Link href="/student-demo/elite-club/evaluation/submitted" className={buttonClassName()+" flex-1"}>تأیید و ثبت</Link></div>);
 if(step==="submitted") return panel("ارزیابی شما ثبت شد","نتیجه پس از تکمیل فرایند ارزیابی در همین بخش نمایش داده می‌شود. از شکیبایی شما سپاسگزاریم.",<Link href="/student-demo/elite-club/evaluation/pending" className={buttonClassName()+" w-full"}>ادامه</Link>);
 if(step==="pending") return panel("در حال ارزیابی","ارزیابی شما ثبت شده است. پس از تکمیل فرایند ارزیابی، نتیجه در همین بخش نمایش داده می‌شود.",<div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-right text-sm text-amber-900">در حال بررسی وضعیت عضویت</div>);
 if(step==="completed") return panel("ارزیابی تکمیل شد","فرایند ارزیابی شما به پایان رسیده است. نتیجه در بخش زیر قابل مشاهده است.",<Link href="/student-demo/elite-club/evaluation/result" className={buttonClassName()+" w-full"}>مشاهده نتیجه</Link>);
 if(step==="result") return panel("نتیجه ارزیابی باشگاه نخبگان","نتیجه ارزیابی شما مشخص شده است.",<><div className="rounded-xl bg-dena-lavender p-4 text-right"><p className="text-xs text-dena-muted">وضعیت عضویت</p><p className="mt-2 text-sm font-bold text-dena-deep">نتیجه از سیستم دریافت می‌شود (نمونه نمایشی)</p></div><p className="text-xs leading-6 text-dena-muted">در صورت داشتن سؤال، از طریق پشتیبانی آنلاین با ما در ارتباط باشید.</p><Link href="/student-demo/elite-club" className={buttonClassName()+" w-full"}>بازگشت به باشگاه نخبگان</Link><DemoClubNotice/></>);
 return <ClubHome/>;
}

function DemoClubNotice(){return <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-6 text-amber-900">این ارزیابی فقط برای پیش‌نمایش رابط است؛ پاسخ‌ها ذخیره یا برای عضویت واقعی ارسال نمی‌شوند.</p>}

function TeachingOpportunityList() {
  return (
    <div dir="rtl" className="space-y-5">
      <nav aria-label="مسیر صفحه" className="flex items-center gap-2 text-[13px]">
        <span className="font-medium text-dena-brand">حمایت تدریس</span>
        <span aria-hidden="true" className="text-dena-muted">←</span>
        <Link href="/student-demo/elite-club/member" className="text-dena-muted hover:text-dena-brand">باشگاه نخبگان</Link>
      </nav>
      <header className="space-y-1.5 text-right">
        <h2 className="text-xl font-bold leading-8 text-[#221c38] md:text-2xl">فرصت‌های پشتیبانی تحصیلی</h2>
        <p className="text-[13px] leading-6 text-[#6c6682]">فرصت‌های فعال همکاری آموزشی در این بخش نمایش داده می‌شوند.</p>
      </header>
      <Card className="rounded-none border-[#e5e1ed] p-4">
        <div className="flex items-center justify-between gap-3">
          <span className="shrink-0 rounded-full bg-[#e6f4ea] px-2.5 py-1 text-xs font-semibold text-[#027a48]">فرصت فعال</span>
          <h3 className="text-right text-base font-bold text-[#221c38]">پشتیبان تحصیلی ریاضی</h3>
        </div>
        <div className="mt-3 space-y-2 text-[13px] text-[#6c6682]">
          <p className="flex items-center justify-start gap-1.5">
            <span>آموزشگاه البرز</span>
            <svg aria-hidden="true" viewBox="0 0 20 20" className="size-4 shrink-0" fill="none">
              <path d="M16.25 8.33c0 4.17-6.25 9.17-6.25 9.17S3.75 12.5 3.75 8.33a6.25 6.25 0 1 1 12.5 0Z" stroke="currentColor" strokeWidth="1.7"/>
              <circle cx="10" cy="8.25" r="2" stroke="currentColor" strokeWidth="1.7"/>
            </svg>
          </p>
          <p className="flex items-center justify-start gap-1.5">
            <span>درس: ریاضی دهم</span>
            <img src="/icons/elite-club/book-open.svg" width={16} height={16} alt="" />
          </p>
        </div>
        <div className="my-3 border-t border-[#e5e1ed]" />
        <Link href="/student-demo/elite-club/teaching/opportunity" className="inline-flex items-center gap-1 text-sm font-semibold text-[#5b4ce2] hover:underline">
          <span aria-hidden="true">←</span>
          مشاهده جزئیات
        </Link>
      </Card>
      <div className="flex items-center gap-2 rounded-xl bg-[#f1eef8] p-4 text-[12px] leading-5 text-[#6c6682]">
        <p className="flex-1 text-right">سایر فرصت‌ها پس از انتشار نمایش داده می‌شوند.</p>
        <img src="/icons/elite-club/info.svg" width={16} height={16} alt="" />
      </div>
    </div>
  );
}

function TeachingOpportunityDetail() {
  const fields: { label: string; value: string; strong?: boolean; body?: boolean }[] = [
    { label: "عنوان فرصت همکاری", value: "پشتیبان تحصیلی ریاضی دهم", strong: true },
    { label: "آموزشگاه همکار", value: "آموزشگاه البرز" },
    { label: "حوزه آموزشی", value: "پایه دهم دوره دوم متوسطه" },
    { label: "توضیحات فرصت", value: "این فرصت برای اعضای باشگاه نخبگان جهت فعالیت به‌عنوان پشتیبان تحصیلی در آموزشگاه البرز تعریف شده است.", body: true },
    { label: "شرایط همکاری", value: "شرایط همکاری در صورت تعریف توسط آموزشگاه در این بخش نمایش داده می‌شود.", body: true },
  ];

  return (
    <div dir="rtl" className="space-y-4">
      <div dir="ltr" className="flex items-center justify-between gap-3">
        <span className="shrink-0 rounded-full bg-[#e6f4ea] px-2.5 py-1 text-xs font-semibold text-[#027a48]">فرصت فعال</span>
        <Link href="/student-demo/elite-club/teaching" dir="rtl" className="inline-flex items-center gap-2 text-lg font-bold text-[#221c38] hover:text-dena-brand">
          جزئیات فرصت
          <span aria-hidden="true">←</span>
        </Link>
      </div>
      <Card className="rounded-none border-[#e5e1ed] p-[18px]">
        <div className="space-y-4">
          {fields.map((field, index) => (
            <div key={field.label} className={index < fields.length - 1 ? "border-b border-[#e5e1ed] pb-4" : ""}>
              <p className="text-xs leading-5 text-[#6c6682]">{field.label}</p>
              <p className={`mt-1 text-right leading-6 text-[#221c38] ${field.body ? "text-[13px]" : field.strong ? "text-lg font-bold" : "text-[15px] font-semibold"}`}>
                {field.value}
              </p>
            </div>
          ))}
        </div>
      </Card>
      <div className="flex flex-col items-center gap-2.5">
        <Link href="/student-demo/elite-club/teaching/interest-submitted" className={`${buttonClassName()} flex h-12 w-full items-center justify-center rounded-xl text-base font-bold md:max-w-sm`}>
          اعلام علاقه‌مندی
        </Link>
        <p className="text-center text-xs leading-5 text-[#6c6682]">اعلام علاقه‌مندی به معنای تأیید همکاری نیست.</p>
      </div>
    </div>
  );
}

function Opportunities({ category, detail }: {category:string;detail:boolean}) {
 const item=categories.find(x=>x.slug===category);
 if(!item) return null;
 if (category === "teaching") return detail ? <TeachingOpportunityDetail /> : <TeachingOpportunityList />;
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
