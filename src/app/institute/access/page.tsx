import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getServerAccessContext } from "../../../server/access/actor";
import { getInstituteMembershipDirectory } from "../../../server/institute/access-directory";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "مدیریت دسترسی‌ها | پنل مؤسسه دنا",
  robots: { index: false, follow: false },
};

export default async function InstituteAccessPage() {
  if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET ||
      !process.env.BETTER_AUTH_URL) redirect("/login");
  const actor = await getServerAccessContext();
  if (!actor) redirect("/login");
  const instituteIds = [...new Set(actor.memberships.flatMap((membership) =>
    membership.role === "institute" && membership.status === "active"
      ? [membership.instituteId] : []))];
  if (!instituteIds.length) notFound();

  const members = await getInstituteMembershipDirectory(instituteIds);
  return (
    <main id="main-content" dir="rtl" className="min-h-screen bg-[#f8f7fc]">
      <header className="flex min-h-[80px] flex-wrap items-center justify-between gap-4 border-b border-[#e5e1ed] bg-white px-5 py-5 md:px-10">
        <span className="rounded-lg bg-[rgba(91,76,226,0.08)] px-3 py-1.5 text-xs font-bold text-[#5b4ce2]">پنل آموزشگاه</span>
        <h1 className="text-lg font-bold text-[#1e1a3c]">مدیریت دسترسی‌ها و اعضا</h1>
      </header>
      <div className="space-y-6 p-5 md:p-10">
        <section className="rounded-xl border border-[#e5e1ed] bg-white p-5">
          <h2 className="font-bold text-[#1e1a3c]">دسترسی‌ها</h2>
          <p className="mt-2 text-sm leading-7 text-[#807b9a]">
            سطح دسترسی کاربران آموزشگاه بر اساس نقش‌ها و عضویت‌های تعریف‌شده در سیستم نمایش داده می‌شود.
          </p>
          <p className="mt-2 text-xs leading-6 text-[#807b9a]">
            در نسخهٔ فعلی، پنل فقط نقش «عضو مؤسسه» و وضعیت عضویت را نگه می‌دارد؛ ویرایش نقش، مجوزهای جزئی و افزودن عضو از این صفحه پشتیبانی نمی‌شود.
          </p>
        </section>

        <section aria-label="اعضای آموزشگاه" className="overflow-hidden rounded-xl border border-[#e5e1ed] bg-white">
          {members.length ? (
            <>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[700px] text-right text-sm">
                  <thead className="bg-[#f7f6fb] text-[13px] font-bold text-[#807b9a]">
                    <tr>
                      <th scope="col" className="px-5 py-4">نام</th>
                      <th scope="col" className="px-5 py-4">نقش</th>
                      <th scope="col" className="px-5 py-4">وضعیت</th>
                      <th scope="col" className="px-5 py-4">عملیات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e5e1ed] text-[#1e1a3c]">
                    {members.map((member) => (
                      <tr key={member.membershipId}>
                        <th scope="row" className="px-5 py-4 font-semibold">{member.name}</th>
                        <td className="px-5 py-4">عضو مؤسسه</td>
                        <td className="px-5 py-4">
                          <span className={member.status === "active"
                            ? "rounded-md bg-[#e8fff3] px-2.5 py-1 text-xs font-bold text-[#10b981]"
                            : "rounded-md bg-[#f1f0f5] px-2.5 py-1 text-xs font-bold text-[#807b9a]"}>
                            {member.status === "active" ? "فعال" : "غیرفعال"}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <button type="button" disabled title="ویرایش نقش هنوز پشتیبانی نمی‌شود"
                            className="cursor-not-allowed rounded-md border border-[#e5e1ed] px-3 py-1.5 text-xs font-semibold text-[#807b9a] opacity-60">ویرایش</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <ul className="divide-y divide-[#e5e1ed] md:hidden">
                {members.map((member) => (
                  <li key={member.membershipId} className="space-y-2 p-4">
                    <h3 className="font-bold text-[#1e1a3c]">{member.name}</h3>
                    <p className="text-sm text-[#807b9a]">عضو مؤسسه · {member.status === "active" ? "فعال" : "غیرفعال"}</p>
                    <button type="button" disabled className="cursor-not-allowed rounded-md border border-[#e5e1ed] px-3 py-1.5 text-xs font-semibold text-[#807b9a] opacity-60">ویرایش</button>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <div className="px-5 py-12 text-center">
              <h2 className="font-bold text-[#1e1a3c]">عضوی برای مؤسسه ثبت نشده است.</h2>
            </div>
          )}
        </section>
        <div className="flex justify-start">
          <button type="button" disabled title="افزودن عضو به گردش‌کار مدیریت عضویت نیاز دارد"
            className="min-h-10 cursor-not-allowed rounded-lg bg-[#5b4ce2] px-4 text-sm font-bold text-white opacity-60">
            افزودن کاربر جدید
          </button>
        </div>
      </div>
    </main>
  );
}
