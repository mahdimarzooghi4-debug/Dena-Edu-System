import Image from "next/image";
import Link from "next/link";
import "./dena-homepage.css";
import { DenaSiteHeader, DenaSiteFooter } from "./dena-site-shell";

const steps = [
  ["۱", "انتخاب دوره از مؤسسه", "مرور دوره‌های ساختارمند مؤسسات آموزشی دارای مجوز و ارائه‌دهندگان تحت نظارت"],
  ["۲", "یادگیری آفلاین", "مشاهده جلسات آموزشی ضبط‌شده، انجام تمرین‌ها و پیشروی در دوره با سرعت شخصی"],
  ["۳", "آزمون و ارزیابی", "ثبت نتایج آزمون‌ها، تمرین‌ها و عملکرد درسی در طول مسیر یادگیری"],
  ["۴", "پایش مسیر رشد", "ترکیب آزمون، تمرین، پیشرفت دوره و عملکرد درسی برای نمایش روند رشد و قدم بعدی"],
];

const previewCourses = [
  { id: "math-tenth", title: "ریاضی دهم تجربی و ریاضی", provider: "مؤسسه آموزشی نمونه", teacher: "استاد علیرضا احمدی", sessions: "۲۴ جلسه آموزشی", hours: "۱۸ ساعت محتوای آموزشی", price: "۳,۸۰۰,۰۰۰ تومان", image: "/figma/dena-home/math-tenth.jpg", supervised: false },
  { id: "physics-tenth", title: "فیزیک دهم (مکانیک)", provider: "گروه ماز", teacher: "دکتر رضا علوی", sessions: "۲۰ جلسه آموزشی", hours: "۱۵ ساعت محتوای آموزشی", price: "۳,۲۰۰,۰۰۰ تومان", image: "/figma/dena-home/physics-tenth.jpg", supervised: true },
  { id: "chemistry-tenth", title: "شیمی دهم (کیهان و ساختار)", provider: "مؤسسه کنکور برتر", teacher: "استاد مریم سهرابی", sessions: "۲۸ جلسه آموزشی", hours: "۲۲ ساعت محتوای آموزشی", price: "۴,۱۰۰,۰۰۰ تومان", image: "/figma/dena-home/chemistry-tenth.jpg", supervised: false },
];

const roles = [
  { title: "دانش‌آموز", description: "محور اصلی یادگیری و ترسیم‌کننده مسیر رشد فردی", kind: "student", icon: "/figma/dena-home/role-student.svg" },
  { title: "مؤسسه آموزشی دارای مجوز", description: "ارائه‌دهنده رسمی دوره‌ها و مسئول مستقیم پشتیبانی و مشاوره", kind: "institute", icon: "/figma/dena-home/role-institute.svg" },
  { title: "ارائه‌دهنده تحت نظارت", description: "فعالیت آموزشی تحت نظارت یک مؤسسه آموزشی دارای مجوز", kind: "provider", icon: "/figma/dena-home/role-provider.svg" },
  { title: "سازمان‌ها و حامیان", description: "تسهیل دسترسی به فرصت‌های برابر رشد برای همه فرزندان ایران", kind: "organization", icon: "/figma/dena-home/role-organization.svg" },
] as const;

