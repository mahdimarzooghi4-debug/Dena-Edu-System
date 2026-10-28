import Link from "next/link";
import Image from "next/image";
import { DenaPublicLayout, DenaRoleIcon } from "./dena-site-shell";

const catalogCourses = [
  { id:"chemistry-tenth", title:"شیمی دهم (کیهان و ساختار)", provider:"مؤسسه کنکور برتر", teacher:"استاد مریم سهرابی", sessions:"۲۸ جلسه", hours:"۲۲ ساعت محتوای آموزشی", price:"۴,۱۰۰,۰۰۰ تومان", supervised:false, image:"chemistry" },
  { id:"physics-tenth", title:"فیزیک دهم (مکانیک)", provider:"گروه ماز", teacher:"دکتر رضا علوی", sessions:"۲۰ جلسه", hours:"۱۵ ساعت محتوای آموزشی", price:"۳,۲۰۰,۰۰۰ تومان", supervised:true, image:"physics" },
  { id:"math-tenth", title:"ریاضی دهم تجربی و ریاضی", provider:"مؤسسه آموزشی نمونه", teacher:"استاد علیرضا احمدی", sessions:"۲۴ جلسه", hours:"۱۸ ساعت محتوای آموزشی", price:"۳,۸۰۰,۰۰۰ تومان", supervised:false, image:"math" },
  { id:"biology-tenth", title:"زیست‌شناسی دهم (پایه و مفاهیم)", provider:"آکادمی علوم فردا", teacher:"دکتر سارا حسینی", sessions:"۳۲ جلسه", hours:"۲۶ ساعت محتوای آموزشی", price:"۴,۵۰۰,۰۰۰ تومان", supervised:false, image:"biology" },
  { id:"arabic-tenth", title:"عربی دهم (ترجمه و قواعد)", provider:"گروه آموزشی مبین", teacher:"استاد محمد کریمی", sessions:"۱۶ جلسه", hours:"۱۲ ساعت محتوای آموزشی", price:"۱,۹۰۰,۰۰۰ تومان", supervised:true, image:"arabic" },
  { id:"literature-tenth", title:"ادبیات فارسی دهم (آرایه‌ها و قرابت)", provider:"مؤسسه فرهنگ و ادب", teacher:"دکتر حسن رضایی", sessions:"۱۸ جلسه", hours:"۱۴ ساعت محتوای آموزشی", price:"۲,۱۰۰,۰۰۰ تومان", supervised:false, image:"literature" },
];

function Eyebrow({ children }: { children: React.ReactNode }) { return <span className="eyebrow">{children}</span>; }
function TitleBlock({ eyebrow, title, text }: { eyebrow?: string; title: string; text?: string }) {
  return <div className="site-title-block">{eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}<h1>{title}</h1>{text && <p>{text}</p>}</div>;
}
function SiteCTA({ title, description, href="/courses", label="مشاهده دوره‌ها" }: { title:string; description:string; href?:string; label?:string }) {
  return <section className="site-cta"><h2>{title}</h2><p>{description}</p><Link className="dena-button dena-button--primary" href={href}>{label}</Link></section>;
}
function SampleTag() { return <span className="sample-tag">نمونهٔ نمایشی</span>; }

