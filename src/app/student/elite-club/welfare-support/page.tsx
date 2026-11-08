import Link from "next/link";
import { Card } from "@/components/ui/card";
import { StudentShell } from "@/components/student/student-shell";

export const dynamic = "force-dynamic";

const items = [
  {
    id: "sample-one",
    title: "خدمت رفاهی نمونه",
    status: "فعال",
    statusClass: "bg-[#e8f8f0] text-[#10b981]",
  },
  {
    id: "sample-two",
    title: "خدمت رفاهی نمونه ۲",
    status: "به‌زودی",
    statusClass: "bg-[#fffbeb] text-[#d97706]",
  },
] as const;

function Badges({ item, desktop = false }: { item: (typeof items)[number]; desktop?: boolean }) {
  return (
    <div dir="ltr" className={`flex shrink-0 items-center gap-1.5 ${desktop ? "lg:gap-2" : ""}`}>
      <span className={`inline-flex items-center rounded-full bg-[#ededf2] font-semibold text-[#737380] ${desktop ? "px-4 py-1.5 text-[13px] leading-5" : "px-3 py-1 text-[11px] leading-[17px]"}`}>
        نمونه نمایشی
      </span>
      <span className={`inline-flex items-center rounded-full font-semibold ${item.statusClass} ${desktop ? "px-4 py-1.5 text-[13px] leading-5" : "px-3 py-1 text-[11px] leading-[17px]"}`}>
        {item.status}
      </span>
    </div>
  );
}

function DetailLink({ item }: { item: (typeof items)[number] }) {
  if (item.status !== "فعال") {
    return <span className="text-[13px] font-semibold text-[#5b4ce2]">مشاهده جزئیات</span>;
  }

  return (
    <Link
      href={`/student/elite-club/welfare-support/${item.id}`}
      className="text-[13px] font-semibold text-[#5b4ce2] hover:underline"
    >
      مشاهده جزئیات
    </Link>
  );
}

function TypeLabel() {
  return (
    <div dir="rtl" className="flex shrink-0 items-center gap-1 text-[13px] leading-normal">
      <span className="text-[#9ca3af]">نوع:</span>
      <span className="text-[#4b5563]">(تعیین‌شده توسط سیستم)</span>
    </div>
  );
}

export default async function StudentWelfareSupportPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>;
}) {
  const params = await searchParams;
  const isEmptyState = params.state === "empty";

  return (
    <StudentShell active="elite" title="باشگاه نخبگان">
      <div
        dir="rtl"
        className="mt-6 flex min-h-[calc(100svh-198px)] flex-col gap-4 p-4 lg:mt-0 lg:min-h-0 lg:gap-6 lg:p-0"
      >
        <nav dir="ltr" aria-label="مسیر صفحه" className="flex h-5 shrink-0 items-center justify-end gap-2 whitespace-nowrap">
          <span dir="rtl" className="text-[13px] text-[#6b7280] lg:text-sm">حمایت رفاهی</span>
          <span aria-hidden="true" className="text-xs text-[#9ca3af]">←</span>
          <Link href="/student/elite-club" className="text-[13px] text-[#5b4ce2] hover:underline lg:text-sm">
            باشگاه نخبگان
          </Link>
        </nav>

        <header className="flex shrink-0 flex-col gap-1.5 text-right lg:gap-2">
          <h2 className="text-[22px] font-bold leading-[34px] text-[#111827] lg:text-[28px] lg:leading-[44px]">
            حمایت رفاهی
          </h2>
          <p className="text-sm leading-[22px] text-[#6b7280] lg:text-base lg:leading-[25px]">
            خدمات و حمایت‌های رفاهی تعریف‌شده برای اعضای باشگاه.
          </p>
        </header>

        {isEmptyState ? (
          <section aria-label="وضعیت حمایت رفاهی" className="mt-0 flex min-h-[500px] flex-1 items-center justify-center">
            <div className="flex h-[206px] w-full flex-col items-center gap-5 rounded-[20px] border border-[#e5e1ed] bg-white px-6 py-8 text-center shadow-[0px_4px_8px_rgba(0,0,0,0.03)] lg:max-w-[520px]">
              <div className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-[#f4f4f5]">
                <svg aria-hidden="true" viewBox="0 0 32 32" className="size-8 text-[#9ca3af]" fill="none">
                  <path d="M3.5 8.5h9l2.5 3h13.5v13a2 2 0 0 1-2 2h-21a2 2 0 0 1-2-2v-14a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                  <path d="M3 13h26" stroke="currentColor" strokeWidth="1.8" />
                </svg>
              </div>
              <div className="flex w-full flex-col items-center gap-2">
                <h3 className="w-full text-[18px] font-bold leading-normal text-[#1f2937]">
                  حمایتی تعریف نشده است
                </h3>
                <p className="w-full text-[13px] leading-[22px] text-[#6b7280]">
                  در حال حاضر حمایت رفاهی فعالی وجود ندارد.
                </p>
              </div>
            </div>
          </section>
        ) : (
          <>
            <ul className="flex min-h-0 flex-1 flex-col gap-3 lg:gap-4">
              {items.map((item) => (
                <li key={item.id} className="shrink-0">
                  <Card
                    aria-label={item.title}
                    className="h-[104px] rounded-[20px] border-[#e5e1ed] p-5 shadow-[0px_4px_8px_rgba(0,0,0,0.03)] lg:h-[110px] lg:p-6"
                  >
                    <div className="flex h-full flex-col gap-4 lg:hidden">
                      <div dir="ltr" className="flex h-7 items-center justify-between gap-2">
                        <Badges item={item} />
                        <h3 dir="rtl" className="truncate text-right text-[18px] font-bold leading-7 text-[#1f2937]">
                          {item.title}
                        </h3>
                      </div>
                      <div dir="ltr" className="flex h-5 items-center justify-between gap-2">
                        <DetailLink item={item} />
                        <TypeLabel />
                      </div>
                    </div>

                    <div className="hidden h-full w-full items-center justify-between lg:flex">
                      <div dir="ltr" className="flex items-center gap-5">
                        <DetailLink item={item} />
                        <Badges item={item} desktop />
                      </div>
                      <div className="w-[177px] space-y-1 text-right">
                        <h3 className="truncate text-[18px] font-bold leading-7 text-[#1f2937]">{item.title}</h3>
                        <TypeLabel />
                      </div>
                    </div>
                  </Card>
                </li>
              ))}
            </ul>

            <p className="shrink-0 text-[11px] leading-[19px] text-[#9ca3af] lg:text-[13px] lg:leading-[22px]">
              حمایت‌های رفاهی جدید پس از انتشار در این بخش نمایش داده می‌شوند.
            </p>
          </>
        )}
      </div>
    </StudentShell>
  );
}
