import Link from "next/link";
import { DenaPublicLayout, DenaRoleIcon } from "./dena-site-shell";
import { DenaInstituteRequestPreviewForm } from "./dena-institute-request-preview-form";
import "./dena-website-pages.css";

const ecosystemRoles = [
  { title: "سازمان‌ها و حامیان", text: "تسهیل دسترسی به فرصت‌های برابر رشد برای همه فرزندان ایران", icon: "organization", tone: "mint" },
  { title: "ارائه‌دهنده تحت نظارت", text: "فعالیت آموزشی تحت نظارت یک مؤسسه آموزشی دارای مجوز", icon: "provider", tone: "orange" },
  { title: "مؤسسه آموزشی دارای مجوز", text: "ارائه‌دهنده رسمی دوره‌ها و مسئول مستقیم پشتیبانی و مشاوره", icon: "institute", tone: "blue" },
  { title: "دانش‌آموز", text: "محور اصلی یادگیری و ترسیم‌کننده مسیر رشد فردی", icon: "student", tone: "violet" },
] as const;

const collaborationPrinciples = [
  { title: "همراهی و مسیر رشد", text: "مؤسسه همراهی تحصیلی را انجام می‌دهد و دنا روند یادگیری را در بستر یکپارچه نمایش می‌دهد.", tone: "mint" },
  { title: "قیمت، تمرین و ارزیابی", text: "قیمت‌گذاری، تمرین‌ها و آزمون‌های دوره بر عهده مؤسسه یا ارائه‌دهنده مربوط است.", tone: "violet" },
  { title: "هویت و مالکیت محتوا", text: "دوره‌های ضبط‌شده با هویت مؤسسه منتشر می‌شوند و حقوق محتوا نزد صاحب آن می‌ماند.", tone: "blue" },
] as const;

const collaborationRoles = [
  { title: "دانش‌آموز", text: "دسترسی به دوره آفلاین، تمرین، آزمون و روند رشد" },
  { title: "مؤسسه آموزشی دارای مجوز", text: "مسئول محتوا، قیمت، ارزیابی و همراهی آموزشی دوره‌های خود" },
  { title: "دنا", text: "بستر انتشار و دسترسی، پیگیری یادگیری و پشتیبانی فنی" },
] as const;

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="dena-next__eyebrow">{children}</p>;
}

function NetworkArtwork() {
  return (
    <div className="dena-next__network" aria-hidden="true">
      <i className="dena-next__network-line dena-next__network-line--one" />
      <i className="dena-next__network-line dena-next__network-line--two" />
      <i className="dena-next__network-line dena-next__network-line--three" />
      <i className="dena-next__network-line dena-next__network-line--four" />
      {["a", "b", "c", "d", "e", "f", "g", "h", "i"].map((node) => <i key={node} className={`dena-next__network-node dena-next__network-node--${node}`} />)}
    </div>
  );
}

function PrimaryLink({ href, children }: { href: string; children: React.ReactNode }) {
  return <Link className="dena-next__button dena-next__button--primary" href={href}>{children}</Link>;
}