export function DenaCourseCatalogPage() {
  return <DenaPublicLayout>
    <section className="catalog-intro"><TitleBlock eyebrow="دوره‌های آموزشی دنا" title="دوره مناسب مسیر یادگیری‌ات را پیدا کن" text="دوره‌های آموزشی مؤسسات دارای مجوز و ارائه‌دهندگان تحت نظارت را بررسی کن، شرایط هر دوره را ببین و یادگیری را با سرعت خودت ادامه بده." /></section>
    <section className="catalog-content">
      <form className="catalog-search" action="/courses"><label className="sr-only" htmlFor="course-search">جست‌وجوی دوره</label><input id="course-search" name="q" placeholder="نام درس، دوره یا ارائه‌دهنده را جست‌وجو کن" /><button className="dena-button dena-button--primary" type="submit">جست‌وجو</button></form>
      <form className="catalog-filters" action="/courses">
        <label>درس<select name="subject"><option value="">همهٔ درس‌ها</option><option>ریاضی</option><option>فیزیک</option><option>شیمی</option></select></label>
        <label>پایه تحصیلی<select name="grade"><option value="">همهٔ پایه‌ها</option><option>دهم</option><option>یازدهم</option><option>دوازدهم</option></select></label>
        <label>وضعیت ارائه‌دهنده<select name="provider"><option value="">همه</option><option>مؤسسه دارای مجوز</option><option>ارائه‌دهنده تحت نظارت</option></select></label>
        <label>محدوده قیمت<select name="price"><option value="">همهٔ قیمت‌ها</option><option>کمتر از ۳ میلیون</option><option>۳ تا ۵ میلیون تومان</option></select></label>
        <Link href="/courses">پاک‌کردن فیلترها</Link>
      </form>
      <div className="catalog-grid">
        {catalogCourses.map((course)=><article className="course-card" key={course.title}>
          <div className={`course-card__image course-card__image--${course.image}`} role="img" aria-label={`تصویر دورهٔ ${course.title}`}><span className="course-card__image-label">پایه دهم · آموزش آفلاین</span></div>
          <div className="course-card__body">
            <div className="course-card__badges"><span>{course.sessions}</span><span className={course.supervised?"badge-supervised":"badge-licensed"}>{course.supervised?"ارائه‌دهنده تحت نظارت":"مؤسسه آموزشی دارای مجوز"}</span></div>
            <h2>{course.title}</h2><p>ارائه‌دهنده: {course.provider}<br />مدرس: {course.teacher}{course.id==="arabic-tenth"&&<><br />مؤسسه ناظر: آموزشگاه اندیشه</>}</p><small>پایه دهم | {course.hours}</small>
            <div className="course-card__price"><strong>{course.price}</strong><span>۴ قسط مساوی، بدون افزایش قیمت</span></div>
            <Link className="dena-button dena-button--outline" href={`/courses/${course.id}`}>مشاهده دوره</Link>
          </div>
        </article>)}
      </div>
      <p className="content-disclaimer">قیمت‌ها و عنوان‌های این صفحه نمونه‌اند. جزئیات قطعی هر دوره را ارائه‌دهندهٔ مسئول اعلام می‌کند.</p>
    </section>
    <section className="dena-section trust-strip"><h2>قبل از انتخاب دوره، اطلاعاتش را شفاف ببین</h2><div className="trust-cards"><article><h3>محتوا و ساختار دوره قابل بررسی</h3><p>سرفصل‌ها، جلسات آموزشی و زمان یادگیری پیش از شروع مشخص و شفاف برنامه‌ریزی شده است.</p></article><article><h3>قیمت و شرایط پرداخت روشن</h3><p>شفافیت قیمت دوره‌ها و گزینه‌های پرداخت چندمرحله‌ای برای تسهیل فرآیند ثبت‌نام مهیاست.</p></article><article><h3>ارائه‌دهنده مشخص</h3><p>وضعیت هر ارائه‌دهنده مشخص است؛ برای ارائه‌دهندگان تحت نظارت، نام مؤسسهٔ ناظر هم نمایش داده می‌شود.</p></article></div></section>
  </DenaPublicLayout>;
}

