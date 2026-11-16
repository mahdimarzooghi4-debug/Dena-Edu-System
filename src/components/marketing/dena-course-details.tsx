import Link from "next/link";
import { DenaPublicLayout } from "./dena-site-shell";
import { catalogCourses } from "./dena-public-pages";
import "./dena-course-details.css";
import "./dena-course-covers.css";

type Subject = "chemistry" | "physics" | "math" | "biology" | "arabic" | "literature";
type CourseCopy = { description: string; outcomes: string[]; chapters: { title: string; lessons: { title: string; type: "video" | "exercise" | "quiz" }[] }[] };
const subjectCopy: Record<Subject, CourseCopy> = {
  physics: {
    description: "آشنایی ساختارمند با مفاهیم پایه مکانیک، همراه با جلسات آموزشی ضبط‌شده، تمرین و ارزیابی برای پیگیری مسیر یادگیری.",
    outcomes: ["درک مفاهیم حرکت و کمیت‌های فیزیکی", "شناخت بردارها و محاسبات پایه", "تمرین روش‌های حل مسئله در مکانیک", "مرور مباحث با تمرین‌های هدفمند", "آمادگی برای ارزیابی‌های مرتبط با دوره", "پیگیری روند یادگیری و نقاط نیازمند تمرین"],
    chapters: [
      { title: "فصل اول: اندازه‌گیری و مفاهیم پایه مکانیک", lessons: [{title:"جلسه ۱: معرفی مکانیک و کمیت‌های فیزیکی",type:"video"},{title:"جلسه ۲: بردارها و محاسبات جمع برداری",type:"video"},{title:"تمرین فصل اول: تحلیل ابعادی و بردارها",type:"exercise"}] },
      { title: "فصل دوم: حرکت و نمودارهای حرکت", lessons: [{title:"جلسه ۳: مکان، جابه‌جایی و سرعت",type:"video"},{title:"تمرین: بررسی نمودارهای حرکت",type:"exercise"}] },
      { title: "فصل سوم: نیرو و قوانین حرکت", lessons: [{title:"جلسه ۴: نیرو و قانون‌های نیوتن",type:"video"},{title:"آزمون مرور نیرو و حرکت",type:"quiz"}] },
      { title: "فصل چهارم: مرور و جمع‌بندی", lessons: [{title:"مرور مباحث اصلی و مسائل نمونه",type:"video"},{title:"آزمون جمع‌بندی نمونه",type:"quiz"}] },
    ],
  },
  chemistry: {
    description: "آشنایی با مفاهیم مقدماتی شیمی، ساختار ماده و شیوه تحلیل مسئله با جلسات ضبط‌شده و تمرین.",
    outcomes: ["شناخت عناصر و ترکیب‌ها","درک ساختار اتم","آشنایی با جدول تناوبی","تمرین حل مسئله‌های شیمی","مرور مباحث پایه","پیگیری روند پیشرفت"],
    chapters: [{title:"فصل اول: کیهان، زادگاه الفبای هستی",lessons:[{title:"جلسه ۱: ساختار ماده",type:"video"},{title:"تمرین: عناصر و ترکیب‌ها",type:"exercise"}]},{title:"فصل دوم: مواد و ساختار آن‌ها",lessons:[{title:"جلسه ۲: مدل اتمی",type:"video"}]},{title:"فصل سوم: مرور و ارزیابی",lessons:[{title:"آزمون مروری نمونه",type:"quiz"}]}],
  },
  math: {
    description: "مرور مفاهیم ریاضی پایه دهم با توضیح گام‌به‌گام، تمرین مسئله و ارزیابی آموخته‌ها.",
    outcomes: ["تقویت درک مفاهیم عددی","آشنایی با مجموعه‌ها","شناخت الگوهای تابع","حل تمرین مرحله‌ای","مرور مسئله‌های ترکیبی","پیگیری پیشرفت"],
    chapters: [{title:"فصل اول: مجموعه‌ها و دنباله‌ها",lessons:[{title:"جلسه ۱: مجموعه‌ها",type:"video"},{title:"تمرین مجموعه‌ها",type:"exercise"}]},{title:"فصل دوم: مثلثات و تابع",lessons:[{title:"جلسه ۲: مثلثات",type:"video"}]},{title:"فصل سوم: مرور و ارزیابی",lessons:[{title:"آزمون نمونه",type:"quiz"}]}],
  },
  biology: {
    description: "یادگیری مفاهیم پایه زیست‌شناسی با مثال‌های تصویری، مرور و تمرین‌های آموزشی.",
    outcomes: ["آشنایی با ساختار سلول","درک سطوح سازمان‌یافتگی حیات","شناخت دستگاه‌های بدن","تحلیل شکل‌های زیستی","مرور مفاهیم کتاب","پیگیری روند یادگیری"],
    chapters: [{title:"فصل اول: دنیای زنده",lessons:[{title:"جلسه ۱: ساختار سلول",type:"video"},{title:"تمرین مباحث سلولی",type:"exercise"}]},{title:"فصل دوم: گوارش و جذب مواد",lessons:[{title:"جلسه ۲: آشنایی با دستگاه گوارش",type:"video"}]},{title:"فصل سوم: مرور",lessons:[{title:"ارزیابی نمونه",type:"quiz"}]}],
  },
  arabic: {
    description: "آموزش ترجمه و قواعد عربی پایه دهم با مثال‌های کاربردی و تمرین‌های مرحله‌ای.",
    outcomes: ["افزایش مهارت ترجمه","آشنایی با ساختار جمله","شناخت قواعد پایه","تمرین واژگان","مرور متن‌ها","پیگیری پیشرفت"],
    chapters: [{title:"فصل اول: واژگان و ترجمه",lessons:[{title:"جلسه ۱: ترجمه جمله‌های ساده",type:"video"},{title:"تمرین ترجمه",type:"exercise"}]},{title:"فصل دوم: قواعد پرکاربرد",lessons:[{title:"جلسه ۲: ساختار جمله",type:"video"}]},{title:"فصل سوم: مرور",lessons:[{title:"آزمون نمونه",type:"quiz"}]}],
  },
  literature: {
    description: "بررسی آرایه‌های ادبی، مفهوم شعر و متن و تمرین تحلیل ادبی متناسب با پایه دهم.",
    outcomes: ["شناخت آرایه‌های ادبی","تقویت درک معنی شعر","بررسی نثر فارسی","تمرین قرابت معنایی","مرور واژگان","پیگیری پیشرفت"],
    chapters: [{title:"فصل اول: آرایه‌های ادبی",lessons:[{title:"جلسه ۱: آرایه‌های پرکاربرد",type:"video"},{title:"تمرین تشخیص آرایه",type:"exercise"}]},{title:"فصل دوم: مفهوم و قرابت معنایی",lessons:[{title:"جلسه ۲: تحلیل شعر",type:"video"}]},{title:"فصل سوم: مرور",lessons:[{title:"آزمون نمونه",type:"quiz"}]}],
  },
};

