import Image from "next/image";
import Link from "next/link";
import { DenaPublicLayout } from "./dena-site-shell";
import type { CatalogCourse } from "./dena-course-data";
import styles from "./dena-course-details.module.css";

const physicsOutcomes = [
  "مفاهیم بنیادی حرکت و سکون در فیزیک",
  "بردارها و روش‌های نمایش کمیت‌های فیزیکی",
  "قوانین سه گانه نیوتن و کاربرد عملی آن‌ها",
  "نیروی اصطکاک و روش‌های تحلیل آن در سطوح مختلف",
  "حرکت یکنواخت و شتاب‌دار در مسیرهای مستقیم",
  "شیوه‌های پیشرفته حل مسئله و مهارت‌های تمرین تحلیلی",
];

const physicsChapters = [
  {
    title:"فصل ۱ — مفاهیم پایه و کمیت‌های مکانیک",
    lessons:[
      ["جلسه ۱: معرفی مکانیک و کمیت‌های فیزیکی","جلسه ضبط‌شده"],
      ["جلسه ۲: بردارها و محاسبات جمع برداری","جلسه ضبط‌شده"],
      ["تمرین فصل اول: تحلیل ابعادی و بردارها","تمرین"],
    ],
  },
  {title:"فصل ۲ — حرکت و توصیف روابط سینماتیک",lessons:[["نمونه جلسات و تمرین‌های فصل دوم","برنامه نمایشی"]]},
  {title:"فصل ۳ — تمرین و ارزیابی جامع دینامیک",lessons:[["نمونه تمرین‌ها و آزمون‌های فصل سوم","برنامه نمایشی"]]},
  {title:"فصل ۴ — مرور کلی و جمع‌بندی نهایی",lessons:[["نمونه مرور و جمع‌بندی مباحث","برنامه نمایشی"]]},
];

const physicsFAQs = [
  ["آیا جلسات دوره آفلاین هستند؟","جلسات آموزشی دوره به‌صورت ضبط‌شده ارائه می‌شوند و دانش‌آموز می‌تواند با سرعت خود پیش برود."],
  ["آیا دوره تمرین و آزمون دارد؟","تمرین‌ها و آزمون‌های مرتبط با دوره بخشی از مسیر یادگیری هستند و نتایج آن‌ها در روند پیشرفت ثبت می‌شود."],
  ["پشتیبانی آموزشی بر عهده چه کسی است؟","پشتیبانی و همراهی آموزشی بر عهده ارائه‌دهنده و مؤسسه ناظر مربوط است. دنا پشتیبانی فنی پلتفرم را فراهم می‌کند."],
  ["آیا این دوره امکان پرداخت اقساطی دارد؟","این نمونه دوره مشمول پرداخت در ۴ قسط مساوی، بدون افزایش قیمت است."],
  ["پیشرفتم در این دوره کجا نمایش داده می‌شود؟","پیشرفت جلسات، تمرین‌ها و نتایج آزمون‌ها در بخش مسیر رشد دانش‌آموز نمایش داده می‌شود."],
];

function SectionHeading({ eyebrow, title }: { eyebrow: string; title: string }) {
  return <div className={styles.sectionHeading}>
    <span className={styles.eyebrow}>{eyebrow}</span>
    <h2>{title}</h2>
  </div>;
}