export function DenaCourseDetailsPage({ courseId = "physics-tenth" }: { courseId?: string }) {
  const course = catalogCourses.find((item) => item.id === courseId) ?? catalogCourses[1];
  return <DenaPublicLayout>
    <nav className="breadcrumbs" aria-label="مسیر صفحه"><Link href="/">خانه</Link><span>/</span><Link href="/courses">دوره‌ها</Link><span>/</span><span>فیزیک دهم (مکانیک)</span></nav>
    <section className="course-detail-hero">
      <div className={`course-detail-art course-card__image--${course.image}`} role="img" aria-label={`نمای معرفی دورهٔ ${course.title}`} />
      <div><SampleTag /><h1>{course.title}</h1><p>آشنایی ساختارمند با مفاهیم پایه، همراه با جلسات آموزشی ضبط‌شده، تمرین و ارزیابی برای پیگیری مسیر یادگیری.</p><div className="course-detail-meta"><span>آموزش آفلاین</span><span>پایه دهم</span><span>{course.supervised?"ارائه‌دهنده تحت نظارت":"مؤسسه دارای مجوز"}</span></div><div className="course-detail-price"><strong>{course.price}</strong><span>۴ قسط مساوی، بدون افزایش قیمت</span><small>مبلغ کل دوره در پرداخت اقساطی افزایش نمی‌یابد.</small></div><Link className="dena-button dena-button--primary" href="/login">ورود برای ثبت‌نام در دوره</Link></div>
    </section>
    <section className="dena-section detail-outcomes"><TitleBlock eyebrow="اهداف آموزشی دوره فیزیک" title="در این دوره چه می‌آموزی؟"/><div className="detail-card-grid">{["مفاهیم بنیادی حرکت و سکون در فیزیک","بردارها و روش‌های نمایش کمیت‌های فیزیکی","قوانین سه‌گانهٔ نیوتن و کاربرد عملی آن‌ها","نیروی اصطکاک و روش‌های تحلیل آن در سطوح مختلف","حرکت یکنواخت و شتاب‌دار در مسیرهای مستقیم","شیوه‌های پیشرفتهٔ حل مسئله و مهارت‌های تمرین تحلیلی"].map((x,i)=><article key={x}><b>۰{i+1}</b><h3>{x}</h3></article>)}</div></section>
    <section className="dena-section detail-structure"><TitleBlock eyebrow="ساختار آموزشی فیزیک دهم" title="سرفصل‌ها و جلسات دوره" text="سرفصل‌ها و تمرین‌های زیر نمونهٔ نمایشی هستند؛ ترتیب و محتوای قطعی را مؤسسهٔ مسئول دوره تعیین می‌کند."/><div className="lesson-list"><article><span>فصل ۱ — مفاهیم پایه و کمیت‌های مکانیک</span><b>جلسه ۱: معرفی مکانیک و کمیت‌های فیزیکی</b></article><article><span>جلسه ضبط‌شده</span><b>جلسه ۲: بردارها و محاسبات جمع برداری</b></article><article><span>تمرین</span><b>تمرین فصل اول: تحلیل ابعادی و بردارها</b></article><article><span>فصل ۲ — حرکت و توصیف روابط سینماتیک</span><b>جلسات ضبط‌شده و تمرین‌های مرتبط</b></article><article><span>فصل ۳ — تمرین و ارزیابی جامع دینامیک</span><b>تمرین‌های مرحله‌ای و ارزیابی فصل</b></article><article><span>فصل ۴ — مرور کلی و جمع‌بندی نهایی</span><b>مرور آموخته‌ها و ارزیابی پایانی</b></article></div></section>
    <section className="dena-section"><TitleBlock eyebrow="سنجش اثربخش در طول دوره" title="تمرین و ارزیابی در مسیر یادگیری" text="تمرین‌ها و آزمون‌های مرتبط با دوره به دانش‌آموز کمک می‌کنند آموخته‌های خود را بررسی کند و عملکردش در طول مسیر ثبت شود."/><div className="trust-cards"><article><h3>تمرین‌های مرتبط</h3><p>تمرین‌های مباحث دوره برای سنجش و تثبیت آموخته‌ها.</p></article><article><h3>آزمون‌های دوره</h3><p>آزمون‌های مرتبط با سرفصل‌ها برای بررسی آموخته‌ها و ثبت نتایج دوره.</p></article><article><h3>ثبت نتیجه و پیشرفت</h3><p>نمایش نتایج ارزیابی و تغییرات عملکرد در بخش مسیر رشد دانش‌آموز.</p></article></div></section>
    <section className="dena-section"><TitleBlock eyebrow="اتصال یکپارچه یادگیری دنا" title="این دوره چگونه به مسیر رشدت متصل می‌شود؟" text="پیشرفت جلسات، تمرین‌ها و نتایج ارزیابی این دوره در مسیر رشد دانش‌آموز ثبت می‌شود تا روند یادگیری او در طول زمان قابل مشاهده باشد."/><div className="trust-cards"><article><h3>مسیر رشد دانش‌آموز</h3><p>نمایش روند یادگیری در طول زمان.</p></article><article><h3>آزمون و ارزیابی</h3><p>ثبت و نمایش نتایج ارزیابی.</p></article><article><h3>جلسات و تمرین‌ها</h3><p>پیشرفت جلسات ضبط‌شده و تمرین‌ها.</p></article></div></section>
    <section className="content-disclaimer-block"><h2>شفافیت و هویت دوره‌ها</h2><div className="trust-cards"><article><b>ارائه‌دهندهٔ این دوره</b><p>{course.provider}</p><small>{course.supervised?"تحت نظارت مستقیم: مؤسسهٔ آموزشی البرز":"مؤسسهٔ آموزشی دارای مجوز"}</small></article><article><b>پشتیبانی فنی پلتفرم</b><p>مسئول: دنا</p></article><article><b>پشتیبانی و مشاورهٔ آموزشی</b><p>مسئول: {course.provider}</p></article></div><p>محتوای آموزشی، قیمت‌گذاری، ارزیابی و همراهی تحصیلی این دوره بر عهدهٔ ارائه‌دهنده و مؤسسهٔ ناظر مربوط است. دنا بستر دسترسی، پشتیبانی فنی و پیگیری مسیر یادگیری را فراهم می‌کند.</p></section>
    <section className="dena-section"><TitleBlock title="پاسخ به ابهامات شما" text="سؤالات متداول"/><div className="trust-cards"><article><h3>آیا جلسات دوره آفلاین هستند؟</h3><p>جلسات آموزشی دوره به‌صورت ضبط‌شده ارائه می‌شوند و دانش‌آموز می‌تواند با سرعت خود پیش برود.</p></article><article><h3>آیا دوره تمرین و آزمون دارد؟</h3><p>تمرین‌ها و ارزیابی‌های مرتبط با سرفصل‌ها برای بررسی آموخته‌ها در مسیر دوره قرار دارند.</p></article><article><h3>پشتیبانی آموزشی بر عهدهٔ چه کسی است؟</h3><p>پشتیبانی و مشاورهٔ آموزشی بر عهدهٔ ارائه‌دهنده یا مؤسسهٔ ناظر مربوط است.</p></article><article><h3>آیا این دوره امکان پرداخت اقساطی دارد؟</h3><p>در این نمونه، مبلغ دوره در ۴ قسط مساوی و بدون افزایش قیمت نمایش داده شده است.</p></article><article><h3>پیشرفتم در این دوره کجا نمایش داده می‌شود؟</h3><p>پیشرفت جلسات، تمرین‌ها و نتایج ارزیابی در بخش مسیر رشد دانش‌آموز قابل مشاهده خواهد بود.</p></article></div></section>
    <SiteCTA title="آماده‌ای یادگیری فیزیک را شروع کنی؟" description="سرفصل‌ها، شیوهٔ یادگیری و اطلاعات ارائه‌دهنده را بررسی کن و با آگاهی برای ثبت‌نام تصمیم بگیر." href="/login" label="ثبت‌نام در دوره" />
  </DenaPublicLayout>;
}

