import Link from "next/link";
import { StudentShell } from "@/components/student/student-shell";

export const dynamic = "force-dynamic";

const workshops = [
  {
    slug: "communication-skills",
    title: "کارگاه مهارت‌های ارتباطی",
    domain: "توسعه فردی",
    status: "فعال",
    available: true,
  },
  {
    slug: "creative-thinking",
    title: "دوره تفکر خلاق و حل مسئله",
    domain: "مهارت‌های نرم",
    status: "به‌زودی",
    available: false,
  },
] as const;

export default function StudentEducationalSupportPage() {
  return (
    <StudentShell active="elite" title="باشگاه نخبگان" demo>
      <div dir="rtl" className="space-y-6 lg:space-y-7">
        <nav aria-label="مسیر صفحه" className="hidden items-center gap-2 text-sm lg:flex">
          <span className="font-medium text-[#5b4ce2]">حمایت آموزشی</span>
          <span aria-hidden="true" className="text-[#9ca3af]">←</span>
          <Link href="/student-demo/elite-club/member" className="text-[#6b7280] hover:text-[#5b4ce2]">باشگاه نخبگان</Link>
        </nav>

        <header className="space-y-2 text-right">
          <h2 className="text-xl font-bold leading-normal text-[#2b2544] lg:text-[28px] lg:text-[#111827]">حمایت آموزشی</h2>
          <p className="text-[13px] leading-5 text-[#756f83] lg:text-base lg:text-[#6b7280]">
            آموزش‌ها و فرصت‌های غیردرسی برای رشد و توسعه اعضای باشگاه.
          </p>
          <p className="text-[11px] leading-4 text-[#5b4ce2] lg:hidden">
            این آموزش‌ها مستقل از دوره‌های درسی دانش‌آموز هستند.
          </p>
        </header>

        <ul className="space-y-3 lg:space-y-4">
          {workshops.map((workshop) => (
            <li key={workshop.slug}>
              <article dir="ltr" className="flex flex-col gap-3 rounded-2xl border border-[#e5e1ed] bg-white p-4 lg:min-h-[110px] lg:flex-row lg:items-center lg:justify-between lg:rounded-[20px] lg:p-6">
                <div dir="ltr" className="flex items-center justify-between gap-3 lg:justify-start lg:gap-5">
                  {workshop.available ? (
                    <Link
                      href={`/student-demo/elite-club/education/${workshop.slug}`}
                      className="text-[13px] font-semibold text-[#5b4ce2] hover:underline lg:text-sm"
                    >
                      <span className="lg:hidden">مشاهده جزئیات ←</span>
                      <span className="hidden lg:inline">مشاهده جزئیات</span>
                    </Link>
                  ) : (
                    <span className="text-[13px] font-semibold text-[#9ca3af] lg:text-sm">
                      <span className="lg:hidden">مشاهده جزئیات ←</span>
                      <span className="hidden lg:inline">مشاهده جزئیات</span>
                    </span>
                  )}
                  <span className={`rounded-full px-3 py-1 text-[11px] font-semibold lg:px-4 lg:py-1.5 lg:text-[13px] ${workshop.available ? "bg-[#e8f8f0] text-[#10b981]" : "bg-[#fffbeb] text-[#d97706]"}`}>
                    {workshop.status}
                  </span>
                </div>

                <div dir="rtl" className="space-y-1.5 text-right">
                  <h3 className="text-base font-bold leading-6 text-[#1f2937] lg:text-lg">
                    {workshop.title}
                  </h3>
                  <p className="text-xs leading-5 text-[#9ca3af] lg:text-sm">
                    <span className="text-[#4b5563]">{workshop.domain}</span>
                    <span> · حوزه:</span>
                  </p>
                </div>
              </article>
            </li>
          ))}
        </ul>

        <p className="text-center text-xs leading-5 text-[#9ca3af] lg:text-sm">
          آموزش‌های جدید باشگاه پس از انتشار در این بخش نمایش داده می‌شوند.
        </p>
      </div>
    </StudentShell>
  );
}
