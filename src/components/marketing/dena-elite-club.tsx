import Image from "next/image";
import Link from "next/link";
import { DenaPublicLayout } from "./dena-site-shell";
import "./dena-elite-club.css";

const pillars = [
  {
    title: "نگاه نوآفرینانه",
    description: "توجه به ایده‌ها و فرصت‌های تازه برای نوآفرینی، در ادامه مسیر رشد دانش‌آموز.",
    marker: "violet",
  },
  {
    title: "ارتباط و هم‌افزایی",
    description: "پیوند میان دانش‌آموزان و بخش‌های اکوسیستم با تمرکز بر یادگیری و رشد جمعی.",
    marker: "mint",
  },
  {
    title: "رشد استعدادها",
    description: "توجه به علایق و توانایی‌های دانش‌آموز در کنار مسیر یادگیری او در دنا.",
    marker: "violet",
  },
] as const;

const ecosystemRoles = [
  {
    title: "دانش‌آموز",
    description: "محور یادگیری و رشد فردی در دنا",
  },
  {
    title: "مؤسسات و ارائه‌دهندگان",
    description: "مسئول محتوای آموزشی، ارزیابی و همراهی تحصیلی دوره‌های خود",
  },
  {
    title: "باشگاه نخبگان دنا",
    description: "بخشی از اکوسیستم با تمرکز بر رشد استعدادها، ارتباط و نوآفرینی",
  },
] as const;

export function DenaEliteClubPage() {
  return (
    <DenaPublicLayout>
      <div className="dena-elite-club" data-testid="dena-elite-club" data-figma-node="145:94">
        <section className="dena-elite-club__hero" aria-labelledby="dena-elite-club-title">
          <div className="dena-elite-club__hero-inner">
            <div className="dena-elite-club__art" aria-hidden="true">
              <Image
                src="/figma/dena-home/elite-network.svg"
                alt=""
                width={580}
                height={480}
                priority
                unoptimized
              />
            </div>
            <div className="dena-elite-club__hero-copy">
              <div className="dena-elite-club__titles">
                <span className="dena-elite-club__eyebrow">باشگاه نخبگان دنا</span>
                <h1 id="dena-elite-club-title">استعدادها در کنار هم شکوفا می‌شوند</h1>
              </div>
              <p className="dena-elite-club__hero-description">
                باشگاه نخبگان دنا، بخشی از اکوسیستم دنا با تمرکز بر رشد استعدادها، ارتباط دانش‌آموزان و شکل‌گیری فرصت‌های تازه برای نوآفرینی و پیشرفت است.
              </p>
              <Link className="dena-elite-club__button dena-elite-club__button--primary" href="/growth">
                مسیر رشد دنا
              </Link>
            </div>
          </div>
        </section>

        <section className="dena-elite-club__pillars" aria-labelledby="dena-elite-club-pillars-title">
          <div className="dena-elite-club__container">
            <h2 id="dena-elite-club-pillars-title">باشگاه نخبگان دنا؛ رشد از اتصال</h2>
            <div className="dena-elite-club__pillar-grid">
              {pillars.map((pillar) => (
                <article className="dena-elite-club__pillar" key={pillar.title}>
                  <div className="dena-elite-club__pillar-title">
                    <h3>{pillar.title}</h3>
                    <span className={"dena-elite-club__marker dena-elite-club__marker--" + pillar.marker} aria-hidden="true" />
                  </div>
                  <p>{pillar.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="dena-elite-club__ecosystem" aria-labelledby="dena-elite-club-ecosystem-title">
          <div className="dena-elite-club__ecosystem-inner">
            <article className="dena-elite-club__roles-card">
              <h2>یک اکوسیستم؛ نقش‌های روشن</h2>
              <div className="dena-elite-club__roles-list">
                {ecosystemRoles.map((role) => (
                  <div className="dena-elite-club__role" key={role.title}>
                    <h3>{role.title}</h3>
                    <p>{role.description}</p>
                  </div>
                ))}
              </div>
            </article>

            <div className="dena-elite-club__positioning">
              <p className="dena-elite-club__positioning-eyebrow">جایگاه باشگاه در دنا</p>
              <h2 id="dena-elite-club-ecosystem-title">استعداد و یادگیری، در یک مسیر به‌هم‌پیوسته</h2>
              <p className="dena-elite-club__positioning-description">
                باشگاه نخبگان نه مؤسسه آموزشی مستقل است و نه جایگزین دوره‌ها یا همراهی آموزشی مؤسسات؛ بخشی از اکوسیستم دناست که به استعدادها، ارتباط و نوآفرینی توجه دارد.
              </p>
              <p className="dena-elite-club__membership-note">
                این صفحه معرفی اولیه باشگاه است؛ اطلاعات عضویت و برنامه‌های آن پس از نهایی‌شدن اعلام می‌شود.
              </p>
            </div>
          </div>
        </section>

        <section className="dena-elite-club__cta" aria-labelledby="dena-elite-club-cta-title">
          <div className="dena-elite-club__cta-copy">
            <h2 id="dena-elite-club-cta-title">رشد در کنار هم، در اکوسیستم دنا</h2>
            <p>باشگاه نخبگان بخشی از اکوسیستم دناست؛ مسیرهای یادگیری و رشد را در دنا ببین.</p>
          </div>
          <div className="dena-elite-club__cta-actions">
            <Link className="dena-elite-club__growth-link" href="/growth">مسیر رشد دنا</Link>
            <Link className="dena-elite-club__button dena-elite-club__button--primary" href="/courses">مشاهده دوره‌ها</Link>
          </div>
        </section>
      </div>
    </DenaPublicLayout>
  );
}
