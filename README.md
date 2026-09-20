# دنا | Dena Edu System

دنا (دانش‌آموزان نوآفرین ایران) **بستر فنی** آموزش ضبط‌شده، تمرین، آزمون و پیگیری یادگیری است؛ مؤسسهٔ آموزشی یا صادرکنندهٔ مجوز رسمی نیست. محتوای آموزشی و نظارت هر دوره با مؤسسه/ارائه‌دهندهٔ مسئول همان دوره است.

## پشتهٔ تأییدشده

Next.js App Router + React + TypeScript؛ Tailwind CSS 4 + قرارداد shadcn/ui؛ PostgreSQL + Drizzle ORM؛ Better Auth؛ React Hook Form + Zod؛ Vitest + Playwright. جزئیات در [ADR](docs/decisions/0001-technology-stack.md).

## راه‌اندازی توسعه

Node.js 22 و npm 11 پیشنهاد می‌شود. npm 10.9.8 در نخستین نصب این مجموعه وابستگی با خطای `edgesOut` متوقف شد؛ نصب npm 11 و تولید lockfile در GitHub Actions موفق بود.

```sh
npm ci
npm run dev
npm run typecheck
npm run lint
npm run test
npm run build
npx playwright install chromium
npm run test:e2e
```

فایل `package-lock.json` از رجیستری npm تولید و ثبت شده است. CI از `npm ci` استفاده می‌کند و lint، typecheck، unit test، build و smoke test مرورگری را اجرا می‌کند.

## وضعیت واقعی پیاده‌سازی

- صفحهٔ اصلی `/` پوستهٔ عمومی را معرفی می‌کند.
- نشانی‌های `/preview/student`، `/preview/institute`، `/preview/provider`، `/preview/admin`، `/preview/organization` و `/preview/benefactor` **پیش‌نمایش عمومی و صرفاً بدون داده** هستند. سایر صفحات هر نقش نیز زیر `/preview` قرار دارند. `/preview/support` پیش‌نمایش یک پشتیبانی فنی مشترک است.
- مسیرهای `/student` و `/admin` و دیگر مسیرهای واقعی پنل‌ها عمداً هنوز پیاده‌سازی/منتشر نشده‌اند. نقشهٔ `src/lib/navigation.ts` قرارداد طراحی است، نه route یا مجوز دسترسی. پیش‌نمایش عمومی به‌هیچ‌وجه محافظت از داده یا احراز هویت تلقی نمی‌شود.
- رنگ‌ها و تناسب پوسته از Figma گرفته شده‌اند؛ لوگوی کوچک از فریم تأییدشدهٔ Figma صادر شده است. فایل‌های فونت Vazirmatn و Estedad تا دریافت نسخهٔ مجاز، بررسی مجوز و QA بصری به مخزن افزوده نشده‌اند.
- دیتابیس، migration، هویت و OTP، مجوزهای سمت سرور، پرداخت، ویدئو/CDN، صندوق حمایت و تیکت هنوز API یا دادهٔ عملیاتی ندارند. `.env.example` فقط جای متغیرهای آینده است؛ کلید و دادهٔ محرمانه commit نکنید.

**قبل از عرضهٔ پنل‌های واقعی:** برای هر درخواست role + scope سروری را اعتبارسنجی کنید، نظارت را برای هر دوره تأیید کنید، خروجی سازمان را تجمیعی و محفوظ و دسترسی خیر را محدود کنید. جزییات در [مرزهای امنیتی](docs/security-boundaries.md).

[طراحی مرجع Figma](https://www.figma.com/design/8Bo8BNS5LVQfTJhxwCYQmo/Dena-Ecosystem).
