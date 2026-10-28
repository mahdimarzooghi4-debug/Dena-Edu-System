import Image from "next/image";
import Link from "next/link";
import "./dena-homepage.css";
import { DenaRoleIcon } from "./dena-site-shell";

const steps = [
  ["۱", "انتخاب دوره از مؤسسه", "مرور دوره‌های ساختارمند مؤسسات آموزشی دارای مجوز و ارائه‌دهندگان تحت نظارت"],
  ["۲", "یادگیری آفلاین", "مشاهده جلسات آموزشی ضبط‌شده، انجام تمرین‌ها و پیشروی در دوره با سرعت شخصی"],
  ["۳", "آزمون و ارزیابی", "ثبت نتایج آزمون‌ها، تمرین‌ها و عملکرد درسی در طول مسیر یادگیری"],
  ["۴", "پایش مسیر رشد", "ترکیب آزمون، تمرین، پیشرفت دوره و عملکرد درسی برای نمایش روند رشد و قدم بعدی"],
];

const previewCourses = [
  { id: "math-tenth", title: "ریاضی دهم تجربی و ریاضی", provider: "مؤسسه آموزشی نمونه", teacher: "استاد علیرضا احمدی", sessions: "۲۴ جلسه آموزشی", hours: "۱۸ ساعت محتوای آموزشی", price: "۳,۸۰۰,۰۰۰ تومان", image: "math", supervised: false },
  { id: "physics-tenth", title: "فیزیک دهم (مکانیک)", provider: "گروه ماز", teacher: "دکتر رضا علوی", sessions: "۲۰ جلسه آموزشی", hours: "۱۵ ساعت محتوای آموزشی", price: "۳,۲۰۰,۰۰۰ تومان", image: "physics", supervised: true },
  { id: "chemistry-tenth", title: "شیمی دهم (کیهان و ساختار)", provider: "مؤسسه کنکور برتر", teacher: "استاد مریم سهرابی", sessions: "۲۸ جلسه آموزشی", hours: "۲۲ ساعت محتوای آموزشی", price: "۴,۱۰۰,۰۰۰ تومان", image: "chemistry", supervised: false },
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
          <Link className="dena-button dena-button--primary" href="/signup">ثبت‌نام</Link>
        </div>
        <div className="dena-header__right">
          <nav className="dena-nav" aria-label="ناوبری اصلی">
            <Link href="/about">درباره دنا</Link>
            <Link href="/elite-club">باشگاه نخبگان</Link>
            <Link href="/assessments">آزمون‌ها</Link>
            <Link href="/growth">مسیر رشد</Link>
            <Link href="/courses">دوره‌ها</Link>
            <Link className="is-active" href="/">خانه</Link>
          </nav>
          <Brand />
        </div>
      </header>

      <section className="dena-hero" aria-labelledby="hero-title">
        <div className="dena-hero__inner">
          <div className="growth-preview" aria-label="نمونهٔ مسیر رشد و یادگیری دانش‌آموز">
            <div className="growth-preview__heading">
              <strong><i />مسیر رشد من</strong>
              <span>نمونهٔ نمایشی</span>
            </div>
            <div className="growth-chart" aria-hidden="true">
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
                <small>جلسه ۸ از ۲۴ (محتوای آفلاین)</small>
                <div className="progress" role="progressbar" aria-label="پیشرفت نمونهٔ دورهٔ ریاضی دهم" aria-valuemin={0} aria-valuemax={24} aria-valuenow={8}><i /></div>
              </article>
              <article className="mini-course mini-course--next">
                <span className="pill">گام بعدی پیشنهادی</span>
                <strong>آزمون سنجش مستمر فصل ۳</strong>
                <small>تعیین‌شده توسط مؤسسه البرز · نمونه</small>
                <Link href="/assessments">دیدن ارزیابی‌ها <b aria-hidden="true">←</b></Link>
              </article>
            </div>
          </div>
          <div className="dena-hero__copy">
            <span className="eyebrow">اکوسیستم آموزشی دنا</span>
            <h1 id="hero-title">یک مسیر یکپارچه برای رشد تحصیلی</h1>
            <p>دوره‌های آموزشی آفلاین از مؤسسات، تمرین و آزمون، همراهی آموزشی مؤسسه و مشاهدهٔ مسیر رشد تحصیلی؛ همه در یک تجربهٔ یکپارچه. اطلاعات پیش‌نمایش این صفحه نمونه‌اند و دوره‌های واقعی پس از تأیید مؤسسه منتشر می‌شوند.</p>
            <div className="dena-hero__actions">
            <Link className="dena-button dena-button--primary" href="/login">ورود به دنا</Link>
              <Link className="dena-button dena-button--text" href="/courses">مشاهده دوره‌ها</Link>
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
              {number !== "۱" && <i className="learning-step__connector" aria-hidden="true" />}
            </article>
          ))}
        </div>
      </section>

      <section className="dena-section dena-courses" id="courses">
        <div className="dena-section__heading dena-section__heading--right">
          <h2>دوره‌های آموزشی در مسیر رشد تو</h2>
          <p>دوره‌ها در دنا توسط مؤسسات آموزشی دارای مجوز یا ارائه‌دهندگان تحت نظارت یک مؤسسهٔ دارای مجوز ارائه می‌شوند. کارت‌های زیر نمونهٔ نمایشی‌اند؛ دورهٔ واقعی برای ثبت‌نام در این بخش منتشر نشده است.</p>
        </div>
        <div className="course-grid home-course-grid">
          {previewCourses.map((course) => (
            <article className="course-card home-course-card" key={course.id}>
              <div className={`course-card__image course-card__image--${course.image}`} role="img" aria-label={`تصویر نمایشی دورهٔ ${course.title}`}>
                <span className="course-card__image-label">نمونهٔ نمایشی</span>
              </div>
              <div className="course-card__body">
                <div className="course-card__badges"><span>{course.sessions}</span><span className={course.supervised ? "badge-supervised" : "badge-licensed"}>{course.supervised ? "ارائه‌دهنده تحت نظارت" : "مؤسسه آموزشی دارای مجوز"}</span></div>
                <h3>{course.title}</h3>
                <p>ارائه‌دهنده: {course.provider}<br />مدرس: {course.teacher}</p>
                <small>پایه دهم · {course.hours}</small>
                <div className="course-card__price"><strong>{course.price}</strong><span>پرداخت در ۴ قسط، بدون افزایش قیمت</span></div>
                <Link className="dena-button dena-button--primary" href={`/courses/${course.id}`}>مشاهدهٔ نمونه</Link>
              </div>
            </article>
          ))}
        </div>
        <Link className="dena-button dena-button--outline dena-courses__all" href="/institutes/request">ثبت درخواست همکاری مؤسسه</Link>
      </section>

      <section className="dena-section dena-growth" id="growth">
        <div className="growth-intro">
          <span className="eyebrow">پایش همه‌جانبه</span>
          <h2>رشدت را فقط حس نکن؛ ببین</h2>
          <p>در دنا، پیشرفت دوره، نتایج آزمون‌ها، تمرین‌ها و عملکرد درسی در طول زمان کنار هم قرار می‌گیرند تا دانش‌آموز بتواند روند رشد یا افت خود را ببیند و برای قدم بعدی مسیر یادگیری آماده شود.</p>
          <div className="growth-summary" aria-label="نمونهٔ خلاصهٔ مسیر رشد">
            <p><i className="growth-summary__dot growth-summary__dot--positive" />روند کلی شما رو به رشد است <span>نمونه</span></p>
            <p><i className="growth-summary__dot growth-summary__dot--review" />کاهش موقت عملکرد در درس فیزیک؛ نیاز به مرور در قدم بعدی مسیر یادگیری <span>نمونه</span></p>
          </div>
        </div>
        <div className="growth-visualization">
          <article className="growth-report">
            <header className="growth-report__header">
              <span className="eyebrow">مسیر رشد من</span>
              <span className="growth-report__sample">نمونهٔ نمایشی</span>
              <h3>روند عملکرد ۶ ماه اخیر</h3>
              <p>رشد طولی در ۶ ماه اخیر</p>
            </header>
            <div className="growth-chart-area" role="img" aria-label="نمودار نمونهٔ عملکرد شش‌ماهه، از ۵۰ تا ۹۰ درصد">
              <div className="growth-chart-area__plot">
                <svg viewBox="0 0 512 180" preserveAspectRatio="none" aria-hidden="true">
                  <path className="growth-chart-area__line" d="M0 174 L62 158 L154 116 L246 92 L338 59 L430 31 L512 2" />
                  {[ [78,132], [170,110], [262,88], [362,67], [470,44] ].map(([cx, cy]) => <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="5" />)}
                </svg>
              </div>
              <div className="growth-chart-area__y-axis" aria-hidden="true"><span>۹۰٪</span><span>۸۰٪</span><span>۷۰٪</span><span>۶۰٪</span><span>۵۰٪</span></div>
            </div>
            <div className="growth-report__labels"><span>آبان</span><span>آذر</span><span>دی</span><span>بهمن</span><span>اسفند</span><span>فروردین</span></div>
          </article>
          <div className="growth-insights">
            <div className="growth-trend-cards">
              <article className="growth-trend-card"><strong className="growth-trend-card__value is-positive">+۱۲٪</strong><span>رشد محسوس</span><b><i className="is-mint" />ریاضی دهم</b></article>
              <article className="growth-trend-card"><strong className="growth-trend-card__value">−۴٪</strong><span>نیاز به مرور مبحث بردارها</span><b><i className="is-lavender" />فیزیک دهم</b></article>
              <article className="growth-trend-card"><strong className="growth-trend-card__value is-violet">+۱٪</strong><span>ثبات تحصیلی</span><b><i className="is-violet" />شیمی دهم</b></article>
            </div>
            <div className="growth-milestone"><span className="growth-milestone__check" aria-hidden="true">✓</span><strong>قدم بعدی در مسیر یادگیری</strong></div>
            <div className="growth-action-card">
              <strong>برای مرور مبحث حرکت یکنواخت، یک جلسهٔ مرور ۱۰ دقیقه‌ای در دورهٔ مؤسسهٔ البرز در دسترس است.</strong>
              <span>ادامهٔ این بخش از مسیر یادگیری در همان دوره انجام می‌شود. این پیشنهاد فقط نمونهٔ نمایشی است.</span>
            </div>
          </div>
        </div>
      </section>

      <section className="dena-section dena-network" id="about-network">
        <div className="network-art" aria-hidden="true"><i /><i /><i /><i /><i /><i /><b /><b /><b /></div>
        <div className="network-copy">
          <span className="eyebrow">همراهی در مسیر یادگیری</span>
          <h2>استعدادها در کنار هم شکوفا می‌شوند</h2>
          <p>دنا یک بازارگاه جدا از فرایند یادگیری نیست؛ بلکه بستری یکپارچه برای اتصال دانش‌آموز، مؤسسات آموزشی، ارائه‌دهندگان و حامیان است. مسئولیت آموزش، ارزیابی و همراهی تحصیلی با مؤسسه یا ارائه‌دهندهٔ مربوط است و دنا بستر اتصال و پیگیری مسیر یادگیری را فراهم می‌کند.</p>
          <Link className="dena-button dena-button--primary" href="#roles">آشنایی با دنا</Link>
        </div>
      </section>

      <section className="dena-section dena-roles" id="roles">
        <div className="dena-section__heading">
          <h2>وقتی در کنار هم حرکت می‌کنیم، همه جلو می‌رویم</h2>
          <p>هر نقش، سهم روشنی در مسیر آموزش دارد.</p>
        </div>
        <div className="role-grid">
          {roles.map(([title, description, icon]) => (
            <article className={`role-card role-card--${icon}`} key={title}>
              <span className="role-card__icon" aria-hidden="true"><DenaRoleIcon kind={icon} /></span>
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
        <div><Link className="dena-button dena-button--mint" href="/signup">ثبت‌نام دانش‌آموز</Link><Link className="dena-button dena-button--dark-outline" href="/courses">مشاهده دوره‌ها</Link></div>
      </section>

      <section className="dena-section dena-institute-cta">
        <div><span className="eyebrow">همکاری با دنا</span><h2>مؤسسهٔ آموزشی هستید؟ به اکوسیستم دنا بپیوندید</h2><p>دوره‌های آفلاین خود را با هویت مؤسسه منتشر کنید؛ قیمت‌گذاری، ارزیابی و همراهی آموزشی را مدیریت کنید و مسیر رشد دانش‌آموزان را در یک بستر یکپارچه دنبال کنید.</p></div>
        <div className="dena-institute-cta__actions"><Link className="dena-button dena-button--primary" href="/institutes/request">ثبت‌نام مؤسسه</Link><Link className="dena-button dena-button--outline" href="/institutes/collaboration">دربارهٔ همکاری</Link></div>
      </section>

      <footer className="dena-footer">
        <div className="dena-footer__main">
          <div className="dena-footer__brand"><Brand footer /><p>آموزش تنها نیست؛ رشد همراه است.</p><small>اکوسیستم آموزشی دنا</small></div>
          <div><h3>دنا</h3><Link href="/courses">دوره‌ها</Link><Link href="/growth">مسیر رشد</Link><Link href="/elite-club">باشگاه نخبگان</Link><Link href="/assessments">آزمون‌ها</Link><Link href="/about">درباره دنا</Link></div>
          <div><h3>همکاری با دنا</h3><Link href="/institutes/request">ثبت‌نام مؤسسات</Link><Link href="/institutes/collaboration">سازمان‌ها و حامیان</Link></div>
          <div><h3>راهنما</h3><Link href="/support">پشتیبانی فنی</Link><Link href="/student/privacy">قوانین و حریم خصوصی</Link></div>
          <div><h3>تماس با دنا</h3><span>تلفن: ۰۲۱-۶۶۴۸۵۳۷۴</span><span>ایمیل: info@denaedu.ir</span><span>خیابان انقلاب، خیابان رازی، کوچه شهبازیان، پلاک ۲۲</span></div>
        </div>
        <div className="dena-footer__legal">حقوق پلتفرم و هویت دنا محفوظ است. حقوق محتوای آموزشی هر دوره متعلق به مؤسسه یا ارائه‌دهندهٔ آن است.</div>
      </footer>
    </main>
  );
}