const roleCards = [["دانش‌آموز","محور یادگیری و مسیر رشد فردی","student"],["مؤسسه آموزشی","ارائه‌دهنده رسمی دوره‌ها و مسئول مستقیم آموزش","institute"],["ارائه‌دهنده تحت نظارت","ارائهٔ دوره با نظارت مؤسسهٔ دارای مجوز","provider"],["سازمان و حامی","تسهیل دسترسی منصفانه به فرصت‌های رشد","supporter"]];
function RoleCards() { return <div className="role-grid">{roleCards.map(([name,description,key])=><article className={`role-card role-card--${key}`} key={key}><span className="role-card__icon" aria-hidden="true"><DenaRoleIcon kind={key}/></span><h3>{name}</h3><p>{description}</p></article>)}</div>; }
function NetworkGraphic() { return <div className="network-art" aria-hidden="true"><i/><i/><i/><i/><i/><i/><b/><b/><b/></div>; }

export function DenaEliteClubPage() {
  return <DenaPublicLayout>
    <section className="site-split-hero"><NetworkGraphic/><div><Eyebrow>باشگاه نخبگان دنا</Eyebrow><h1>استعدادها در کنار هم شکوفا می‌شوند</h1><p>باشگاه نخبگان دنا، بخشی از اکوسیستم دنا با تمرکز بر رشد استعدادها، ارتباط دانش‌آموزان و شکل‌گیری فرصت‌های تازه برای نوآفرینی و پیشرفت است.</p><Link className="dena-button dena-button--primary" href="/courses">مشاهده دوره‌ها</Link></div></section>
    <section className="dena-section"><TitleBlock eyebrow="مسیر رشد دنا" title="باشگاه نخبگان دنا؛ رشد از اتصال"/><div className="trust-cards"><article><h3>نگاه نوآفرینانه</h3><p>توجه به ایده‌ها و فرصت‌های تازه برای نوآفرینی، در ادامهٔ مسیر رشد دانش‌آموز.</p></article><article><h3>ارتباط و هم‌افزایی</h3><p>پیوند میان دانش‌آموزان و بخش‌های اکوسیستم با تمرکز بر یادگیری و رشد جمعی.</p></article><article><h3>رشد استعدادها</h3><p>توجه به علایق و توانایی‌های دانش‌آموز در کنار مسیر یادگیری او در دنا.</p></article></div></section>
    <section className="dena-section roles-panel"><TitleBlock title="یک اکوسیستم؛ نقش‌های روشن"/><div className="trust-cards"><article><h3>دانش‌آموز</h3><p>محور یادگیری و رشد فردی در دنا.</p></article><article><h3>مؤسسات و ارائه‌دهندگان</h3><p>مسئول محتوای آموزشی، ارزیابی و همراهی تحصیلی دوره‌های خود.</p></article><article><h3>باشگاه نخبگان</h3><p>بخشی از اکوسیستم با تمرکز بر رشد استعدادها، ارتباط و نوآفرینی.</p></article></div></section>
    <section className="content-disclaimer-block"><h2>جایگاه باشگاه در دنا</h2><h3>استعداد و یادگیری، در یک مسیر به‌هم‌پیوسته</h3><p>باشگاه نخبگان نه مؤسسهٔ آموزشی مستقل است و نه جایگزین دوره‌ها یا همراهی آموزشی مؤسسات؛ بخشی از اکوسیستم دناست که به استعدادها، ارتباط و نوآفرینی توجه دارد.</p><p>این صفحه معرفی اولیهٔ باشگاه است؛ اطلاعات عضویت و برنامه‌های آن پس از نهایی‌شدن اعلام می‌شود.</p></section>
    <SiteCTA title="رشد در کنار هم، در اکوسیستم دنا" description="باشگاه نخبگان بخشی از اکوسیستم دناست؛ مسیرهای یادگیری و رشد را در دنا ببین." href="/courses" label="مشاهده دوره‌ها" />
  </DenaPublicLayout>;
}