function LearningOutcomes({ isPhysics, title }: { isPhysics: boolean; title: string }) {
  const outcomes = isPhysics ? physicsOutcomes : [
    `آشنایی با مفاهیم اصلی ${title}`,
    "تمرین مهارت حل مسئله و یادگیری مرحله‌ای",
    "مرور محتوای ضبط‌شده با سرعت دلخواه",
    "بررسی آموخته‌ها از طریق تمرین و ارزیابی",
    "جمع‌بندی مطالب در طول مسیر دوره",
    "پیگیری پیشرفت آموزشی در مسیر رشد",
  ];
  return <section className={styles.outcomes} aria-labelledby="course-outcomes">
    <div className={styles.wrap}>
      <SectionHeading eyebrow={isPhysics ? "اهداف آموزشی دوره فیزیک" : "اهداف آموزشی نمونه دوره"} title={isPhysics ? "در این دوره چه می‌آموزی؟" : "در این دوره چه می‌آموزی؟"} />
      <div className={styles.outcomeGrid} id="course-outcomes">
        {outcomes.map((outcome) => <div className={styles.outcome} key={outcome}>
          <span className={styles.check} aria-hidden="true">✓</span><span>{outcome}</span>
        </div>)}
      </div>
    </div>
  </section>;
}

function Curriculum({ isPhysics, title }: { isPhysics: boolean; title: string }) {
  const chapters = isPhysics ? physicsChapters : [
    {title:"فصل ۱ — آشنایی با مفاهیم پایه",lessons:[["جلسه نمونه: معرفی مباحث اولیه","جلسه ضبط‌شده"],["تمرین نمونه: مرور مفاهیم","تمرین"]]},
    {title:"فصل ۲ — آموزش و مثال‌های کاربردی",lessons:[["جلسه و تمرین نمونه","برنامه نمایشی"]]},
    {title:"فصل ۳ — تمرین، آزمون و ارزیابی",lessons:[["تمرین و ارزیابی نمونه","برنامه نمایشی"]]},
    {title:"فصل ۴ — جمع‌بندی و مرور نهایی",lessons:[["جلسه جمع‌بندی نمونه","برنامه نمایشی"]]},
  ];
  return <section className={styles.curriculum} id="course-syllabus" aria-label="سرفصل‌های دوره">
    <div className={styles.wrap}>
      <SectionHeading eyebrow={isPhysics ? "ساختار آموزشی فیزیک دهم" : `ساختار نمایشی ${title}`} title="سرفصل‌ها و جلسات دوره" />
      <div className={styles.accordion}>
        {chapters.map((chapter, index) => <details key={chapter.title} className={styles.chapter} open={index === 0}>
          <summary><span>{chapter.title}</span><span className={styles.chevron} aria-hidden="true">⌄</span></summary>
          <div className={styles.lessonRows}>
            {chapter.lessons.map(([name, kind]) => <div key={name} className={styles.lesson}>
              <span className={styles.lessonName}><span className={styles.lessonIcon} aria-hidden="true">▣</span>{name}</span>
              <span className={styles.lessonKind}>{kind}</span>
            </div>)}
          </div>
        </details>)}
      </div>
    </div>
  </section>;
}

const assessmentFeatures = [
  ["✎","تمرین‌های مرتبط","تمرین‌های مرتبط با مباحث دوره برای سنجش و تثبیت آموخته‌ها."],
  ["▤","آزمون‌های دوره","آزمون‌های مرتبط با سرفصل‌ها برای بررسی آموخته‌ها و ثبت نتایج دوره."],
  ["◫","ثبت نتیجه و پیشرفت","نمایش نتایج ارزیابی و تغییرات عملکرد در بخش مسیر رشد دانش‌آموز."],
] as const;

function Assessment() {
  return <section className={styles.assessment}>
    <div className={styles.wrap}>
      <SectionHeading eyebrow="سنجش اثربخش در طول دوره" title="تمرین و ارزیابی در مسیر یادگیری" />
      <p className={styles.sectionDescription}>تمرین‌ها و آزمون‌های مرتبط با دوره به دانش‌آموز کمک می‌کنند آموخته‌های خود را بررسی کند و عملکردش در طول مسیر ثبت شود.</p>
      <div className={styles.featureGrid}>{assessmentFeatures.map(([icon, title, text]) => <article className={styles.feature} key={title}>
        <span className={styles.featureIcon} aria-hidden="true">{icon}</span><h3>{title}</h3><p>{text}</p>
      </article>)}</div>
    </div>
  </section>;
}