const featureCards = [
  { icon:"✎",title:"تمرین‌های مرتبط",description:"تمرین‌های مرتبط با مباحث دوره برای سنجش و تثبیت آموخته‌ها." },
  { icon:"▤",title:"آزمون‌های دوره",description:"آزمون‌های مرتبط با سرفصل‌ها برای بررسی آموخته‌ها و ثبت نتایج دوره." },
  { icon:"↗",title:"ثبت نتیجه و پیشرفت",description:"نمایش نتایج ارزیابی و تغییرات عملکرد در بخش مسیر رشد دانش‌آموز." },
];
const faqs = [
  ["آیا جلسات دوره آفلاین هستند؟","در این نمونه، جلسات آموزشی به‌صورت ضبط‌شده معرفی شده‌اند. شرایط نهایی دسترسی را ارائه‌دهنده دوره تعیین می‌کند."],
  ["آیا دوره تمرین و آزمون دارد؟","در طرح نمونه، تمرین‌ها و ارزیابی‌های مرتبط با سرفصل‌ها پیش‌بینی شده است. جزئیات واقعی با ارائه‌دهنده است."],
  ["پشتیبانی آموزشی بر عهده چه کسی است؟","پشتیبانی و مشاوره آموزشی بر عهده ارائه‌دهنده یا مؤسسه آموزشی مربوط است؛ دنا پشتیبانی فنی بستر را انجام می‌دهد."],
  ["آیا این دوره امکان پرداخت اقساطی دارد؟","اطلاعات اقساط در این صفحه صرفاً نمونه نمایشی است و هیچ پرداخت یا خرید واقعی انجام نمی‌شود."],
  ["پیشرفتم در این دوره کجا نمایش داده می‌شود؟","در مدل طراحی دنا، روند جلسات، تمرین‌ها و ارزیابی‌ها در مسیر رشد دانش‌آموز قابل پیگیری خواهد بود."],
] as const;

function SectionHeading({ eyebrow,title,description,id }: { eyebrow:string;title:string;description?:string;id?:string }) {
  return <div className="dena-course-detail__section-heading">
    <span>{eyebrow}</span><h2 id={id}>{title}</h2>{description && <p>{description}</p>}
  </div>;
}

