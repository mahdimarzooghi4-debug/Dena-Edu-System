import Image from "next/image";
import Link from "next/link";
import { DenaPublicLayout } from "./dena-site-shell";
import "./dena-growth-path.css";

const growthSignals = [
  {
    title: "روند عملکرد درسی",
    description: "روند بهبود یا کاهش عملکرد هر درس قابل مشاهده می‌شود تا دانش‌آموز تغییرات را ببیند.",
    marker: "negative",
  },
  {
    title: "تمرین و آزمون",
    description: "نتایج تمرین‌ها و ارزیابی‌های مرتبط با دوره در طول زمان ثبت و نمایش داده می‌شوند.",
    marker: "positive",
  },
  {
    title: "پیشرفت دوره",
    description: "جلسات ضبط‌شده تکمیل‌شده و میزان پیشروی در هر دوره، بخشی از مسیر یادگیری هستند.",
    marker: "negative",
  },
] as const;

const roles = [
  {
    title: "دانش‌آموز",
    description: "مشاهده پیشرفت و روند عملکرد خود در طول یادگیری",
  },
  {
    title: "مؤسسه یا ارائه‌دهنده",
    description: "ارزیابی، همراهی تحصیلی و تعیین قدم بعدی مسیر یادگیری",
  },
  {
    title: "دنا",
    description: "نمایش روند یادگیری و فراهم‌کردن بستر فنی پیگیری مسیر",
  },
] as const;

function GrowthChart() {
  const points = [
    { left: 2, top: 135 },
    { left: 98, top: 118 },
    { left: 190, top: 96 },
    { left: 282, top: 76 },
    { left: 386, top: 56 },
    { left: 500, top: 40 },
  ];

  return (
    <section className="growth-path__chart-card" aria-labelledby="growth-path-chart-title">
      <div className="growth-path__chart-header">
        <span className="growth-path__badge">مسیر رشد من</span>
        <h3 id="growth-path-chart-title">روند عملکرد ۶ ماه اخیر</h3>
        <p>رشد طولی در ۶ ماه اخیر</p>
      </div>
      <div className="growth-path__chart-area" role="img" aria-label="نمودار نمونهٔ رشد از ۵۰ تا ۹۰ درصد در شش ماه">
        <div className="growth-path__plot-scroll">
          <div className="growth-path__plot">
            {[0, 45, 90, 135, 179].map((top) => (
              <span className="growth-path__gridline" style={{ top }} key={top} />
            ))}
            <Image src="/figma/growth-path/chart-line.svg" alt="" width={512} height={180} unoptimized />
            {points.map((point, index) => (
              <Image
                className="growth-path__point"
                key={`${point.left}-${point.top}`}
                src="/figma/growth-path/chart-point.svg"
                alt=""
                width={10}
                height={10}
                unoptimized
                style={{ left: point.left, top: point.top }}
                priority={index === points.length - 1}
              />
            ))}
          </div>
        </div>
        <div className="growth-path__y-axis" aria-hidden="true">
          {["۹۰٪", "۸۰٪", "۷۰٪", "۶۰٪", "۵۰٪"].map((label) => <span key={label}>{label}</span>)}
        </div>
      </div>
      <div className="growth-path__x-axis" aria-hidden="true">
        {["آبان", "آذر", "دی", "بهمن", "اسفند", "فروردین"].map((month) => <span key={month}>{month}</span>)}
      </div>
    </section>
  );
}

function TrendCard({
  subject,
  value,
  note,
  tone,
}: {
  subject: string;
  value: string;
  note: string;
  tone: "mint" | "muted" | "violet";
}) {
  return (
    <article className="growth-path__trend-card">
      <strong className={`growth-path__trend-value growth-path__trend-value--${tone}`}>{value}</strong>
      <span className="growth-path__trend-note">{note}</span>
      <div className="growth-path__subject">
        <strong>{subject}</strong>
        <span className={`growth-path__subject-marker growth-path__subject-marker--${tone}`} aria-hidden="true" />
      </div>
    </article>
  );
}