export function DenaHomepage() {
  return (
    <main id="main-content" className="dena-home">
      <DenaSiteHeader />

      <section className="dena-hero" aria-labelledby="hero-title">
        <div className="dena-hero__inner">
          <div className="growth-preview" aria-label="نمونهٔ مسیر رشد و یادگیری دانش‌آموز">
            <div className="growth-preview__heading">
              <strong><i />مسیر رشد من</strong>
              <span>+۱۸٪ نسبت به ماه قبل <small>نمونه</small></span>
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
                <small>تعیین‌شده توسط مؤسسه البرز</small>
                <Link href="/assessments">شروع ارزیابی <b aria-hidden="true">←</b></Link>
              </article>
            </div>
          </div>
          <div className="dena-hero__copy">
            <span className="eyebrow">اکوسیستم آموزشی دنا</span>
            <h1 id="hero-title">یک مسیر یکپارچه برای رشد تحصیلی</h1>
            <p>دوره‌های آموزشی آفلاین از مؤسسات، تمرین و آزمون، همراهی آموزشی مؤسسه و مشاهده مسیر رشد تحصیلی؛ همه در یک تجربه یکپارچه.</p>
            <div className="dena-hero__actions">
              <Link className="dena-button dena-button--primary" href="/login">ورود به دنا</Link>
              <Link className="dena-button dena-button--purple-outline" href="/courses">مشاهده دوره‌ها</Link>
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
          <p>دوره‌های آموزشی در دنا توسط مؤسسات آموزشی دارای مجوز یا ارائه‌دهندگان تحت نظارت یک مؤسسه دارای مجوز ارائه می‌شوند. مالکیت و مسئولیت آموزشی هر دوره با ارائه‌دهنده آن است.</p>
        </div>
        <div className="course-grid home-course-grid">
          {previewCourses.map((course) => (
            <article className="course-card home-course-card" key={course.id}>
              <div className="course-card__image" role="img" aria-label={`تصویر نمونهٔ دورهٔ ${course.title}`}>
                <Image src={course.image} alt="" fill sizes="(max-width: 760px) 100vw, (max-width: 1100px) 45vw, 411px" className="home-course-card__photo" />
              </div>
              <div className="course-card__body">
                <div className="course-card__badges"><span>{course.sessions}</span><span className={course.supervised ? "badge-supervised" : "badge-licensed"}>{course.supervised ? "ارائه‌دهنده تحت نظارت مؤسسه آموزشی البرز" : "مؤسسه آموزشی دارای مجوز"}</span></div>
                <h3>{course.title}</h3>
                <p>ارائه‌دهنده: {course.provider}<br />مدرس: {course.teacher}</p>
                <small>پایه دهم · {course.hours}</small>
                <div className="course-card__price"><strong>{course.price}</strong><span>پرداخت در ۴ قسط، بدون افزایش قیمت</span></div>
                <Link className="dena-button dena-button--primary" href={`/courses/${course.id}`}>مشاهده دوره</Link>
              </div>
            </article>
          ))}
        </div>
        <p className="home-course-disclaimer">کارت‌های بالا نمونهٔ نمایشی‌اند؛ دورهٔ واقعی برای ثبت‌نام در این بخش منتشر نشده است.</p>
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
        <Image className="network-art" src="/figma/dena-home/elite-network.svg" alt="" width={580} height={480} />
        <div className="network-copy">
          <span className="eyebrow">باشگاه نخبگان دنا</span>
          <h2>استعدادها در کنار هم شکوفا می‌شوند</h2>
          <p>باشگاه نخبگان دنا، بخشی از اکوسیستم دنا با تمرکز بر رشد استعدادها، ارتباط دانش‌آموزان و شکل‌گیری فرصت‌های تازه برای نوآفرینی و پیشرفت است.</p>
          <Link className="dena-button dena-button--primary" href="/elite-club">آشنایی با باشگاه</Link>
        </div>
      </section>

      <section className="dena-section dena-roles" id="roles">
        <div className="dena-section__heading">
          <h2>وقتی یکی رشد می‌کند، همه جلو می‌روند</h2>
          <p>دنا یک بازارگاه جدا از فرایند یادگیری نیست؛ بلکه بستری یکپارچه برای اتصال دانش‌آموز، مؤسسات آموزشی، ارائه‌دهندگان و حامیان است. مسئولیت آموزش، ارزیابی و همراهی تحصیلی با مؤسسه یا ارائه‌دهنده مربوط است و دنا بستر اتصال و پیگیری مسیر یادگیری را فراهم می‌کند.</p>
        </div>
        <div className="role-grid">
          {roles.map((role) => (
            <article className={"role-card role-card--" + role.kind} key={role.kind}>
              <Image className="role-card__icon-image" src={role.icon} alt="" width={48} height={48} />
              <h3>{role.title}</h3>
              <p>{role.description}</p>
            </article>
          ))}
        </div>
        <p className="dena-roles__note">باشگاه نخبگان دنا نیز بخشی از این اکوسیستم است — با تمرکز بر رشد استعدادها و ایجاد فرصت‌های نوآفرینی.</p>
        <div className="dena-ecosystem-hub">
          <div className="dena-ecosystem-hub__icon"><Image src="/figma/dena-home/dena-symbol.svg" alt="" width={48} height={48} /></div>
          <strong>دنا</strong>
          <span>بستر اتصال و هماهنگی</span>
        </div>
      </section>

      <section className="dena-section dena-support" id="transparency">
        <div className="dena-section__heading dena-section__heading--right">
          <h2>شفافیت از انتخاب دوره تا مسیر رشد</h2>
          <p>قبل از ثبت‌نام می‌دانی دوره را چه کسی ارائه می‌دهد، وضعیت ارائه‌دهنده چیست، شرایط پرداخت چگونه است و رشد تحصیلی‌ات چطور پیگیری می‌شود.</p>
        </div>
        <div className="support-grid">
          <article><h3>رشد فقط با تماشای درس سنجیده نمی‌شود</h3><p>آزمون‌ها، تمرین‌ها، عملکرد درسی و روند پیشرفت در طول زمان کنار هم قرار می‌گیرند تا دانش‌آموز مسیر رشد خود را ببیند.</p></article>
          <article><h3>شرایط پرداخت از قبل مشخص است</h3><p>قیمت دوره پیش از ثبت‌نام نمایش داده می‌شود و در دوره‌های مشمول پرداخت اقساطی، مبلغ در ۴ قسط و بدون افزایش قیمت پرداخت می‌شود.</p></article>
          <article><h3>وضعیت ارائه‌دهنده مشخص است</h3><p>مؤسسه دارای مجوز با نشان آبی و ارائه‌دهنده تحت نظارت با نشان نارنجی مشخص می‌شود. برای ارائه‌دهنده تحت نظارت، مؤسسه ناظر نیز نمایش داده می‌شود.</p></article>
          <article><h3>مسئولیت هر دوره روشن است</h3><p>محتوا، قیمت‌گذاری، ارزیابی و همراهی آموزشی هر دوره بر عهده مؤسسه یا ارائه‌دهنده آن است؛ دنا بستر یکپارچه دسترسی و پیگیری مسیر یادگیری است.</p></article>
        </div>
      </section>

      <section className="dena-cta" id="assessments">
        <h2>مسیر رشدت را از همین‌جا شروع کن</h2>
        <p>دوره مناسب مسیرت را پیدا کن و روند رشد تحصیلی‌ات را پیوسته دنبال کن.</p>
        <div>
          <Link className="dena-button dena-button--dark-outline" href="/courses">مشاهده دوره‌ها</Link>
          <Link className="dena-button dena-button--primary" href="/login">ورود به دنا</Link>
        </div>
      </section>

      <section className="dena-app-downloads" id="download-app" aria-labelledby="dena-app-downloads-title">
        <div className="dena-app-downloads__heading">
          <span className="eyebrow">دنا همیشه همراه تو</span>
          <h2 id="dena-app-downloads-title">اپ دانش‌آموز دنا را دریافت کن</h2>
          <p>از گوشی اندرویدی‌ات دانلود کن یا نسخهٔ وب را بدون نصب از فروشگاه، روی صفحهٔ اصلی گوشی اضافه کن.</p>
        </div>
        <div className="dena-app-downloads__grid">
          <article className="dena-app-download-card dena-app-download-card--android">
            <span className="dena-app-download-card__icon" aria-hidden="true">اندروید</span>
            <div>
              <h3>نسخهٔ اندروید</h3>
              <p>فایل نصب اپ دنا برای گوشی‌ها و تبلت‌های اندرویدی.</p>
            </div>
            <a className="dena-button dena-button--primary" href="/download/android/apk" download="dena-student.apk">دانلود اپ اندروید</a>
          </article>
          <article className="dena-app-download-card dena-app-download-card--pwa">
            <span className="dena-app-download-card__icon" aria-hidden="true">وب‌اپ</span>
            <div>
              <h3>نسخهٔ وب (PWA)</h3>
              <p>بدون دانلود فایل، اپ را در مرورگر باز و به صفحهٔ اصلی اضافه کن.</p>
            </div>
            <a className="dena-button dena-button--outline" href="https://dena-student-demo.onrender.com/student-demo/install">نصب وب‌اپ دنا</a>
          </article>
        </div>
      </section>

      <section className="dena-institute-section">
        <div className="dena-institute-cta">
          <aside className="dena-institute-benefits">
            <h3>در همکاری با دنا</h3>
            <p>مالکیت محتوای آموزشی برای مؤسسه حفظ می‌شود.</p>
            <p>قیمت‌گذاری و ارزیابی هر دوره با مؤسسه است.</p>
            <p>پشتیبانی و مشاوره آموزشی توسط مؤسسه ارائه می‌شود.</p>
          </aside>
          <div className="dena-institute-cta__copy">
            <span className="eyebrow">برای مؤسسات آموزشی</span>
            <h2>به اکوسیستم آموزشی دنا بپیوندید</h2>
            <p>دوره‌های آفلاین خود را با هویت مؤسسه منتشر کنید؛ قیمت‌گذاری، ارزیابی و همراهی آموزشی را مدیریت کنید و مسیر رشد دانش‌آموزان را در یک بستر یکپارچه دنبال کنید.</p>
            <div className="dena-institute-cta__actions">
              <Link className="dena-button dena-button--purple-outline" href="/institutes/collaboration">آشنایی با همکاری</Link>
              <Link className="dena-button dena-button--primary" href="/institutes/request">ثبت‌نام مؤسسه</Link>
            </div>
          </div>
        </div>
      </section>

      <DenaSiteFooter />
    </main>
  );
}
