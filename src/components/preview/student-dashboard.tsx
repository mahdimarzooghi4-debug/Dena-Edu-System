import Link from "next/link";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionHeading } from "@/components/ui/section-heading";
import { buttonClassName } from "@/components/ui/button";
import { figmaUrl } from "@/lib/navigation";

const overviewItems = [
  { label: "دوره‌های من", description: "آموزش ضبط‌شده و دسترسی مجاز" },
  { label: "تمرین و آزمون", description: "تکلیف‌ها و ارزیابی‌های مرتبط با دوره" },
  { label: "مسیر رشد", description: "پیگیری روند یادگیری دانش‌آموز" },
] as const;

/** Static PUBLIC design preview, deliberately no student data or API reads. */
export function StudentDashboardPreview() {
  return (
    <div className="space-y-7" data-figma-node="153:2">
      <section className="rounded-[20px] bg-dena-lavender px-6 py-7 md:px-8">
        <p className="text-sm font-bold text-dena-brand">خانه من در دنا</p>
        <h1 className="mt-2 text-[27px] font-extrabold leading-relaxed text-dena-deep md:text-[31px]">
          یادگیری‌ات از همین‌جا ادامه دارد
        </h1>
        <p className="mt-2 max-w-4xl text-[15px] leading-8">
          دوره‌ها، تمرین‌ها، نتایج آزمون و روند پیشرفتت را در یک نگاه ببین و
          یادگیری ضبط‌شده را با سرعت خودت ادامه بده.
        </p>
        <p className="mt-3 text-xs font-semibold text-dena-brand">
          پیش‌نمایش ساختار صفحه؛ هنوز حساب و دادهٔ دانش‌آموز متصل نیست.
        </p>
      </section>

      <section aria-labelledby="student-overview" className="space-y-4">
        <SectionHeading id="student-overview" note="بدون شمارش یا نتیجهٔ ساختگی">
          نمای کلی یادگیری
        </SectionHeading>
        <div className="grid gap-4 md:grid-cols-3">
          {overviewItems.map((item) => (
            <Card key={item.label} className="min-h-[139px] p-[22px]">
              <p className="text-[13px] font-medium text-dena-muted">{item.label}</p>
              <p className="mt-2 text-[25px] font-extrabold text-dena-brand" aria-label="داده‌ای موجود نیست">
                —
              </p>
              <p className="mt-1 text-xs leading-6 text-dena-muted">{item.description}</p>
            </Card>
          ))}
        </div>
      </section>

      <section aria-labelledby="student-courses" className="space-y-4">
        <SectionHeading id="student-courses">ادامه یادگیری در دوره‌ها</SectionHeading>
        <Card className="p-[22px]">
          <p className="text-xs text-dena-muted">دوره‌های آموزشی ضبط‌شده</p>
          <EmptyState
            className="mt-4"
            title="هنوز داده‌ای برای نمایش وجود ندارد"
            description="عنوان دوره، مؤسسهٔ مسئول، وضعیت نظارت و میزان پیشرفت فقط پس از اتصال به داده‌های واقعی و مجاز نشان داده می‌شوند."
            action={
              <Link href="/preview/student/courses" className={buttonClassName("secondary")}>
                مشاهدهٔ پوستهٔ دوره‌های من
              </Link>
            }
          />
        </Card>
      </section>

      <section aria-labelledby="student-assessments" className="space-y-4">
        <SectionHeading id="student-assessments">تمرین، ارزیابی و مسیر رشد</SectionHeading>
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="flex flex-col gap-4">
            <h3 className="text-[22px] font-extrabold">نمایی از مسیر رشد</h3>
            <p className="text-sm leading-7 text-dena-muted">
              نمودار یا درصد پیشرفت بدون دادهٔ واقعی دانش‌آموز ترسیم نمی‌شود.
            </p>
            <div className="mt-auto">
              <Link href="/preview/student/growth" className={buttonClassName("outline")}>
                مشاهدهٔ پوستهٔ مسیر رشد
              </Link>
            </div>
          </Card>
          <Card className="flex flex-col gap-4">
            <h3 className="text-[22px] font-extrabold">تمرین و آزمون</h3>
            <p className="text-sm leading-7 text-dena-muted">
              تکلیف‌ها، زمان‌بندی و نتیجهٔ آزمون پس از اتصال سامانهٔ واقعی و تعیین مسئول هر دوره نمایش داده خواهند شد.
            </p>
            <div className="mt-auto">
              <Link href="/preview/student/assessments" className={buttonClassName("outline")}>
                مشاهدهٔ پوستهٔ تمرین‌ها و آزمون‌ها
              </Link>
            </div>
          </Card>
        </div>
      </section>

      <aside className="rounded-2xl border border-dena-lavender bg-dena-bg px-5 py-4 text-sm leading-8 text-dena-muted">
        <h2 className="font-bold text-dena-ink">دربارهٔ این پیش‌نمایش</h2>
        <p>
          دنا بستر فنی است و مجوز رسمی آموزشی صادر نمی‌کند. مسئولیت محتوای هر دوره و
          نظارت آموزشی با مؤسسه یا ارائه‌دهندهٔ مسئول همان دوره است. هیچ پرداخت،
          دوره یا دسترسی واقعی از این صفحه فعال نمی‌شود.
        </p>
        <a
          className="mt-2 inline-block font-semibold text-dena-brand underline-offset-4 hover:underline"
          href={figmaUrl("153:2")}
          target="_blank"
          rel="noopener noreferrer"
        >
          مشاهدهٔ فریم مرجع دانش‌آموز در Figma
        </a>
      </aside>
    </div>
  );
}
