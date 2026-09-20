import Link from "next/link";
import { notFound } from "next/navigation";
import { DenaShell } from "@/components/dena-shell";
import { StudentDashboardPreview } from "@/components/preview/student-dashboard";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonClassName } from "@/components/ui/button";
import { figmaUrl, navigation, roles } from "@/lib/navigation";
import { roleDescriptions, roleLabels, previewHref } from "@/lib/preview";

export default async function RolePreviewPage({
  params,
}: {
  params: Promise<{ role: string; slug?: string[] }>;
}) {
  const { role: rawRole, slug } = await params;
  const role = roles.find((candidate) => candidate === rawRole);
  if (!role) notFound();

  const currentHref = "/" + role + (slug?.length ? "/" + slug.join("/") : "");
  const item = navigation[role].find((route) => route.href === currentHref);
  if (!item) notFound();

  return (
    <DenaShell role={role} currentHref={currentHref} title={item.title}>
      {role === "student" && currentHref === "/student" ? (
        <StudentDashboardPreview />
      ) : (
        <>
          <section className="rounded-[20px] bg-dena-lavender p-7 md:p-8">
            <p className="text-sm font-bold text-dena-brand">فضای {roleLabels[role]} · نسخهٔ نمایشی</p>
            <h1 className="mt-3 text-2xl font-extrabold text-dena-deep md:text-3xl">{item.title}</h1>
            <p className="mt-4 max-w-3xl text-sm leading-8 text-dena-ink">{roleDescriptions[role]}</p>
          </section>
          <section className="mt-8" aria-labelledby="preview-content-title">
            <h2 id="preview-content-title" className="text-xl font-extrabold">نمای کلی</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <Card>
                <p className="text-sm text-dena-muted">اطلاعات این بخش</p>
                <div className="mt-4">
                  <EmptyState
                    title="هنوز داده‌ای برای نمایش وجود ندارد"
                    description="نمایش این قسمت پس از پیاده‌سازی هویت، مجوزهای سمت سرور و اتصال به دادهٔ مجاز فعال خواهد شد."
                  />
                </div>
              </Card>
              <Card>
                <p className="text-sm text-dena-muted">وضعیت پیاده‌سازی</p>
                <h3 className="mt-3 text-xl font-bold">صرفاً پوستهٔ رابط کاربری</h3>
                <p className="mt-3 text-sm leading-7 text-dena-muted">
                  هیچ ثبت‌نام، دوره، پرداخت، تیکت یا شاخص ساختگی در این نما به عنوان دادهٔ واقعی ارائه نمی‌شود.
                </p>
              </Card>
            </div>
          </section>
          <Card className="mt-7 border-dena-lavender bg-white">
            <h2 className="font-bold">مسئولیت و دسترسی</h2>
            <p className="mt-2 text-sm leading-8 text-dena-muted">
              دنا بستر فنی است، نه مؤسسهٔ آموزشی یا صادرکنندهٔ مجوز. محتوای هر دوره و نظارت آن
              بر عهدهٔ مؤسسه یا ارائه‌دهندهٔ مسئول همان دوره است.
              {role === "organization" && " گزارش یادگیری سازمان فقط در حد مجاز، تجمیعی و حافظ حریم خصوصی خواهد بود."}
              {role === "benefactor" && " خیر به هویت و پروندهٔ دانش‌آموز دسترسی نخواهد داشت."}
              {role === "provider" && " نسبت نظارتی فقط پس از تأیید مؤسسه و برای همان دوره معتبر خواهد بود."}
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link href={figmaUrl(item.figmaNode)} target="_blank" rel="noopener noreferrer" className={buttonClassName("secondary")}>
                دیدن فریم مرجع در Figma
              </Link>
              <Link href={previewHref(role, navigation[role][0].href)} className={buttonClassName("outline")}>
                خانهٔ پیش‌نمایش
              </Link>
            </div>
          </Card>
        </>
      )}
    </DenaShell>
  );
}
