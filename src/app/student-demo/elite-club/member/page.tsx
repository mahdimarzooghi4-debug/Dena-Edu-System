import Image from "next/image";
import Link from "next/link";
import { StudentShell } from "@/components/student/student-shell";

export const dynamic = "force-dynamic";

const supportCards = [
  {
    slug: "education",
    title: "حمایت آموزشی",
    descriptionMobile: "فرصت‌ها و حمایت‌های مرتبط با مسیر یادگیری و آموزش.",
    descriptionDesktop: "آموزش‌ها و فرصت‌های غیردرسی برای رشد و توسعه اعضای باشگاه.",
    icon: "/icons/elite-club/book-open.svg",
    action: "مشاهده حمایت‌ها",
    active: true,
    order: "order-1 md:order-2",
  },
  {
    slug: "teaching",
    title: "حمایت تدریس",
    descriptionMobile: "فرصت‌های فعالیت اعضای باشگاه به‌عنوان پشتیبان تحصیلی در آموزشگاه‌ها.",
    descriptionDesktop: "فرصت‌های فعالیت اعضای باشگاه به‌عنوان پشتیبان تحصیلی در آموزشگاه‌ها.",
    icon: "/icons/elite-club/presentation.svg",
    action: "مشاهده فرصت‌ها",
    active: true,
    order: "order-2 md:order-1",
  },
  {
    slug: "welfare",
    title: "حمایت رفاهی",
    descriptionMobile: "حمایت‌ها و خدمات رفاهی تعریف‌شده برای اعضای باشگاه.",
    descriptionDesktop: "حمایت‌ها و خدمات رفاهی تعریف‌شده برای اعضای باشگاه.",
    icon: "/icons/elite-club/heart.svg",
    action: "مشاهده حمایت‌ها",
    active: true,
    order: "order-3 md:order-4",
  },
  {
    slug: "business",
    title: "حمایت کسب‌وکار",
    descriptionMobile: "فرصت‌ها و حمایت‌های مرتبط با مسیرهای کسب‌وکار اعضای باشگاه.",
    descriptionDesktop: "فرصت‌ها و حمایت‌های مرتبط با مسیرهای کسب‌وکار اعضای باشگاه.",
    icon: "/icons/elite-club/briefcase.svg",
    action: "مشاهده حمایت‌ها",
    active: false,
    order: "order-4 md:order-3",
  },
] as const;

export default function EliteClubMemberPreviewPage() {
  return (
    <StudentShell active="elite" title="باشگاه نخبگان" demo>
      <section
        dir="rtl"
        className="w-full space-y-4 bg-[#f7f6fb] p-4"
        aria-labelledby="elite-club-title"
      >
        <header className="space-y-1">
          <h2 id="elite-club-title" className="text-xl font-bold leading-normal text-[#2b2544]">
            باشگاه نخبگان
          </h2>
          <p className="text-[13px] leading-5 text-[#756f83]">
            فضایی ویژه برای فرصت‌ها و مسیرهای رشد بیشتر در دنا.
          </p>
        </header>

        <section
          className="space-y-3 rounded-2xl border border-[#e5e1ed] bg-white p-4"
          aria-labelledby="membership-status-title"
        >
          <div className="flex flex-row-reverse items-center justify-between gap-3">
            <span className="rounded-full bg-[#eaf9f5] px-3 py-1 text-[11px] font-bold text-[#42cfa7]">
              عضو باشگاه
            </span>
            <h3 id="membership-status-title" className="text-[15px] font-bold leading-6 text-[#2b2544]">
              وضعیت من در باشگاه
            </h3>
          </div>
          <p className="text-right text-[13px] leading-5 text-[#756f83]">
            شما عضو باشگاه نخبگان دنا هستید.
          </p>
        </section>

        <section className="space-y-3" aria-labelledby="club-supports-title">
          <h3 id="club-supports-title" className="text-lg font-bold leading-7 text-[#2b2544]">
            حمایت‌های باشگاه
          </h3>
          <div dir="ltr" className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-5">
            {supportCards.map((card) => (
              <article
                key={card.slug}
                dir="rtl" className={`flex flex-col gap-3 rounded-xl border border-[#e5e1ed] bg-white p-4 md:min-h-[200px] ${card.order}`}
              >
                <header className="flex flex-row-reverse items-center justify-between">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-[#f7f6fb]">
                    <Image src={card.icon} width={20} height={20} alt="" />
                  </div>
                  <h4 className="text-right text-base font-bold leading-6 text-[#2b2544]">
                    {card.title}
                  </h4>
                </header>
                <p className="text-right text-[13px] leading-5 text-[#756f83]">
                  <span className="md:hidden">{card.descriptionMobile}</span>
                  <span className="hidden md:inline">{card.descriptionDesktop}</span>
                </p>
                <div className="flex flex-row-reverse items-center gap-2">
                  {card.active ? (
                    <>
                      <span aria-hidden="true" className="size-2 rounded-full bg-[#42cfa7]" />
                      <span className="text-xs font-semibold text-[#027a48]">فعال</span>
                    </>
                  ) : (
                    <span className="text-xs font-semibold text-[#756f83]">بدون فرصت فعال</span>
                  )}
                </div>
                <div className="flex justify-start">
                  <Link
                    href={`/student-demo/elite-club/${card.slug}`}
                    className="text-[13px] font-semibold text-[#5b4ce2]"
                  >
                    {card.action}
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>
      </section>
    </StudentShell>
  );
}
