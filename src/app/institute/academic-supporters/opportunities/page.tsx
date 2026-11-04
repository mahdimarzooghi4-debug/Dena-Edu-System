import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "فرصت‌های حمایتی تحصیلی | پنل مؤسسه دنا",
  robots: { index: false, follow: false },
};

const examples = [
  { title: "پشتیبانی ریاضی دهم", subject: "ریاضی", course: "ریاضی دهم", status: "تخصیص‌یافته", supporter: "علیرضا حسینی" },
  { title: "پشتیبانی فیزیک دهم", subject: "فیزیک", course: "فیزیک دهم", status: "در انتظار", supporter: "—" },
  { title: "پشتیبانی شیمی", subject: "شیمی", course: "شیمی دهم", status: "در انتظار", supporter: "—" },
];

export default function InstituteAcademicSupportOpportunitiesPage() {
  return (
    <main id="main-content" dir="rtl" className="min-h-screen bg-[#f8f7fc]">
      <header className="flex min-h-[80px] flex-wrap items-center justify-between gap-4 border-b border-[#e5e1ed] bg-white px-5 py-5 md:px-10">
        <Link href="/institute/academic-supporters" className="text-sm font-semibold text-[#5b4ce2] hover:underline">بازگشت به پشتیبانان</Link>
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-lg bg-[rgba(91,76,226,0.08)] px-3 py-1.5 text-xs font-bold text-[#5b4ce2]">پنل آموزشگاه</span>
          <h1 className="text-lg font-bold text-[#1e1a3c]">فرصت‌های حمایتی تحصیلی</h1>
        </div>
      </header>
      <div className="space-y-6 p-5 md:p-10">
        <section className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-[#1e1a3c]">فرصت‌های پشتیبانی</h2>
            <p className="mt-1 text-sm text-[#807b9a]">لیست فرصت‌های ثبت‌شده و وضعیت تخصیص پشتیبان</p>
          </div>
          <button type="button" disabled title="ثبت فرصت حمایتی هنوز به گردش‌کار و ذخیره‌سازی نیاز دارد"
            className="inline-flex min-h-10 cursor-not-allowed items-center rounded-lg bg-[#5b4ce2] px-4 text-sm font-bold text-white opacity-60">
            ثبت نیاز جدید
          </button>
        </section>
        <div role="note" className="rounded-lg border border-[#e5e1ed] bg-white px-4 py-3 text-xs leading-6 text-[#807b9a]">
          ردیف‌ها نمونهٔ نمایشی مطابق فیگما هستند؛ مخزن هنوز مدل ذخیره و تخصیص فرصت حمایتی ندارد، بنابراین به‌عنوان دادهٔ واقعی مؤسسه ثبت نشده‌اند.
        </div>
        <section aria-label="نمونه فرصت‌های حمایتی" className="overflow-hidden rounded-xl border border-[#e5e1ed] bg-white">
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[850px] text-right text-sm">
              <thead className="bg-[#f7f6fb] text-[13px] font-bold text-[#807b9a]">
                <tr>
                  <th scope="col" className="px-5 py-4">عنوان فرصت</th>
                  <th scope="col" className="px-5 py-4">حوزهٔ آموزشی</th>
                  <th scope="col" className="px-5 py-4">دورهٔ مرتبط</th>
                  <th scope="col" className="px-5 py-4">وضعیت</th>
                  <th scope="col" className="px-5 py-4">پشتیبان تخصیص‌یافته</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e5e1ed] text-[#1e1a3c]">
                {examples.map((item) => (
                  <tr key={item.title}>
                    <th scope="row" className="px-5 py-4 font-semibold">{item.title}</th>
                    <td className="px-5 py-4">{item.subject}</td>
                    <td className="px-5 py-4">{item.course}</td>
                    <td className="px-5 py-4">
                      <span className={item.status === "تخصیص‌یافته"
                        ? "rounded-md bg-[#e8fff3] px-2.5 py-1 text-xs font-bold text-[#10b981]"
                        : "rounded-md bg-[#fff8e5] px-2.5 py-1 text-xs font-bold text-[#c88b13]"}>{item.status}</span>
                    </td>
                    <td className="px-5 py-4 text-[#807b9a]">{item.supporter}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="divide-y divide-[#e5e1ed] md:hidden">
            {examples.map((item) => (
              <li key={item.title} className="space-y-2 p-4">
                <h3 className="font-bold text-[#1e1a3c]">{item.title}</h3>
                <p className="text-sm text-[#807b9a]">{item.subject} · {item.course}</p>
                <p className="text-sm text-[#807b9a]">پشتیبان: {item.supporter}</p>
                <span className="inline-flex rounded-md bg-[#f0eefd] px-2.5 py-1 text-xs font-bold text-[#5b4ce2]">{item.status}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