function GrowthConnection() {
  return <section className={styles.growth}>
    <div className={styles.wrap}>
      <SectionHeading eyebrow="اتصال یکپارچه یادگیری دنا" title="این دوره چگونه به مسیر رشدت متصل می‌شود؟" />
      <p className={styles.sectionDescription}>پیشرفت جلسات، تمرین‌ها و نتایج ارزیابی این دوره در مسیر رشد دانش‌آموز ثبت می‌شود تا روند یادگیری او در طول زمان قابل مشاهده باشد.</p>
      <div className={styles.growthFlow}>
        <div><span aria-hidden="true">▷</span><strong>جلسات و تمرین‌ها</strong><small>پیشرفت جلسات ضبط‌شده و تمرین‌ها</small></div>
        <span className={styles.flowArrow} aria-hidden="true">←</span>
        <div><span aria-hidden="true">▤</span><strong>آزمون و ارزیابی</strong><small>ثبت و نمایش نتایج ارزیابی</small></div>
        <span className={styles.flowArrow} aria-hidden="true">←</span>
        <div><span aria-hidden="true">↗</span><strong>مسیر رشد دانش‌آموز</strong><small>نمایش روند یادگیری در طول زمان</small></div>
      </div>
    </div>
  </section>;
}

function ProviderResponsibility({ course }: {course:CatalogCourse}) {
  const supervisor = "supervisor" in course ? course.supervisor : undefined;
  return <section className={styles.providerSection}>
    <div className={styles.wrap}>
      <SectionHeading eyebrow="شفافیت و هویت دوره‌ها" title="ارائه‌دهنده این دوره" />
      <div className={styles.providerCard}>
        <div className={styles.providerIdentity}>
          <div className={styles.providerName}>
            <span className={styles.avatar} aria-hidden="true">⌂</span>
            <div><h3>{course.provider}</h3><p>{supervisor ? `تحت نظارت: ${supervisor}` : "نمونه مؤسسه آموزشی"}</p></div>
          </div>
          <span className={styles.providerBadge}>{course.supervised ? "ارائه‌دهنده تحت نظارت" : "مؤسسه آموزشی دارای مجوز (نمونه)"}</span>
        </div>
        <p className={styles.providerText}>محتوای آموزشی، قیمت‌گذاری، ارزیابی و همراهی تحصیلی این دوره بر عهده ارائه‌دهنده و مؤسسه ناظر مربوط است. دنا بستر دسترسی، پشتیبانی فنی و پیگیری مسیر یادگیری را فراهم می‌کند.</p>
        <div className={styles.responsibilityGrid}>
          <div><strong>پشتیبانی و مشاوره آموزشی</strong><span>مسئول: ارائه‌دهنده یا مؤسسه مربوط</span></div>
          <div><strong>پشتیبانی فنی پلتفرم</strong><span>مسئول: دنا</span></div>
        </div>
      </div>
    </div>
  </section>;
}

function CourseFAQ({ installment }: { installment: boolean }) {
  const faqs = physicsFAQs.map(([question, answer], i) =>
    i === 3 && !installment ? [question, "در این نمونه دوره گزینه پرداخت اقساطی تعریف نشده است."] : [question, answer],
  );
  return <section className={styles.faq}>
    <div className={styles.wrap}>
      <SectionHeading eyebrow="پاسخ به ابهامات شما" title="سؤالات متداول" />
      <div className={styles.faqList}>{faqs.map(([question, answer], index) => <details key={question} className={styles.faqItem} open={index===0}>
        <summary><span>{question}</span><span aria-hidden="true">＋</span></summary><p>{answer}</p>
      </details>)}</div>
    </div>
  </section>;
}