export function DenaAboutWebsitePage() {
  return (
    <DenaPublicLayout>
      <div className="dena-next dena-next--about" data-figma-node="147:464">
        <section className="dena-next__about-hero">
          <NetworkArtwork />
          <div className="dena-next__about-copy">
            <Eyebrow>درباره دنا</Eyebrow>
            <h1>یک اکوسیستم برای رشد از اتصال</h1>
            <p>دنا مدرسه یا مؤسسه آموزشی نیست؛ بستری یکپارچه برای اتصال دانش‌آموز به دوره‌های آفلاین، تمرین، آزمون و مشاهده مسیر رشد تحصیلی است.</p>
            <PrimaryLink href="/growth">مسیر رشد دنا</PrimaryLink>
          </div>
        </section>

        <section className="dena-next__ecosystem" aria-labelledby="ecosystem-title">
          <div className="dena-next__section-intro">
            <h2 id="ecosystem-title">وقتی یکی رشد می‌کند، همه جلو می‌روند</h2>
            <p>دنا یک بازارگاه جدا از فرایند یادگیری نیست؛ بلکه بستری یکپارچه برای اتصال دانش‌آموز، مؤسسات آموزشی، ارائه‌دهندگان و حامیان است. مسئولیت آموزش، ارزیابی و همراهی تحصیلی با مؤسسه یا ارائه‌دهنده مربوط است و دنا بستر اتصال و پیگیری مسیر یادگیری را فراهم می‌کند.</p>
          </div>
          <div className="dena-next__role-grid">
            {ecosystemRoles.map((role) => (
              <article className={`dena-next__role dena-next__role--${role.tone}`} key={role.title}>
                <span className="dena-next__role-icon"><DenaRoleIcon kind={role.icon} /></span>
                <h3>{role.title}</h3>
                <p>{role.text}</p>
              </article>
            ))}
          </div>
          <p className="dena-next__club-note">باشگاه نخبگان دنا نیز بخشی از این اکوسیستم است — با تمرکز بر رشد استعدادها و ایجاد فرصت‌های نوآفرینی.</p>
          <article className="dena-next__dena-node"><span aria-hidden="true">د</span><h3>دنا</h3><p>بستر اتصال و هماهنگی</p></article>
        </section>

        <section className="dena-next__connection" aria-labelledby="connection-title">
          <div className="dena-next__section-intro">
            <h2 id="connection-title">دنا چگونه یادگیری را به هم پیوند می‌دهد؟</h2>
          </div>
          <div className="dena-next__connection-grid">
            <article><span className="dena-next__bullet dena-next__bullet--mint" /><div><h3>نمایش مسیر رشد</h3><p>پیشرفت جلسات، نتایج آزمون‌ها و عملکرد درسی در طول زمان کنار هم نمایش داده می‌شوند.</p></div></article>
            <article><span className="dena-next__bullet dena-next__bullet--violet" /><div><h3>تمرین و ارزیابی</h3><p>تمرین‌ها و آزمون‌های هر دوره به فرایند یادگیری متصل‌اند؛ مسئولیت آموزشی با ارائه‌دهنده مربوط است.</p></div></article>
            <article><span className="dena-next__bullet dena-next__bullet--blue" /><div><h3>دسترسی یکپارچه</h3><p>دوره‌های ضبط‌شده مؤسسات و ارائه‌دهندگان تحت نظارت در یک بستر قابل بررسی و پیگیری‌اند.</p></div></article>
          </div>
        </section>

        <section className="dena-next__cta">
          <h2>در دنا، آموزش تنها نیست؛ رشد همراه است</h2>
          <p>دوره‌ها، آزمون‌ها، مسیر رشد و باشگاه نخبگان را در یک اکوسیستم پیوسته بشناس.</p>
          <div className="dena-next__cta-actions"><Link href="/elite-club">باشگاه نخبگان</Link><PrimaryLink href="/courses">مشاهده دوره‌ها</PrimaryLink></div>
        </section>
      </div>
    </DenaPublicLayout>
  );
}

export function DenaInstituteCollaborationWebsitePage() {
  return (
    <DenaPublicLayout>
      <div className="dena-next dena-next--collaboration" data-figma-node="147:681">
        <section className="dena-next__collaboration-hero">
          <div className="dena-next__benefits">
            <h2>در همکاری با دنا</h2>
            <p><span className="dena-next__bullet dena-next__bullet--mint" />مالکیت محتوای آموزشی برای مؤسسه حفظ می‌شود.</p>
            <p><span className="dena-next__bullet dena-next__bullet--violet" />قیمت‌گذاری و ارزیابی هر دوره با مؤسسه است.</p>
            <p><span className="dena-next__bullet dena-next__bullet--blue" />پشتیبانی و مشاوره آموزشی توسط مؤسسه ارائه می‌شود.</p>
          </div>
          <div className="dena-next__collaboration-copy">
            <Eyebrow>برای مؤسسات آموزشی</Eyebrow>
            <h1>مؤسسه آموزشی هستید؟ به اکوسیستم دنا بپیوندید</h1>
            <p>دوره‌های آفلاین خود را با هویت مؤسسه منتشر کنید؛ قیمت‌گذاری، ارزیابی و همراهی آموزشی را مدیریت کنید و مسیر رشد دانش‌آموزان را در یک بستر یکپارچه دنبال کنید.</p>
            <div className="dena-next__actions"><Link className="dena-next__button dena-next__button--outline" href="/about">آشنایی با همکاری</Link><PrimaryLink href="/institutes/request">ثبت‌نام مؤسسه</PrimaryLink></div>
          </div>
        </section>

        <section className="dena-next__collaboration-principles" aria-labelledby="collaboration-title">
          <h2 id="collaboration-title">همکاری با دنا؛ نقش‌های روشن</h2>
          <div className="dena-next__principle-grid">
            {collaborationPrinciples.map((principle) => <article key={principle.title}><span className={`dena-next__bullet dena-next__bullet--${principle.tone}`} /><div><h3>{principle.title}</h3><p>{principle.text}</p></div></article>)}
          </div>
        </section>

        <section className="dena-next__oversight">
          <article className="dena-next__collaboration-roles">
            <h2>نقش‌ها در همکاری آموزشی</h2>
            {collaborationRoles.map((role) => <div key={role.title}><h3>{role.title}</h3><p>{role.text}</p></div>)}
          </article>
          <div className="dena-next__oversight-copy">
            <Eyebrow>ارائه‌دهنده تحت نظارت</Eyebrow>
            <h2>نظارت آموزشی با مؤسسه دارای مجوز است</h2>
            <p>اگر دوره توسط ارائه‌دهنده تحت نظارت منتشر می‌شود، نام مؤسسه آموزشی دارای مجوز ناظر مشخص است. دنا جایگزین مسئولیت آموزشی و نظارتی مؤسسه نمی‌شود.</p>
            <p className="dena-next__muted-note">شرایط اجرایی همکاری در فرایند بررسی و توافق با مؤسسه مشخص می‌شوند.</p>
          </div>
        </section>

        <section className="dena-next__cta">
          <h2>مؤسسه آموزشی هستید؟ با دنا همراه شوید</h2>
          <p>دوره‌های آفلاین خود را با هویت مؤسسه، ارزیابی و همراهی آموزشی در یک بستر یکپارچه ارائه کنید.</p>
          <div className="dena-next__cta-actions"><Link href="/about">درباره دنا</Link><PrimaryLink href="/institutes/request">ثبت‌نام مؤسسه</PrimaryLink></div>
        </section>
      </div>
    </DenaPublicLayout>
  );
}

