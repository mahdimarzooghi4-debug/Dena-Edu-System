import Image from "next/image";
import Link from "next/link";
import { DenaPublicLayout } from "./dena-site-shell";
import "./dena-assessments.css";

const evaluationPrinciples = [
  {
    title: "روند عملکرد درسی",
    description: "نمایش تغییرات نتایج هر درس در کنار تمرین‌ها و پیشرفت دوره، مسیر رشد را روشن‌تر می‌کند.",
    marker: "purple",
  },
  {
    title: "ثبت نتایج ارزیابی",
    description: "نتایج آزمون‌ها و تمرین‌های دوره در طول مسیر یادگیری ثبت می‌شوند و قابل مشاهده‌اند.",
    marker: "green",
  },
  {
    title: "آزمون مرتبط با دوره",
    description: "ارزیابی به محتوای دوره و سرفصل‌های آموزشی مربوط متصل است؛ دنا برگزارکنندهٔ مستقل آموزش نیست.",
    marker: "purple",
  },
] as const;

const evaluationRoles = [
  { title: "دانش‌آموز", description: "انجام تمرین‌ها و آزمون‌های مرتبط با دوره" },
  { title: "مؤسسه یا ارائه‌دهنده", description: "طراحی، مدیریت و ارزیابی آزمون‌های آموزشی دوره" },
  { title: "دنا", description: "بستر دسترسی و نمایش نتایج در مسیر رشد" },
] as const;

function AssessmentCard() {
  return (
    <article className="dena-assessments__sample-card" data-node-id="147:450" aria-labelledby="assessment-sample-title">
      <p className="dena-assessments__sample-label">نمونه نمایشی آزمون</p>
      <h2 id="assessment-sample-title">سنجش مبحث حرکت یکنواخت</h2>
      <p className="dena-assessments__course-name">دوره مرتبط: فیزیک دهم (مکانیک)</p>
      <p>ارائه‌دهنده ارزیابی: [نام مؤسسه یا ارائه‌دهنده]</p>
      <p>شیوه دسترسی: از داخل دوره آموزشی</p>
      <p>نتایج ارزیابی در مسیر رشد قابل مشاهده می‌شوند.</p>
      <Link className="dena-assessments__secondary-button" href="/courses/physics-tenth">مشاهده دوره</Link>
    </article>
  );
}

export function DenaAssessmentsPage() {
  return (
    <DenaPublicLayout>
      <div className="dena-assessments" data-testid="dena-assessments" data-figma-node="147:323">
        <section className="dena-assessments__intro" aria-labelledby="dena-assessments-title" data-node-id="147:338">
          <div className="dena-assessments__intro-inner" data-node-id="147:339">
            <p className="dena-assessments__eyebrow">آزمون‌ها در دنا</p>
            <h1 id="dena-assessments-title">ارزیابی، پیوسته با مسیر یادگیری</h1>
            <p className="dena-assessments__intro-description">
              تمرین‌ها و آزمون‌های مرتبط با دوره توسط مؤسسه یا ارائه‌دهندهٔ مربوط مدیریت می‌شوند و نتایجشان در مسیر رشد دانش‌آموز نمایش داده می‌شود.
            </p>
          </div>
        </section>

        <section className="dena-assessments__course-row" aria-label="نمونه ارزیابی پیوسته با دوره" data-node-id="147:449">
          <AssessmentCard />
          <div className="dena-assessments__course-copy" data-node-id="147:451">
            <p className="dena-assessments__eyebrow">نمونه مسیر ارزیابی</p>
            <h2>آزمون‌ها، ادامه طبیعی یادگیری‌اند</h2>
            <p>
              در دنا، آزمون و تمرین به سرفصل‌های دوره متصل‌اند. مؤسسه یا ارائه‌دهندهٔ مربوط شیوه ارزیابی را مشخص می‌کند و نتیجه در مسیر رشد دانش‌آموز نمایش داده می‌شود.
            </p>
            <p className="dena-assessments__fine-print">
              این کارت فقط نمونه طراحی است؛ محتوای واقعی، شرایط و تعداد آزمون‌ها با مؤسسه یا ارائه‌دهندهٔ مربوط تعیین می‌شود.
            </p>
          </div>
        </section>

        <section className="dena-assessments__principles" aria-labelledby="assessment-principles-title" data-node-id="147:344">
          <div className="dena-assessments__principles-inner" data-node-id="147:345">
            <h2 id="assessment-principles-title">آزمون در دنا چه جایگاهی دارد؟</h2>
            <div className="dena-assessments__principles-grid" data-node-id="147:348">
              {evaluationPrinciples.map((principle) => (
                <article className="dena-assessments__principle" key={principle.title}>
                  <h3>
                    <Image
                      src={`/figma/assessments/dot-${principle.marker}.svg`}
                      alt=""
                      width={8}
                      height={8}
                      unoptimized
                    />
                    <span>{principle.title}</span>
                  </h3>
                  <p>{principle.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="dena-assessments__responsibility" aria-labelledby="assessment-responsibility-title" data-node-id="147:364">
          <article className="dena-assessments__roles-card" data-node-id="147:365">
            <h2 id="assessment-responsibility-title">مسئولیت ارزیابی با چه کسی است؟</h2>
            <div className="dena-assessments__roles-list">
              {evaluationRoles.map((role) => (
                <div className="dena-assessments__role" key={role.title}>
                  <h3>{role.title}</h3>
                  <p>{role.description}</p>
                </div>
              ))}
            </div>
          </article>
          <div className="dena-assessments__responsibility-copy" data-node-id="147:376">
            <p className="dena-assessments__eyebrow">شفافیت در ارزیابی</p>
            <h2>آزمون، بخشی از فرایند یادگیری است</h2>
            <p>
              مؤسسه یا ارائه‌دهندهٔ مربوط، سرفصل و شیوه ارزیابی را مشخص می‌کند. دنا دسترسی، نمایش نتایج و مشاهده روند عملکرد را در یک بستر یکپارچه فراهم می‌کند.
            </p>
            <p className="dena-assessments__fine-print">
              تعداد، زمان و شرایط هر آزمون، در صورت تعریف، به دوره آموزشی مربوط وابسته است.
            </p>
          </div>
        </section>

        <section className="dena-assessments__cta" aria-labelledby="assessment-cta-title" data-node-id="147:381">
          <div className="dena-assessments__cta-copy">
            <h2 id="assessment-cta-title">ارزیابی را در مسیر دوره دنبال کن</h2>
            <p>دوره‌های آموزشی را ببین و تمرین‌ها و آزمون‌های مرتبط با هر دوره را بررسی کن.</p>
          </div>
          <div className="dena-assessments__cta-actions">
            <Link className="dena-assessments__growth-link" href="/growth">مسیر رشد دنا</Link>
            <Link className="dena-assessments__primary-button" href="/courses">مشاهده دوره‌ها</Link>
          </div>
        </section>
      </div>
    </DenaPublicLayout>
  );
}
