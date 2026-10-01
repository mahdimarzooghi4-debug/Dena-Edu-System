import Image from "next/image";
import Link from "next/link";
import "./dena-homepage.css";

const courses = [
  {
    subject: "ریاضی دهم تجربی و ریاضی",
    provider: "مؤسسه آموزشی نمونه",
    teacher: "استاد علیرضا احمدی",
    sessions: "۲۴ جلسه آموزشی",
    hours: "۱۸ ساعت محتوای آموزشی",
    price: "۲,۸۰۰,۰۰۰ تومان",
    photo: "math",
  },
  {
    subject: "فیزیک دهم (مکانیک)",
    provider: "گروه ماز · تحت نظارت مؤسسه البرز",
    teacher: "دکتر رضا علوی",
    sessions: "۲۰ جلسه آموزشی",
    hours: "۱۵ ساعت محتوای آموزشی",
    price: "۳,۲۰۰,۰۰۰ تومان",
    photo: "physics",
  },
  {
    subject: "شیمی دهم (کیهان و ساختار)",
    provider: "مؤسسه کنکور برتر",
    teacher: "استاد مریم سهرابی",
    sessions: "۲۸ جلسه آموزشی",
    hours: "۲۲ ساعت محتوای آموزشی",
    price: "۴,۱۰۰,۰۰۰ تومان",
    photo: "chemistry",
  },
];

const steps = [
  ["۱", "انتخاب دوره از مؤسسه", "دوره‌های ساختارمند مؤسسات آموزشی دارای مجوز را ببین و انتخاب کن."],
  ["۲", "یادگیری آفلاین", "جلسه‌های ضبط‌شده را ببین، تمرین کن و با سرعت خودت جلو برو."],
  ["۳", "آزمون و ارزیابی", "نتیجهٔ آزمون‌ها، تمرین‌ها و عملکرد درسی را در مسیر یادگیری ثبت کن."],
  ["۴", "پایش مسیر رشد", "روند رشد و قدم بعدی را با ترکیب پیشرفت دوره و عملکرد درسی ببین."],
];

const roles = [
  ["دانش‌آموز", "یادگیری و پیگیری مسیر رشد", "student"],
  ["مؤسسهٔ آموزشی", "طراحی دوره و همراهی آموزشی", "institute"],
  ["ارائه‌دهنده", "تولید دوره زیر نظر مؤسسه", "provider"],
  ["سازمان", "حمایت و گزارش‌های مجاز", "organization"],
  ["خیر و حامی", "حمایت از فرصت یادگیری", "benefactor"],
];

function Brand({ footer = false }: { footer?: boolean }) {
  return (
    <Link className={`dena-brand${footer ? " dena-brand--footer" : ""}`} href="/" aria-label="دنا، صفحهٔ اصلی">
      <Image src="/dena-app-logo.png" alt="دنا" width={83} height={48} priority={!footer} />
    </Link>
  );
}