export function DenaInstituteRequestWebsitePage() {
  return (
    <DenaPublicLayout>
      <div className="dena-next dena-next--request" data-figma-node="149:229">
        <section className="dena-next__request-intro">
          <Eyebrow>همکاری با دنا / درخواست اولیه</Eyebrow>
          <h1>درخواست همکاری مؤسسهٔ آموزشی</h1>
          <p>اطلاعات اولیه مؤسسه و راه ارتباطی نماینده آن را ثبت کنید تا امکان بررسی همکاری آموزشی با دنا فراهم شود. ارسال درخواست به معنای تأیید همکاری یا ایجاد حساب مؤسسه نیست.</p>
        </section>
        <section className="dena-next__request-layout">
          <DenaInstituteRequestPreviewForm />
          <aside className="dena-next__request-guidance">
            <h2>پیش از ارسال درخواست</h2>
            <p>برای بررسی اولیه همکاری، فقط اطلاعات شناسایی مؤسسه و راه تماس نماینده را وارد کنید.</p>
            <div>
              <h3>پس از ارسال درخواست</h3>
              <ol><li>اطلاعات اولیه مؤسسه بررسی می‌شود.</li><li>در صورت نیاز، برای تکمیل اطلاعات تماس گرفته می‌شود.</li><li>شرایط همکاری در ادامه بررسی و توافق مشخص می‌شود.</li></ol>
            </div>
            <p className="dena-next__muted-note">دنا بستر فنی و نمایش مسیر رشد را فراهم می‌کند؛ مسئولیت محتوای آموزشی، ارزیابی و همراهی تحصیلی با مؤسسه یا ارائه‌دهنده مربوط است.</p>
          </aside>
        </section>
      </div>
    </DenaPublicLayout>
  );
}

export function DenaInstituteConfirmationWebsitePage() {
  return (
    <DenaPublicLayout>
      <div className="dena-next dena-next--confirmation" data-figma-node="149:370">
        <span className="dena-next__success-icon" aria-hidden="true">✓</span>
        <Eyebrow>حالت طراحی / پس از ارسال موفق</Eyebrow>
        <h1>درخواست اولیه شما ثبت شد</h1>
        <p>اطلاعات مؤسسه برای بررسی اولیه دریافت می‌شود. در صورت نیاز، از طریق راه ارتباطی درج‌شده با نماینده مؤسسه تماس گرفته خواهد شد.</p>
        <p className="dena-next__muted-note">ثبت درخواست به معنای تأیید همکاری یا ایجاد حساب مؤسسه نیست. این فریم تنها حالت طراحی است و به ارسال واقعی داده متصل نیست.</p>
        <Link className="dena-next__button dena-next__button--outline" href="/institutes/collaboration">بازگشت به همکاری با دنا</Link>
      </div>
    </DenaPublicLayout>
  );
}
