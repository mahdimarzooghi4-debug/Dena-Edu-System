import Link from "next/link";
import { Card } from "../ui/card";
import { buttonClassName } from "../ui/button";
import type { OrganizationPanelSnapshot } from "../../server/organization/analytics";

type View = "reports" | "growth" | "notifications";
const fa = (value: number) => value.toLocaleString("fa-IR");
const monthLabel = (month: string) => {
  const [year, value] = month.split("-").map(Number);
  return new Intl.DateTimeFormat("fa-IR", {
    month: "long", year: "numeric", timeZone: "Asia/Tehran",
  }).format(new Date(Date.UTC(year, value - 1, 15)));
};

export function OrganizationPanelAnalytics({
  snapshot, view,
}: { snapshot: OrganizationPanelSnapshot; view: View }) {
  const { totals } = snapshot;
  const verifiedRate = totals.students
    ? Math.round(totals.phoneVerified / totals.students * 100) : 0;
  const pendingOrganizations = snapshot.organizations.filter(
    (item) => item.activationPending > 0,
  );
  const maxMonthly = Math.max(1, ...snapshot.months.map((item) => item.registrations));

  return (
    <div className="space-y-7">
      <nav aria-label="بخش‌های پنل سازمان" className="flex flex-wrap gap-2">
        <Link href="/organization" className={buttonClassName("secondary")}>خانهٔ سازمان</Link>
        <Link href="/organization/students" className={buttonClassName("secondary")}>دانش‌آموزان</Link>
        <Link href="/organization/reports" className={buttonClassName(view === "reports" ? "primary" : "secondary")}>گزارش‌ها</Link>
        <Link href="/organization/growth" className={buttonClassName(view === "growth" ? "primary" : "secondary")}>رشد و پیشرفت</Link>
        <Link href="/organization/notifications" className={buttonClassName(view === "notifications" ? "primary" : "secondary")}>پیگیری‌ها</Link>
      </nav>

      {view === "reports" && <>
        <section aria-label="خلاصه گزارش ثبت‌نام" className="grid gap-4 sm:grid-cols-3">
          <Metric label="پرونده‌های ثبت‌شده" value={totals.students} />
          <Metric label="شماره‌های تأییدشده" value={totals.phoneVerified} />
          <Metric label="در انتظار تأیید شماره" value={totals.activationPending} />
        </section>
        <Card className="space-y-4">
          <div>
            <h2 className="text-lg font-extrabold">وضعیت هر سازمان</h2>
            <p className="mt-1 text-sm leading-7 text-dena-muted">
              فقط جمع پرونده‌های محدوده‌های مجاز این حساب نمایش داده می‌شود.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[34rem] text-right text-sm">
              <thead><tr className="border-b border-dena-border text-dena-muted">
                <th className="px-3 py-3">سازمان</th><th className="px-3 py-3">کل پرونده</th>
                <th className="px-3 py-3">تأیید شماره</th><th className="px-3 py-3">در انتظار</th>
              </tr></thead>
              <tbody>{snapshot.organizations.map((item) => (
                <tr key={item.id} className="border-b border-dena-border last:border-0">
                  <th scope="row" className="px-3 py-3 font-bold">{item.name}</th>
                  <td className="px-3 py-3">{fa(item.students)}</td>
                  <td className="px-3 py-3">{fa(item.phoneVerified)}</td>
                  <td className="px-3 py-3">{fa(item.activationPending)}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </Card>
        <MonthlyTrend snapshot={snapshot} maxMonthly={maxMonthly} />
        <p className="text-xs leading-6 text-dena-muted">
          گزارش فعلی دربارهٔ ثبت پرونده و تأیید شماره است؛ تخصیص دوره، پرداخت، صورتحساب و نتیجهٔ آموزشی هنوز به آن متصل نیست.
        </p>
      </>}

      {view === "growth" && <>
        <Card className="space-y-5">
          <div>
            <h2 className="text-lg font-extrabold">تکمیل ورود دانش‌آموزان</h2>
            <p className="mt-1 text-sm leading-7 text-dena-muted">
              این شاخص رشد فعال‌سازی حساب است و نتیجه یا نمرهٔ آموزشی را اندازه نمی‌گیرد.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Metric label="پروندهٔ ایجادشده" value={totals.students} />
            <Metric label="حساب با شمارهٔ تأییدشده" value={totals.phoneVerified} />
            <Metric label="در انتظار اقدام دانش‌آموز" value={totals.activationPending} />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between gap-3 text-sm font-bold">
              <span>نرخ تأیید شماره</span><span>{fa(verifiedRate)}٪</span>
            </div>
            <progress aria-label="درصد شماره‌های تأییدشده"
              className="h-3 w-full accent-dena-brand" max={100} value={verifiedRate} />
          </div>
        </Card>
        <MonthlyTrend snapshot={snapshot} maxMonthly={maxMonthly} />
      </>}

      {view === "notifications" && <section aria-labelledby="org-follow-up-title" className="space-y-4">
        <Card className="space-y-3">
          <h2 id="org-follow-up-title" className="text-lg font-extrabold">وضعیت‌های نیازمند پیگیری</h2>
          <p className="text-sm leading-7 text-dena-muted">
            این موارد از وضعیت فعلی پرونده‌ها محاسبه می‌شوند؛ سامانه در این صفحه پیامک یا اعلان بیرونی ارسال نمی‌کند.
          </p>
        </Card>
        {totals.students === 0 ? (
          <Card className="space-y-3">
            <h3 className="font-bold">هنوز پرونده‌ای ثبت نشده است</h3>
            <p className="text-sm leading-7 text-dena-muted">پس از ثبت دانش‌آموز، وضعیت تأیید شماره در همین صفحه قابل پیگیری است.</p>
            <Link href="/organization/students" className={buttonClassName()}>ثبت دانش‌آموز</Link>
          </Card>
        ) : totals.activationPending === 0 ? (
          <Card className="space-y-2 border-emerald-200 bg-emerald-50">
            <h3 className="font-bold text-emerald-900">مورد بازی برای پیگیری نیست</h3>
            <p className="text-sm leading-7 text-emerald-800">شمارهٔ تماس همهٔ پرونده‌های ثبت‌شده در محدوده‌های مجاز تأیید شده است.</p>
          </Card>
        ) : pendingOrganizations.map((item) => (
          <Card key={item.id} className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="font-bold">تأیید شماره در «{item.name}» تکمیل نشده</h3>
              <p className="mt-1 text-sm leading-7 text-dena-muted">
                {fa(item.activationPending)} پرونده هنوز شمارهٔ تأییدشده ندارد. دانش‌آموز باید خودش فرایند رمز یک‌بارمصرف را انجام دهد.
              </p>
            </div>
            <Link href="/organization/students?activation=pending" className={buttonClassName("secondary")}>نمایش پرونده‌های در انتظار</Link>
          </Card>
        ))}
      </section>}

      <p className="text-left text-xs text-dena-muted">
        به‌روزرسانی داده: {new Intl.DateTimeFormat("fa-IR", {
          dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Tehran",
        }).format(new Date(snapshot.generatedAt))}
      </p>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return <Card className="space-y-2">
    <p className="text-sm text-dena-muted">{label}</p>
    <p className="text-3xl font-extrabold text-dena-brand">{fa(value)}</p>
  </Card>;
}

function MonthlyTrend({
  snapshot, maxMonthly,
}: { snapshot: OrganizationPanelSnapshot; maxMonthly: number }) {
  return <Card className="space-y-4">
    <div>
      <h2 className="text-lg font-extrabold">روند ثبت پرونده در شش ماه اخیر</h2>
      <p className="mt-1 text-sm leading-7 text-dena-muted">روند از تاریخ واقعی ایجاد پرونده‌ها محاسبه می‌شود.</p>
    </div>
    <ul className="space-y-3">
      {snapshot.months.map((item) => (
        <li key={item.month} className="grid grid-cols-[6rem_1fr_2rem] items-center gap-3 text-sm">
          <span>{monthLabel(item.month)}</span>
          <div className="h-3 overflow-hidden rounded-full bg-dena-bg" role="img"
            aria-label={`${monthLabel(item.month)}: ${fa(item.registrations)} پرونده`}>
            <div className="h-full rounded-full bg-dena-brand"
              style={{ width: `${item.registrations ? Math.max(5, item.registrations / maxMonthly * 100) : 0}%` }} />
          </div>
          <span className="text-left font-bold">{fa(item.registrations)}</span>
        </li>
      ))}
    </ul>
  </Card>;
}