export function DenaGrowthPathPage() {
  return <DenaPublicLayout><section className="growth-page-intro"><TitleBlock eyebrow="مسیر رشد دنا" title="روند یادگیری‌ات را در طول زمان ببین" text="پیشرفت جلسات آموزشی، تمرین‌ها، نتایج آزمون‌ها و عملکرد درسی در کنار هم نمایش داده می‌شوند تا مسیر رشد یا افت یادگیری روشن‌تر شود."/></section><section className="dena-section growth-page-content"><div className="growth-page-copy"><SampleTag/><h2>رشدت را فقط حس نکن؛ ببین</h2><p>در دنا، پیشرفت دوره، نتایج آزمون‌ها، تمرین‌ها و عملکرد درسی در طول زمان کنار هم قرار می‌گیرند تا دانش‌آموز بتواند روند رشد یا افت خود را ببیند و برای قدم بعدی مسیر یادگیری آماده شود.</p><div className="report-note"><b>روند کلی شما رو به رشد است</b><span>نمونهٔ داده برای نمایش طراحی</span></div><div className="report-note report-note--warning"><b>کاهش موقت عملکرد در فیزیک</b><span>مرور درس در قدم بعدی</span></div></div><div className="growth-report"><div className="growth-report__top"><span>مسیر رشد من · روند ۶ ماه اخیر</span><strong>+۱۲٪</strong></div><div className="growth-report__chart"><i/><i/><i/><i/><i/><i/></div><div className="growth-report__labels"><span>آبان</span><span>آذر</span><span>دی</span><span>بهمن</span><span>اسفند</span><span>فروردین</span></div><div className="growth-stats"><article><b>+۱۲٪</b><span>رشد محسوس · ریاضی</span></article><article><b>−۴٪</b><span>افت موقت · فیزیک</span></article><article><b>+۱٪</b><span>ثبات تحصیلی · شیمی</span></article></div></div></section><section className="dena-section"><TitleBlock title="مسیر رشد از چه داده‌هایی ساخته می‌شود؟"/><div className="trust-cards"><article><h3>روند عملکرد درسی</h3><p>تغییرات عملکرد هر درس در طول زمان قابل مشاهده می‌شود.</p></article><article><h3>تمرین و آزمون</h3><p>نتایج ارزیابی‌های مرتبط با دوره در طول مسیر ثبت و نمایش داده می‌شود.</p></article><article><h3>پیشرفت دوره</h3><p>جلسه‌های تکمیل‌شده و میزان پیشروی در هر دوره بخشی از مسیر یادگیری است.</p></article></div></section><section className="content-disclaimer-block"><h2>مسئولیت و حریم داده</h2><p>مسیر رشد به داده‌هایی متکی است که مؤسسه یا ارائه‌دهندهٔ مسئول در چارچوب دوره ثبت می‌کند. این نمایش نمونه است و دادهٔ واقعی دانش‌آموزی در آن وجود ندارد.</p></section><SiteCTA title="یادگیری‌ات را ادامه بده" description="برای دیدن مسیر رشد شخصی وارد حساب دانش‌آموزی شو." href="/login" label="ورود دانش‌آموز"/></DenaPublicLayout>;
}

