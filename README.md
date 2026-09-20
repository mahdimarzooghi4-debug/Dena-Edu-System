# دنا | Dena Edu System

دنا (دانش‌آموزان نوآفرین ایران) **بستر فنی** آموزش ضبط‌شده، تمرین، آزمون و دسترسی است؛ محتوا و نظارت علمی در محدودهٔ دوره با مؤسسه/ارائه‌دهندهٔ مجاز است. تأیید مدارک مؤسسه در دنا برای دسترسی به پلتفرم است، نه صدور مجوز رسمی آموزشی.

## پشتهٔ تأییدشده
Next.js 16 App Router + React 19 + TypeScript؛ Tailwind CSS 4 + shadcn/ui؛ PostgreSQL + Drizzle ORM؛ Better Auth؛ React Hook Form + Zod؛ Vitest + Playwright. جزئیات در [ADR](docs/decisions/0001-technology-stack.md).

## راه‌اندازی
پیش‌نیاز Node.js 22 و npm:
```sh
npm install
npm run dev
npm run typecheck
npm run lint
npm run test
npm run build
# پس از نصب مرورگر: npm run test:e2e
```

در اولین `npm install`، فایل `package-lock.json` ساخته می‌شود؛ آن را commit کرده و سپس CI را به `npm ci` تغییر دهید. **در این مرحله npm install و build در محیط متصل به registry اجرا/تأیید نشده‌اند.**

این مخزن هنوز **اسکلت اولیه** است: صفحهٔ اصلی وضعیت آغاز کار را نشان می‌دهد؛ احراز هویت، درگاه، دیتابیس، تیکت و پنل‌های کاربردی متصل و عملیاتی نیستند. مسیرهای `src/lib/navigation.ts` فقط نقشهٔ طراحی‌اند، نه route یا مجوز فعال. `.env.example` صرفاً متغیرهای آینده را مشخص می‌کند؛ کلید و دادهٔ محرمانه commit نکنید.

[مرجع Figma](https://www.figma.com/design/8Bo8BNS5LVQfTJhxwCYQmo/Dena-Ecosystem) · [مرزهای امنیتی](docs/security-boundaries.md)