export function DenaCourseDetailsPage({ course }: { course: CatalogCourse }) {
  const isPhysics = course.id === "physics-tenth";
  const supervisor = "supervisor" in course ? course.supervisor : undefined;
  const description = isPhysics
    ? "آشنایی ساختارمند با مفاهیم پایه مکانیک، همراه با جلسات آموزشی ضبط‌شده، تمرین و ارزیابی برای پیگیری مسیر یادگیری."
    : `آشنایی ساختارمند با مباحث ${course.title}، همراه با محتوای نمونه ضبط‌شده، تمرین و ارزیابی برای پیگیری یادگیری.`;
  return <DenaPublicLayout>
    <div className={styles.root} dir="rtl" data-testid="dena-course-details">
      <nav className={styles.breadcrumb} aria-label="مسیر صفحه">
        <div className={styles.wrap}><Link href="/">خانه</Link><span>/</span><Link href="/courses">دوره‌ها</Link><span>/</span><span aria-current="page">{course.title}</span></div>
      </nav>
      <section className={styles.hero}>
        <div className={styles.wrap}>
          <div className={styles.heroGrid}>
            <div className={styles.heroCopy}>
              <span className={styles.sampleBadge}>نمونه نمایشی دوره</span>
              <h1>{course.title}</h1>
              <p className={styles.heroDescription}>{description}</p>
              <div className={styles.tags}><span>پایه دهم</span><span>آموزش آفلاین</span><span>تمرین و ارزیابی</span></div>
              <div className={styles.heroProvider}>
                <span className={styles.providerBadge}>{course.supervised ? "ارائه‌دهنده تحت نظارت" : "مؤسسه آموزشی (نمونه)"}</span>
                <p>ارائه‌دهنده: {course.provider}</p>
                {supervisor && <p>مؤسسه ناظر: {supervisor}</p>}
              </div>
            </div>
            <div className={styles.heroAside}>
              <figure className={styles.cover}>
                <Image src={course.cover} alt={`تصویر مفهومی و نمایشی ${course.title}`} width={640} height={440} priority={isPhysics} />
                <figcaption>تصویر نمایشی دوره • پیش‌نمایش ویدئویی فعال نیست</figcaption>
              </figure>
              <div className={styles.pricing}>
                <div className={styles.pricingTop}>
                  <h2>قیمت نمونه دوره</h2>
                  <div><strong>{course.price}</strong>
                    {course.installment && <span>۴ قسط مساوی، بدون افزایش قیمت</span>}
                    <small>{course.installment ? "مبلغ کل دوره در پرداخت اقساطی افزایش نمی‌یابد." : "این دوره در نمونه فعلی پرداخت اقساطی ندارد."}</small>
                  </div>
                </div>
                <div className={styles.pricingActions}>
                  <Link className={styles.primaryButton} href="/login">ورود برای ثبت‌نام</Link>
                  <a className={styles.secondaryButton} href="#course-syllabus">سرفصل‌ها</a>
                </div>
                <p className={styles.pricingNotice}>قیمت‌ها و شرایط بالا صرفاً نمونه طراحی‌اند؛ خرید یا پرداخت واقعی انجام نمی‌شود.</p>
              </div>
            </div>
          </div>
        </div>
      </section>
      <LearningOutcomes isPhysics={isPhysics} title={course.title} />
      <Curriculum isPhysics={isPhysics} title={course.title} />
      <Assessment />
      <GrowthConnection />
      <ProviderResponsibility course={course} />
      <CourseFAQ installment={course.installment} />
      <section className={styles.cta}>
        <div className={styles.wrap}>
          <h2>{isPhysics ? "آماده‌ای یادگیری فیزیک را شروع کنی؟" : `برای یادگیری ${course.title} آماده‌ای؟`}</h2>
          <p>سرفصل‌ها، شیوه یادگیری و اطلاعات ارائه‌دهنده را بررسی کن و با آگاهی برای ثبت‌نام تصمیم بگیر.</p>
          <div><Link href="/login" className={styles.primaryButton}>ورود به دنا</Link><Link href="/courses" className={styles.ctaBack}>بازگشت به دوره‌ها</Link></div>
        </div>
      </section>
    </div>
  </DenaPublicLayout>;
}