export function DenaAssessmentsPage() {
  return <DenaPublicLayout><section className="catalog-intro"><TitleBlock eyebrow="ارزیابی آموزشی" title="ارزیابی، پیوسته با مسیر یادگیری" text="تمرین‌ها و آزمون‌های مرتبط با دوره توسط مؤسسه یا ارائه‌دهندهٔ مربوط مدیریت می‌شوند و نتایجشان در مسیر رشد دانش‌آموز نمایش داده می‌شود."/></section><section className="dena-section assessment-sample"><div className="assessment-card"><SampleTag/><h2>آزمون سنجش مستمر فصل ۳</h2><p>فیزیک دهم · مؤسسهٔ آموزشی البرز</p><div className="assessment-card__facts"><span>۲۰ پرسش</span><span>زمان پیشنهادی: ۳۰ دقیقه</span><span>نتیجه در مسیر رشد</span></div><Link className="dena-button dena-button--primary" href="/login">ورود برای مشاهده</Link></div><div className="assessment-explanation"><Eyebrow>نقش ارزیابی</Eyebrow><h2>آزمون بخشی از فرایند یادگیری است</h2><p>ارزیابی‌ها به دوره و سرفصل آموزشی مربوط می‌شوند. مؤسسهٔ مسئول دوره، تمرین و آزمون را طراحی و مدیریت می‌کند.</p><p className="content-disclaimer">این کارت نمونهٔ نمایشی است؛ آزمون واقعی در این صفحه برگزار نمی‌شود.</p></div></section><section className="dena-section"><TitleBlock title="آزمون در دنا چه جایگاهی دارد؟"/><div className="trust-cards"><article><h3>آزمون مرتبط با دوره</h3><p>ارزیابی به محتوای دوره و سرفصل‌های آموزشی مربوط است؛ دنا برگزارکنندهٔ مستقل آموزش نیست.</p></article><article><h3>ثبت نتایج ارزیابی</h3><p>نتایج آزمون‌ها و تمرین‌های دوره در مسیر یادگیری ثبت می‌شوند و قابل مشاهده‌اند.</p></article><article><h3>روند عملکرد درسی</h3><p>نتایج در کنار تمرین‌ها و پیشرفت دوره مسیر رشد را روشن‌تر می‌کند.</p></article></div></section><section className="content-disclaimer-block"><h2>مسئولیت آزمون</h2><p>محتوا، زمان‌بندی، ارزیابی و پاسخ‌گویی آموزشی بر عهدهٔ مؤسسه یا ارائه‌دهندهٔ مسئول دوره است.</p></section><SiteCTA title="ارزیابی را در مسیر دوره دنبال کن" description="دوره‌های آموزشی را ببین و تمرین‌ها و آزمون‌های مرتبط را بررسی کن."/></DenaPublicLayout>;
}

export function DenaAboutPage() {
  return <DenaPublicLayout><section className="site-split-hero"><NetworkGraphic/><div><Eyebrow>درباره دنا</Eyebrow><h1>یک اکوسیستم برای اتصال مسیرهای یادگیری</h1><p>دنا بستری یکپارچه برای اتصال دانش‌آموز، مؤسسات آموزشی، ارائه‌دهندگان و حامیان است تا مسیر یادگیری و رشد روشن‌تر شود.</p><Link className="dena-button dena-button--primary" href="/courses">دوره‌های دنا</Link></div></section><section className="dena-section"><TitleBlock title="وقتی یکی رشد می‌کند، همه جلو می‌روند" text="دنا بازارگاه جدا از فرایند یادگیری نیست؛ بستر اتصال و پیگیری مسیر یادگیری است. مسئولیت آموزش و همراهی تحصیلی با مؤسسه یا ارائه‌دهندهٔ مربوط است."/><RoleCards/></section><section className="dena-section about-platform"><div><Eyebrow>بستر اتصال و هماهنگی</Eyebrow><h2>دنا چگونه یادگیری را به هم پیوند می‌دهد؟</h2><p>جلسه‌های آموزشی، نتایج آزمون‌ها و عملکرد درسی در یک مسیر قابل پیگیری نمایش داده می‌شوند.</p></div><div className="trust-cards"><article><h3>نمایش مسیر رشد</h3><p>پیشرفت جلسات و تغییرات عملکرد در طول زمان.</p></article><article><h3>تمرین و ارزیابی</h3><p>تمرین و آزمون هر دوره به فرایند یادگیری متصل است.</p></article><article><h3>دسترسی یکپارچه</h3><p>دوره‌های مؤسسات در یک بستر قابل بررسی و پیگیری‌اند.</p></article></div></section><SiteCTA title="در دنا، آموزش تنها نیست؛ رشد همراه است" description="دوره‌ها، آزمون‌ها، مسیر رشد و باشگاه نخبگان را در یک اکوسیستم پیوسته بشناس." href="/elite-club" label="باشگاه نخبگان"/></DenaPublicLayout>;
}