export function DenaGrowthPathPage() {
  return (
    <DenaPublicLayout>
      <div className="dena-growth-path" data-testid="dena-growth-path" data-figma-node="147:121">
        <section className="growth-path__intro" aria-labelledby="growth-path-title">
          <div className="growth-path__intro-inner">
            <span className="growth-path__eyebrow">مسیر رشد دنا</span>
            <h1 id="growth-path-title">روند یادگیری‌ات را در طول زمان ببین</h1>
            <p>
              پیشرفت جلسات آموزشی، تمرین‌ها، نتایج آزمون‌ها و عملکرد درسی در کنار هم نمایش داده می‌شوند تا مسیر رشد یا افت یادگیری روشن‌تر شود.
            </p>
          </div>
        </section>

        <section className="growth-path__sample" aria-labelledby="growth-path-sample-title">
          <div className="growth-path__sample-intro">
            <span className="growth-path__badge">نمونهٔ نمایشی</span>
            <h2 id="growth-path-sample-title">رشدت را فقط حس نکن؛ ببین</h2>
            <p>
              در دنا، پیشرفت دوره، نتایج آزمون‌ها، تمرین‌ها و عملکرد درسی در طول زمان کنار هم قرار می‌گیرند تا دانش‌آموز بتواند روند رشد یا افت خود را ببیند و برای قدم بعدی مسیر یادگیری آماده شود.
            </p>
            <div className="growth-path__observations">
              <p><strong>روند کلی شما رو به رشد است</strong><Image src="/figma/growth-path/trend-positive.svg" alt="" width={8} height={8} unoptimized /></p>
              <p><span>کاهش موقت عملکرد در درس فیزیک؛ نیاز به مرور در قدم بعدی مسیر یادگیری</span><Image src="/figma/growth-path/trend-negative.svg" alt="" width={8} height={8} unoptimized /></p>
            </div>
          </div>

          <div className="growth-path__visualization">
            <GrowthChart />
            <div className="growth-path__insights">
              <div className="growth-path__trends">
                <TrendCard subject="ریاضی دهم" value="+۱۲٪" note="رشد محسوس" tone="mint" />
                <TrendCard subject="فیزیک دهم" value="-۴٪" note="افت موقت در این درس" tone="muted" />
                <TrendCard subject="شیمی دهم" value="+۱٪" note="ثبات تحصیلی" tone="violet" />
              </div>
              <div className="growth-path__milestone">
                <strong>قدم بعدی در مسیر یادگیری</strong>
                <Image src="/figma/growth-path/check-circle.svg" alt="" width={20} height={20} unoptimized />
              </div>
              <div className="growth-path__action">
                <strong>برای مرور حرکت یکنواخت، محتوای دوره ارائه‌دهنده مربوط در دسترس است.</strong>
                <p>ادامه این مسیر در همان دوره انجام می‌شود.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="growth-path__signals" aria-labelledby="growth-path-signals-title">
          <div className="growth-path__signals-inner">
            <h2 id="growth-path-signals-title">مسیر رشد از چه داده‌هایی ساخته می‌شود؟</h2>
            <div className="growth-path__signal-grid">
              {growthSignals.map((signal) => (
                <article className="growth-path__signal-card" key={signal.title}>
                  <div className="growth-path__signal-title">
                    <h3>{signal.title}</h3>
                    <Image src={`/figma/growth-path/trend-${signal.marker}.svg`} alt="" width={8} height={8} unoptimized />
                  </div>
                  <p>{signal.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="growth-path__responsibility" aria-labelledby="growth-path-responsibility-title">
          <article className="growth-path__roles-card">
            <h2>مسئولیت‌ها در مسیر رشد</h2>
            <div className="growth-path__roles-list">
              {roles.map((role) => (
                <div className="growth-path__role" key={role.title}>
                  <h3>{role.title}</h3>
                  <p>{role.description}</p>
                </div>
              ))}
            </div>
          </article>
          <div className="growth-path__responsibility-copy">
            <p className="growth-path__responsibility-eyebrow">شفافیت نقش‌ها در دنا</p>
            <h2 id="growth-path-responsibility-title">قدم بعدی مسیر را چه کسی مشخص می‌کند؟</h2>
            <p>
              دنا روند پیشرفت، تمرین‌ها، آزمون‌ها و عملکرد درسی را نمایش می‌دهد؛ برنامه آموزشی و همراهی تحصیلی بر عهده مؤسسه یا ارائه‌دهنده مربوط است.
            </p>
            <p className="growth-path__disclaimer">نمودار و درصدهای این صفحه نمونهٔ نمایشی‌اند و داده واقعی دانش‌آموز محسوب نمی‌شوند.</p>
          </div>
        </section>

        <section className="growth-path__cta" aria-labelledby="growth-path-cta-title">
          <div className="growth-path__cta-copy">
            <h2 id="growth-path-cta-title">یادگیری‌ات را در دنا ادامه بده</h2>
            <p>دوره‌های آفلاین را بررسی کن و با تمرین و آزمون، مسیر رشد تحصیلی خود را دنبال کن.</p>
          </div>
          <div className="growth-path__cta-actions">
            <Link className="growth-path__exam-link" href="/assessments">مشاهده آزمون‌ها</Link>
            <Link className="growth-path__button" href="/courses">مشاهده دوره‌ها</Link>
          </div>
        </section>
      </div>
    </DenaPublicLayout>
  );
}
