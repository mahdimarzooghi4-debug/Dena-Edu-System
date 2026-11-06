import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getServerAccessContext } from "../../server/access/actor";
import { adminDirectories, getAdminDirectory, type AdminDirectory } from "../../server/admin/directory";
import { AdminShell } from "./admin-shell";
import { Card } from "../ui/card";

const labels: Record<string, string> = {
  active: "فعال", inactive: "بدون عضویت فعال", suspended: "تعلیق‌شده", revoked: "لغوشده",
  requested: "در انتظار نظارت", approved: "تأییدشده", pending: "در انتظار بررسی", rejected: "ردشده",
  draft: "پیش‌نویس", published: "منتشرشده", archived: "بایگانی", aggregate: "تجمیعی",
  student: "دانش‌آموز", institute: "مؤسسه", provider: "ارائه‌دهنده", admin: "مدیر", organization: "سازمان", benefactor: "حامی",
  ORGANIZATION_STUDENT: "ثبت دانش‌آموز سازمانی", ORGANIZATION_API_KEY: "اتصال API سازمان",
};
const translate = (value: string) => value.split(", ").map((part) => labels[part] ?? part).join("، ");
export type DirectoryPageProps = { searchParams: Promise<{ q?: string; page?: string; item?: string }> };
export async function AdminDirectoryPage({ section, searchParams }: DirectoryPageProps & { section: AdminDirectory }) {
  if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET || !process.env.BETTER_AUTH_URL) redirect("/login");
  const actor = await getServerAccessContext();
  if (!actor) redirect("/login");
  const params = await searchParams;
  const state = await getAdminDirectory(actor.userId, section, { query: params.q, page: Number(params.page ?? 1) });
  if (!state) notFound();
  const config = adminDirectories[section];
  const base = `/admin/${section}`;
  const href = (page: number, item?: string) => {
    const query = new URLSearchParams({ q: state.query, page: String(page) });
    if (item) query.set("item", item);
    return `${base}?${query}${item ? "#directory-detail" : ""}`;
  };
  const selected = state.rows.find((row) => row.id === params.item);
  return <AdminShell active={section} canHandleSupport={actor.memberships.some((m) => m.role === "admin" && m.canHandleTechnicalSupport)}>
    <main id="main-content" className="mx-auto min-h-screen max-w-7xl space-y-5 px-5 py-6 md:px-7">
      <header className="space-y-3">
        <p className="text-xs text-dena-muted">مدیریت / {config.group}</p>
        <h1 className="text-[27px] font-extrabold text-dena-deep">{config.title}</h1>
        <p className="text-sm leading-7 text-dena-muted">{config.description}</p>
      </header>
      <div className="grid gap-3 sm:grid-cols-3">
        <Card><p className="text-xs text-dena-muted">تعداد نتایج</p><p className="mt-2 text-2xl font-extrabold text-dena-deep">{state.total.toLocaleString("fa-IR")}</p></Card>
        <Card><p className="text-xs text-dena-muted">صفحهٔ فعلی</p><p className="mt-2 text-2xl font-extrabold text-dena-deep">{state.page.toLocaleString("fa-IR")} از {state.pageCount.toLocaleString("fa-IR")}</p></Card>
        <Card><p className="text-xs text-dena-muted">دامنهٔ نمایش</p><p className="mt-2 text-sm font-bold text-dena-deep">اطلاعات مدیریتی · فقط‌خواندنی</p></Card>
      </div>
      <Card className="space-y-4 rounded-xl p-5">
        <form action={base} method="get" className="flex flex-wrap gap-3">
          <label className="min-w-0 flex-1"><span className="sr-only">جست‌وجو</span><input type="search" name="q" defaultValue={state.query} maxLength={120} placeholder="جست‌وجو با نام، شناسه یا عنوان…" className="min-h-10 w-full rounded-lg border border-dena-border bg-dena-bg px-3 text-sm" /></label>
          <button type="submit" className="rounded-lg bg-dena-brand px-4 py-2 text-sm font-bold text-white">جست‌وجو</button>
          {state.query && <Link href={base} className="px-3 py-2 text-sm text-dena-brand">حذف جست‌وجو</Link>}
        </form>
        {!state.rows.length ? <p className="py-5 text-sm text-dena-muted">{state.query ? "موردی مطابق جست‌وجو پیدا نشد." : "هنوز رکوردی در این بخش ثبت نشده است."}</p> : <div className="overflow-x-auto rounded-lg border border-dena-border">
          <table className="w-full min-w-[720px] text-right text-xs">
            <thead className="h-[42px] bg-dena-bg text-dena-muted"><tr>{["نام / عنوان", "وضعیت", "خلاصه", "تاریخ ثبت / انتشار", "جزئیات"].map((label) => <th key={label} scope="col" className="px-4 font-bold">{label}</th>)}</tr></thead>
            <tbody>{state.rows.map((row) => <tr key={row.id} className="h-[54px] border-t border-dena-border odd:bg-white even:bg-[#fcfbff]">
              <th scope="row" className="max-w-80 break-words px-4 py-3 font-semibold leading-6">{translate(row.name)}</th>
              <td className="px-4 py-3"><span className="rounded-md bg-dena-lavender px-2 py-1 text-dena-brand">{translate(row.status)}</span></td>
              <td className="max-w-72 break-words px-4 py-3 leading-6">{translate(row.detail)}</td>
              <td className="whitespace-nowrap px-4 py-3 text-dena-muted">{row.created_at ? new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium", timeZone: "Asia/Tehran" }).format(new Date(row.created_at)) : "—"}</td>
              <td className="px-4 py-3"><Link href={href(state.page, row.id)} className="font-bold text-dena-brand">مشاهده</Link></td>
            </tr>)}</tbody>
          </table>
        </div>}
        <nav aria-label="صفحه‌بندی" className="flex justify-between text-sm font-bold text-dena-brand">
          {state.page > 1 ? <Link href={href(state.page - 1)}>صفحهٔ قبل</Link> : <span />}
          {state.page < state.pageCount ? <Link href={href(state.page + 1)}>صفحهٔ بعد</Link> : <span />}
        </nav>
      </Card>
      {selected && <Card id="directory-detail" className="scroll-mt-5 space-y-3">
        <div className="flex justify-between gap-3"><h2 className="text-lg font-extrabold text-dena-deep">{translate(selected.name)}</h2><Link href={href(state.page)} className="text-sm text-dena-brand">بستن جزئیات</Link></div>
        <dl className="grid gap-4 text-sm sm:grid-cols-3"><div><dt className="text-dena-muted">شناسه</dt><dd className="mt-2 break-all"><bdi>{selected.id}</bdi></dd></div><div><dt className="text-dena-muted">وضعیت</dt><dd className="mt-2">{translate(selected.status)}</dd></div><div><dt className="text-dena-muted">خلاصه</dt><dd className="mt-2 leading-7">{translate(selected.detail)}</dd></div></dl>
        <Link href="/admin/audit" className="inline-block text-sm font-bold text-dena-brand">مشاهدهٔ گزارش رویدادها</Link>
      </Card>}
    </main>
  </AdminShell>;
}