export function DenaInstituteCollaborationPage() {
  return <DenaPublicLayout><section className="institute-banner"><div><Eyebrow>ویژه مؤسسات آموزشی</Eyebrow><h1>به اکوسیستم دنا بپیوندید</h1><p>دوره‌های آموزشی خود را با هویت مؤسسه، ارزیابی و همراهی تحصیلی در بستری یکپارچه ارائه کنید.</p><div className="dena-hero__actions"><Link className="dena-button dena-button--primary" href="/institutes/request">ثبت درخواست همکاری</Link><Link className="dena-button dena-button--outline" href="/about">درباره دنا</Link></div></div><ul><li>دوره‌ها با هویت خود مؤسسه</li><li>پیگیری آموزشی در یک مسیر منسجم</li><li>مدیریت قیمت و ارزیابی توسط مؤسسه</li></ul></section><section className="dena-section"><TitleBlock title="همکاری با دنا؛ نقش‌های روشن"/><div className="trust-cards"><article><h3>همراهی و مسیر رشد</h3><p>مؤسسه همراهی تحصیلی را انجام می‌دهد و دنا روند یادگیری را نمایش می‌دهد.</p></article><article><h3>قیمت، تمرین و ارزیابی</h3><p>قیمت‌گذاری، تمرین‌ها و آزمون‌های دوره بر عهدهٔ مؤسسه یا ارائه‌دهنده است.</p></article><article><h3>هویت و مالکیت محتوا</h3><p>دوره‌های ضبط‌شده با هویت مؤسسه منتشر می‌شوند و حقوق محتوا نزد صاحب آن می‌ماند.</p></article></div></section><section className="dena-section institute-roles"><div><Eyebrow>نقش‌ها در همکاری آموزشی</Eyebrow><h2>نظارت آموزشی با مؤسسهٔ دارای مجوز است</h2><p>هر دوره باید مسئول آموزشی روشن داشته باشد. ارائه‌دهندهٔ تحت نظارت فقط با تأیید مؤسسه و برای دورهٔ مشخص فعالیت می‌کند.</p></div><RoleCards/></section><SiteCTA title="مؤسسهٔ آموزشی هستید؟ با دنا همراه شوید" description="دوره‌های آفلاین خود را با هویت مؤسسه، ارزیابی و همراهی تحصیلی ارائه کنید." href="/institutes/request" label="ثبت درخواست همکاری"/></DenaPublicLayout>;
}

export function DenaInstituteRequestPage() {
  return <DenaPublicLayout>
    <section className="catalog-intro">
      <TitleBlock
        eyebrow="همکاری با دنا"
        title="درخواست همکاری مؤسسهٔ آموزشی"
        text="برای ثبت و پیگیری درخواست، از مسیر امن حساب کاربری دنا اقدام کنید. این صفحه اطلاعات هویتی یا مدارک مؤسسه را جمع‌آوری نمی‌کند."
      />
    </section>
    <section className="dena-section institute-form-layout">
      <aside>
        <h2>مسیر بررسی درخواست</h2>
        <ol>
          <li>ورود به حساب با شمارهٔ همراه تأییدشده</li>
          <li>ثبت درخواست نقش مؤسسه و شرح زمینهٔ همکاری</li>
          <li>بررسی درخواست توسط تیم دنا</li>
        </ol>
        <div className="content-disclaimer-block">
          <b>مدارک و مجوزها</b>
          <p>در فرم درخواست، کد ملی، اطلاعات دانش‌آموزان یا فایل مدرک وارد نکنید. ثبت درخواست به‌معنای تأیید مؤسسه یا صدور مجوز فعالیت آموزشی نیست.</p>
        </div>
      </aside>
      <div className="institute-request-form">
        <h2>ثبت درخواست از پنل امن</h2>
        <p>در حساب دنا، نوع درخواست را «مؤسسه» انتخاب کنید. وضعیت درخواست نیز در همان بخش قابل پیگیری است.</p>
        <Link className="dena-button dena-button--primary" href="/login?next=%2Faccount%2Frole-applications">ورود و ثبت درخواست مؤسسه</Link>
      </div>
    </section>
  </DenaPublicLayout>;
}