export function DenaCourseDetailsPage({ courseId }: { courseId: string }) {
  const course = catalogCourses.find((item) => item.id === courseId);
  if (!course) {
    return <DenaPublicLayout><section className="dena-course-detail dena-course-detail__missing" dir="rtl"><h1>دوره موردنظر پیدا نشد</h1><p>این شناسه در فهرست دوره‌های نمایشی دنا وجود ندارد.</p><Link href="/courses">بازگشت به دوره‌ها</Link></section></DenaPublicLayout>;
  }
  const copy = subjectCopy[course.subject as Subject];
  return <DenaPublicLayout>
    <article className="dena-course-detail" dir="rtl" data-testid="dena-course-detail">
      <nav className="dena-course-detail__breadcrumbs" aria-label="مسیر صفحه">
        <Link href="/">خانه</Link><span aria-hidden="true">/</span><Link href="/courses">دوره‌ها</Link><span aria-hidden="true">/</span><span aria-current="page">{course.title}</span>
      </nav>

      <section className="dena-course-detail__hero" aria-labelledby="dena-course-detail-title">
        <div className="dena-course-detail__container dena-course-detail__hero-grid">
          <div className="dena-course-detail__hero-copy">
            <span className="dena-course-detail__pill dena-course-detail__pill--soft">نمونه نمایشی دوره</span>
            <h1 id="dena-course-detail-title">{course.title}</h1>
            <p>{copy.description}</p>
            <div className="dena-course-detail__tags"><span>پایه دهم</span><span>آموزش آفلاین</span><span>تمرین و ارزیابی</span></div>
            <div className="dena-course-detail__provider-short">
              <span className={course.supervised ? "dena-course-detail__pill dena-course-detail__pill--orange" : "dena-course-detail__pill dena-course-detail__pill--soft"}>{course.supervised ? "ارائه‌دهنده تحت نظارت" : "مؤسسه آموزشی دارای مجوز"}</span>
              <p>ارائه‌دهنده: {course.provider}</p>
              {course.supervisor && <p>مؤسسه ناظر: {course.supervisor}</p>}
            </div>
          </div>
          <div className="dena-course-detail__media-column">
            <div className="dena-course-detail__cover dena-course-cover" data-subject={course.image} role="img" aria-label={"تصویر نمایشی دوره " + course.title}>
              <span className="dena-course-detail__cover-label">تصویر نمایشی دوره</span>
            </div>
            <div className="dena-course-detail__registration">
              <div className="dena-course-detail__pricing"><div><b>قیمت نمونه دوره</b><small>اطلاعات زیر برای نمایش طراحی هستند.</small></div><div className="dena-course-detail__price"><strong>{course.price}</strong>{course.installment && <span>۴ قسط مساوی، بدون افزایش قیمت</span>}{course.installment && <small>مبلغ کل دوره در پرداخت اقساطی افزایش نمی‌یابد.</small>}</div></div>
              <div className="dena-course-detail__registration-actions"><Link className="dena-course-detail__button dena-course-detail__button--primary" href="/login">ورود برای ثبت‌نام</Link><a className="dena-course-detail__button dena-course-detail__button--outline" href="#course-structure">سرفصل‌ها</a></div>
            </div>
          </div>
        </div>
      </section>

      <section className="dena-course-detail__section dena-course-detail__section--white" aria-labelledby="course-outcomes">
        <div className="dena-course-detail__container"><SectionHeading eyebrow="دستاوردهای یادگیری" title="پس از این دوره چه می‌آموزی؟" id="course-outcomes"/><div className="dena-course-detail__outcomes">{copy.outcomes.map((outcome)=><div className="dena-course-detail__outcome" key={outcome}><span aria-hidden="true">✓</span><p>{outcome}</p></div>)}</div></div>
      </section>

      <section className="dena-course-detail__section dena-course-detail__section--tinted" id="course-structure" aria-labelledby="course-structure-title">
        <div className="dena-course-detail__container"><SectionHeading eyebrow="برنامه آموزشی" title="سرفصل‌ها و جلسات دوره" id="course-structure-title"/><div className="dena-course-detail__chapters">
          {copy.chapters.map((chapter,idx)=><details className="dena-course-detail__chapter" key={chapter.title} open={idx===0}>
            <summary><strong>{chapter.title}</strong><span className="dena-course-detail__chevron" aria-hidden="true">⌄</span></summary>
            <div className="dena-course-detail__lessons">{chapter.lessons.map((lesson)=><div className="dena-course-detail__lesson" key={lesson.title}><div><span className="dena-course-detail__lesson-icon" aria-hidden="true">{lesson.type==="video"?"▷":lesson.type==="quiz"?"▤":"✎"}</span><span>{lesson.title}</span></div><span className="dena-course-detail__lesson-type">{lesson.type==="video"?"جلسه ضبط‌شده":lesson.type==="quiz"?"آزمون":"تمرین"}</span></div>)}</div>
          </details>)}
        </div></div>
      </section>

      <section className="dena-course-detail__section dena-course-detail__section--white" aria-labelledby="course-exercises">
        <div className="dena-course-detail__container"><SectionHeading eyebrow="ارزیابی و یادگیری" title="تمرین و ارزیابی در مسیر یادگیری" id="course-exercises" description="تمرین‌ها و آزمون‌های مرتبط با دوره به دانش‌آموز کمک می‌کنند آموخته‌های خود را بررسی کند و عملکردش در طول مسیر ثبت شود."/><div className="dena-course-detail__features">{featureCards.map((item)=><div key={item.title}><span className="dena-course-detail__feature-icon" aria-hidden="true">{item.icon}</span><h3>{item.title}</h3><p>{item.description}</p></div>)}</div></div>
      </section>

      <section className="dena-course-detail__section dena-course-detail__section--tinted" aria-labelledby="course-growth">
        <div className="dena-course-detail__container"><SectionHeading eyebrow="ارتباط با مسیر رشد" title="این دوره چگونه به مسیر پیشرفتت متصل می‌شود؟" id="course-growth" description="پیشرفت جلسات، تمرین‌ها و نتایج ارزیابی در مسیر رشد دانش‌آموز ثبت می‌شود تا روند یادگیری او در طول زمان قابل مشاهده باشد."/><div className="dena-course-detail__growth"><div><b>◷</b><h3>جلسات و تمرین‌ها</h3><p>پیشرفت جلسات ضبط‌شده و تمرین‌ها</p></div><span aria-hidden="true">←</span><div><b>▤</b><h3>آزمون و ارزیابی</h3><p>ثبت و نمایش نتایج ارزیابی</p></div><span aria-hidden="true">←</span><div><b>↗</b><h3>مسیر رشد دانش‌آموز</h3><p>نمایش روند یادگیری در طول زمان</p></div></div></div>
      </section>

      <section className="dena-course-detail__section dena-course-detail__section--white" aria-labelledby="course-responsibility">
        <div className="dena-course-detail__container"><SectionHeading eyebrow="شفافیت مسئولیت‌ها" title="ارائه‌دهنده این دوره" id="course-responsibility"/><div className="dena-course-detail__responsibility">
          <div className="dena-course-detail__responsibility-head"><div className="dena-course-detail__provider-avatar" aria-hidden="true">◈</div><div><h3>{course.provider}</h3><p>{course.supervisor ? "تحت نظارت مستقیم: "+course.supervisor : "ارائه‌دهنده دوره در فهرست نمونه نمایشی"}</p></div><span className="dena-course-detail__pill dena-course-detail__pill--orange">{course.supervised?"ارائه‌دهنده تحت نظارت":"وضعیت نمونه نمایشی"}</span></div>
          <p>محتوای آموزشی، قیمت‌گذاری، ارزیابی و همراهی تحصیلی این دوره بر عهده ارائه‌دهنده و در صورت وجود، مؤسسه ناظر مربوط است. دنا بستر دسترسی، پشتیبانی فنی و پیگیری مسیر یادگیری را فراهم می‌کند.</p>
          <div className="dena-course-detail__responsibility-grid"><div><h4>پشتیبانی و مشاوره آموزشی</h4><p>مسئول: ارائه‌دهنده یا مؤسسه مربوط</p></div><div><h4>پشتیبانی فنی پلتفرم</h4><p>مسئول: دنا</p></div></div>
        </div></div>
      </section>

      <section className="dena-course-detail__section dena-course-detail__section--tinted" aria-labelledby="course-faq">
        <div className="dena-course-detail__container"><SectionHeading eyebrow="پرسش‌های متداول" title="سؤالات متداول" id="course-faq"/><div className="dena-course-detail__faqs">{faqs.map(([question,answer],idx)=><details key={question} open={idx===0}><summary><strong>{question}</strong><span aria-hidden="true">＋</span></summary><p>{answer}</p></details>)}</div></div>
      </section>

      <section className="dena-course-detail__bottom-cta"><div className="dena-course-detail__container"><h2>آماده‌ای یادگیری را شروع کنی؟</h2><p>سرفصل‌ها، شیوه یادگیری و اطلاعات ارائه‌دهنده را بررسی کن و با آگاهی برای ثبت‌نام تصمیم بگیر.</p><div><Link className="dena-course-detail__button dena-course-detail__button--primary" href="/login">ورود به دنا</Link><Link href="/courses">بازگشت به دوره‌ها</Link></div></div></section>
      <p className="dena-course-detail__demo-notice">این صفحه صرفاً نمونهٔ طراحی است؛ عنوان‌ها، نام‌ها، مبالغ و وضعیت دسترسی نمایشی‌اند و در اینجا خرید، پرداخت یا ثبت‌نام واقعی انجام نمی‌شود.</p>
    </article>
  </DenaPublicLayout>;
}