export function DenaHomepage() {
  return (
    <main id="main-content" className="dena-home">
      <header className="dena-header">
        <div className="dena-header__actions">
          <Link className="dena-button dena-button--outline" href="/login">ورود</Link>
          <Link className="dena-button dena-button--primary" href="/login">ثبت‌نام</Link>
        </div>
        <div className="dena-header__right">
          <nav className="dena-nav" aria-label="ناوبری اصلی">
            <Link href="#about">درباره دنا</Link>
            <Link href="#elite-club">باشگاه نخبگان</Link>
            <Link href="#assessments">آزمون‌ها</Link>
            <Link href="#growth">مسیر رشد</Link>
            <Link href="#courses">دوره‌ها</Link>
            <Link className="is-active" href="#main-content">خانه</Link>
          </nav>
          <Brand />
        </div>
      </header>

      <section className="dena-hero" aria-labelledby="hero-title">
        <div className="dena-hero__inner">
          <div className="growth-preview" aria-label="نمونهٔ مسیر رشد و یادگیری دانش‌آموز">
            <div className="growth-preview__heading">
              <strong><i />مسیر رشد من</strong>
              <span>+۱۸٪ نسبت به ماه قبل</span>
            </div>
            <div className="growth-chart" aria-label="روند پیشرفت ماهانه">
              {[30, 45, 35, 60, 50, 75, 90].map((height, index) => (
                <div className="growth-chart__item" key={index}>
                  <i style={{ height }} />
                  <span>{["مهر", "آبان", "آذر", "دی", "بهمن", "اسفند", "خرداد"][index]}</span>
                </div>
              ))}
            </div>
            <div className="growth-preview__cards">
              <article className="mini-course">
                <span className="pill">ادامه یادگیری</span>
                <strong>ریاضی دهم</strong>
                <small>جلسه ۸ از ۲۴ · محتوای آفلاین</small>
                <div className="progress"><i /></div>
              </article>
              <article className="mini-course mini-course--next">
                <span className="pill">گام بعدی پیشنهادی</span>
                <strong>آزمون سنجش مستمر فصل ۳</strong>
                <small>تعیین‌شده توسط مؤسسه البرز</small>
                <Link href="/login">شروع ارزیابی <b aria-hidden="true">←</b></Link>
              </article>
            </div>
          </div>
          <div className="dena-hero__copy">
            <span className="eyebrow">اکوسیستم آموزشی دنا</span>
            <h1 id="hero-title">یک مسیر یکپارچه برای رشد تحصیلی</h1>
            <p>دوره‌های آموزشی آفلاین از مؤسسات، تمرین و آزمون، همراهی آموزشی مؤسسه و مشاهدهٔ مسیر رشد تحصیلی؛ همه در یک تجربهٔ یکپارچه.</p>
            <div className="dena-hero__actions">
              <Link className="dena-button dena-button--primary" href="#courses">ورود به دنا</Link>
              <Link className="dena-button dena-button--text" href="#courses">مشاهده دوره‌ها</Link>
            </div>
          </div>
        </div>
      </section>

      <section className="dena-section dena-how" id="about">
        <div className="dena-section__heading">
          <h2>از یادگیری تا رشد، یک مسیر پیوسته</h2>
          <p>دنا چگونه مراحل یادگیری شما را به هم پیوند می‌زند؟</p>
        </div>
        <div className="learning-steps">
          {steps.map(([number, title, description]) => (
            <article className="learning-step" key={number}>
              <div><h3>{title}</h3><p>{description}</p></div>
              <span>{number}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="dena-section dena-courses" id="courses">
        <div className="dena-section__heading dena-section__heading--right">
          <h2>دوره‌های آموزشی در مسیر رشد تو</h2>
          <p>دوره‌ها را مؤسسات آموزشی دارای مجوز و ارائه‌دهندگان تحت نظارت آن‌ها ارائه می‌کنند. مسئولیت آموزشی هر دوره با ارائه‌دهندهٔ آن است.</p>
        </div>
        <div className="course-grid">
          {courses.map((course, index) => (
            <article className="course-card" key={course.subject}>
              <div className={`course-card__image course-card__image--${course.photo}`} role="img" aria-label={`تصویر دورهٔ ${course.subject}`}>
                <span className="course-card__image-label">یادگیری مفهومی · پایه دهم</span>
              </div>
              <div className="course-card__body">
                <div className="course-card__badges">
                  <span>{course.sessions}</span>
                  <span className={index === 1 ? "badge-supervised" : "badge-licensed"}>{index === 1 ? "ارائه‌دهندهٔ تحت نظارت" : "مؤسسهٔ دارای مجوز"}</span>
                </div>
                <h3>{course.subject}</h3>
                <p>ارائه‌دهنده: {course.provider}<br />مدرس: {course.teacher}</p>
                <small>{course.hours}</small>
                <div className="course-card__price"><strong>{course.price}</strong><span>پرداخت در ۴ قسط، بدون افزایش قیمت</span></div>
                <Link className="dena-button dena-button--primary" href="/login">مشاهده دوره</Link>
              </div>
            </article>
          ))}
        </div>
        <Link className="dena-button dena-button--outline dena-courses__all" href="/login">مشاهده همهٔ دوره‌ها</Link>
      </section>

      <section className="dena-section dena-growth" id="growth">
        <div className="dena-growth__copy">
          <span className="eyebrow">یادگیری هدفمند</span>
          <h2>رشد را فقط با یک نمره نمی‌سنجیم</h2>
          <p>ترکیب تمرین، آزمون و پیشرفت دوره کمک می‌کند تصویر روشن‌تری از مسیر یادگیری داشته باشی و قدم بعدی را آگاهانه انتخاب کنی.</p>
          <ul>
            <li>پیشرفت در جلسات و محتوای دوره</li>
            <li>نتیجهٔ تمرین‌ها و آزمون‌های مستمر</li>
            <li>پیشنهاد قدم بعدی متناسب با مسیر تو</li>
          </ul>
        </div>
        <div className="growth-report" aria-label="نمونهٔ نمودار پیشرفت تحصیلی">
          <div className="growth-report__top"><span>روند عملکرد تحصیلی</span><strong>+۱۸٪</strong></div>
          <div className="growth-report__chart"><i /><i /><i /><i /><i /><i /></div>
          <div className="growth-report__labels"><span>مهر</span><span>آبان</span><span>آذر</span><span>دی</span><span>بهمن</span><span>اسفند</span></div>
          <div className="report-note"><b>گام بعدی پیشنهادی</b><span>مرور مبحث و انجام تمرین تکمیلی</span></div>
        </div>
      </section>

      <section className="dena-section dena-network" id="about-network">
        <div className="network-art" aria-hidden="true"><i /><i /><i /><i /><i /><i /><b /><b /><b /></div>
        <div className="network-copy">
          <span className="eyebrow">همراهی در مسیر یادگیری</span>
          <h2>استعدادها در کنار هم شکوفا می‌شوند</h2>
          <p>دانش‌آموز، مؤسسه، ارائه‌دهنده و حامی در یک مسیر روشن و مسئولانه کنار هم قرار می‌گیرند.</p>
          <Link className="dena-button dena-button--primary" href="#roles">آشنایی با دنا</Link>
        </div>
      </section>

      <section className="dena-section dena-roles" id="roles">
        <div className="dena-section__heading">
          <h2>وقتی در کنار هم حرکت می‌کنیم، همه جلو می‌رویم</h2>
          <p>هر نقش، سهم روشنی در مسیر آموزش دارد.</p>
        </div>
        <div className="role-grid">
          {roles.map(([title, description, icon], index) => (
            <article className={`role-card role-card--${icon}`} key={title}>
              <span className="role-card__icon" aria-hidden="true">{["✦", "▣", "⌘", "⌂", "♡"][index]}</span>
              <h3>{title}</h3><p>{description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="dena-section dena-support" id="elite-club">
        <div className="dena-section__heading dena-section__heading--right">
          <span className="eyebrow">همراهی آموزشی</span>
          <h2>حمایت در انتخاب دوره تا مسیر رشد</h2>
          <p>هر دانش‌آموز می‌تواند در طول مسیر از همراهی آموزشی متناسب با نیازش استفاده کند.</p>
        </div>
        <div className="support-grid">
          <article><span>۰۱</span><h3>انتخاب آگاهانه</h3><p>اطلاعات دوره و ارائه‌دهنده را پیش از شروع بررسی کن.</p></article>
          <article><span>۰۲</span><h3>پیگیری یادگیری</h3><p>تمرین‌ها و آزمون‌ها را در مسیر دوره انجام بده.</p></article>
          <article><span>۰۳</span><h3>همراهی مؤسسه</h3><p>در چارچوب خدمات دوره، از راهنمایی تیم آموزشی استفاده کن.</p></article>
          <article><span>۰۴</span><h3>مشاهدهٔ پیشرفت</h3><p>گام‌های برداشته‌شده و قدم بعدی را دنبال کن.</p></article>
        </div>
      </section>

      <section className="dena-cta" id="assessments">
        <h2>مسیر رشدت را از همین‌جا شروع کن</h2>
        <p>یادگیری، تمرین و ارزیابی را در یک مسیر منسجم دنبال کن.</p>
        <div><Link className="dena-button dena-button--mint" href="/login">ثبت‌نام دانش‌آموز</Link><Link className="dena-button dena-button--dark-outline" href="#courses">مشاهده دوره‌ها</Link></div>
      </section>

      <section className="dena-section dena-institute-cta">
        <div><span className="eyebrow">همکاری با دنا</span><h2>مؤسسهٔ آموزشی هستید؟ به اکوسیستم ما بپیوندید</h2><p>دوره‌های خود را ساختارمند ارائه کنید و مسیر یادگیری دانش‌آموزان را همراهی کنید.</p></div>
        <div className="dena-institute-cta__actions"><Link className="dena-button dena-button--primary" href="/account/role-applications">ثبت‌نام مؤسسه</Link><Link className="dena-button dena-button--outline" href="#about">دربارهٔ همکاری</Link></div>
      </section>

      <footer className="dena-footer">
        <div className="dena-footer__main">
          <div className="dena-footer__brand"><Brand footer /><p>آموزش تنها نیست؛ رشد همراه است.</p><small>اکوسیستم آموزشی دنا</small></div>
          <div><h3>دنا</h3><Link href="#courses">دوره‌ها</Link><Link href="#growth">مسیر رشد</Link><Link href="#elite-club">باشگاه نخبگان</Link><Link href="#assessments">آزمون‌ها</Link><Link href="#about">درباره دنا</Link></div>
          <div><h3>همکاری با دنا</h3><Link href="/account/role-applications">ثبت‌نام مؤسسات</Link><Link href="/account/role-applications">سازمان‌ها و حامیان</Link></div>
          <div><h3>راهنما</h3><Link href="/support">پشتیبانی فنی</Link><Link href="/student/privacy">قوانین و حریم خصوصی</Link></div>
          <div><h3>تماس با دنا</h3><span>تلفن: ۰۲۱-۶۶۴۸۵۳۷۴</span><span>ایمیل: info@denaedu.ir</span><span>خیابان انقلاب، خیابان رازی، کوچه شهبازیان، پلاک ۲۲</span></div>
        </div>
        <div className="dena-footer__legal">حقوق پلتفرم و هویت دنا محفوظ است. حقوق محتوای آموزشی هر دوره متعلق به مؤسسه یا ارائه‌دهندهٔ آن است.</div>
      </footer>
    </main>
  );
}