export function DenaInstituteConfirmationPage() {
  return <DenaPublicLayout>
    <section className="confirmation-state">
      <Eyebrow>درخواست همکاری مؤسسه</Eyebrow>
      <h1>برای ثبت درخواست وارد حساب دنا شوید</h1>
      <p>هیچ درخواستی از این صفحه ثبت نشده است. برای ارسال و پیگیری درخواست نقش مؤسسه، از مسیر حساب کاربری اقدام کنید.</p>
      <div className="content-disclaimer-block">
        <b>حریم اطلاعات</b>
        <p>اطلاعات هویتی و مدارک مجوز را در نشانی صفحه یا فرم‌های عمومی ارسال نکنید. درخواست اولیه فقط شرح فعالیت و نام مؤسسه را می‌گیرد.</p>
      </div>
      <Link className="dena-button dena-button--primary" href="/login?next=%2Faccount%2Frole-applications">ورود و ثبت درخواست مؤسسه</Link>
    </section>
  </DenaPublicLayout>;
}

export function DenaAccountInfoPage({ mode }: { mode: "signup" | "recovery" }) {
  const isSignup = mode === "signup";
  return <main id="main-content" className="dena-auth-page">
    <header className="dena-auth-header"><Link href="/" aria-label="صفحهٔ اصلی دنا"><Image src="/dena-app-logo.png" alt="دنا" width={83} height={48} /></Link><Link href="/" className="auth-back-link">بازگشت به صفحهٔ اصلی</Link></header>
    <div className="dena-auth-stage">
      <section className="dena-auth-illustration" aria-label="اکوسیستم آموزشی دنا"><div className="auth-network-art" aria-hidden="true"><svg viewBox="0 0 520 420"><path className="auth-network-line" d="M260 96 122 186m138-90 138 90M122 186l44 136m88-226v226m138-136-44 136M122 186h276M166 322h188"/><circle className="auth-network-orbit" cx="260" cy="209" r="148"/><g className="auth-network-node auth-network-node--main"><circle cx="260" cy="96" r="43"/><path d="M242 99h36m-18-18v36"/><text x="260" y="158">یادگیری</text></g><g className="auth-network-node"><circle cx="122" cy="186" r="31"/><path d="M112 189h20m-10-10v20"/><text x="122" y="238">دانش‌آموز</text></g><g className="auth-network-node"><circle cx="398" cy="186" r="31"/><path d="M386 194h24m-20-14h16"/><text x="398" y="238">مؤسسه</text></g><g className="auth-network-node"><circle cx="166" cy="322" r="31"/><path d="M154 327h24m-12-15v20"/><text x="166" y="374">آزمون</text></g><g className="auth-network-node"><circle cx="354" cy="322" r="31"/><path d="m342 324 8 8 17-20"/><text x="354" y="374">رشد</text></g></svg></div><p>یادگیری تنها نیست؛ رشد همراه است.</p></section>
      <section className="dena-auth-card dena-auth-info-card" aria-labelledby="account-page-title">
        <span className="eyebrow">حساب کاربری دنا</span>
        <h1 id="account-page-title">{isSignup ? "ساخت حساب دانش‌آموزی" : "بازیابی دسترسی به حساب"}</h1>
        <p>{isSignup ? "با تأیید شمارهٔ همراه، حساب دنا ساخته می‌شود. شمارهٔ همراه شما راه ورود امن به فضای کاربری است." : "برای بازیابی دسترسی، همان شمارهٔ همراه متصل به حساب را وارد کنید و کد یک‌بارمصرف تازه بگیرید."}</p>
        <div className="auth-info-note"><b>{isSignup ? "ثبت‌نام و ورود در یک فرایند" : "ورود امن با کد یک‌بارمصرف"}</b><span>{isSignup ? "اگر شمارهٔ همراه قبلاً حساب داشته باشد، با همان حساب وارد می‌شوید." : "کد بازیابی فقط به شمارهٔ همراه ثبت‌شده ارسال می‌شود."}</span></div>
        <Link className="dena-button dena-button--primary auth-main-action" href={`/login?flow=${mode}`}>{isSignup ? "ادامه با شمارهٔ همراه" : "بازیابی با شمارهٔ همراه"}</Link>
        <Link className="auth-secondary-link" href={isSignup ? "/login" : "/signup"}>{isSignup ? "قبلاً حساب ساخته‌ام؛ ورود" : "حساب ندارم؛ ثبت‌نام"}</Link>
      </section>
    </div>
    <footer className="dena-auth-footer">دسترسی به نقش‌های سازمانی و آموزشی پس از احراز صلاحیت و تأیید درخواست فعال می‌شود.</footer>
  </main>;
}
