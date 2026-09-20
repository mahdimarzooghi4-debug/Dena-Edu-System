const figmaUrl =
  "https://www.figma.com/design/8Bo8BNS5LVQfTJhxwCYQmo/Dena-Ecosystem";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl items-center px-6 py-16">
      <section className="w-full rounded-3xl border border-violet-100 bg-white p-8 shadow-sm sm:p-12">
        <p className="mb-4 text-sm font-semibold text-dena">دنا · دانش‌آموزان نوآفرین ایران</p>
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
          زیرساخت فنی دنا
        </h1>
        <p className="mt-6 leading-8 text-dena-muted">
          فناوری انتخاب شده و ساخت پروژه آغاز شده است. صفحه‌های نقش‌ها،
          ورود، پرداخت و تیکت هنوز به داده یا سرویس عملیاتی متصل نشده‌اند.
        </p>
        <a
          className="mt-8 inline-flex min-h-12 items-center justify-center rounded-xl bg-dena px-5 font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dena"
          href={figmaUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          مشاهدهٔ طراحی مرجع دنا
        </a>
      </section>
    </main>
  );
}
