# گام اجرایی هویت و دیتابیس دنا — وضعیت و دستور اعتبارسنجی

**وضعیت:** migration اولیهٔ Drizzle و snapshot/journal ثبت شده‌اند و در CI روی PostgreSQL 16 موقت اعمال شده‌اند؛ build و تست‌های HTTP با session معتبر و دسترسی نظارتی به موفقیت رسیدند. هنوز سرویس PostgreSQL دائمی/محیط production، OTP، ارائه‌دهنده SMS، صدور عضویت و پنل عملیاتی نداریم. این سند مجوز عرضه نیست. [GitHub Actions DB integration](https://github.com/mahdimarzooghi4-debug/Dena-Edu-System/actions/runs/35605342859).

## موجود در کد

- جدول‌های هسته Better Auth 1.7.5 و عضویت‌های شش نقش در Drizzle؛ تولید UUID برای تطابق با قراردادهای دامنه.
- نام نقش، status و scope در PostgreSQL، با CHECK که scope نامرتبط و flag اپراتوری نقش غیرادمین را رد می‌کند.
- جدول دوره و وضعیت نظارت **به‌ازای هر دوره**؛ هیچ API تأیید یا self-approval هنوز موجود نیست.
- Better Auth روی `/api/auth/[...all]` به PostgreSQL از طریق Drizzle متصل شده؛ `emailAndPassword` تا انتخاب و اعتبارسنجی روش ورود غیرفعال است و OTP/SMS هنوز موجود نیست.
- `GET /api/access/me`: نشست معتبر + عضویت active فقط از DB؛ بدون session/عضویت، 401 و بدون cache.
- `GET /api/courses/:courseId/authorization`: فقط مجوز دسترسی نظارتی مؤسسه/ارائه‌دهنده در همان دوره؛ مخالف و غیرموجود هر دو 404؛ **مجوز تماشای دانش‌آموز یا پاسخ آزمون نیست**.
- `/preview/*` همچنان عمومی و فاقد اطلاعات واقعی است. مسیرهای پنل واقعی هنوز فعال نیستند.

## مهم: قبل از فعال‌سازی در محیط متصل

1. `npm ci` با Node 22 و npm 11، سپس `npm run typecheck && npm run lint && npm run test && npm run build`. اگر نسخه نصب‌شدهٔ Better Auth schema را تغییر داده، ابتدا کد و نسخه را یکسان کنید.
2. `DATABASE_URL` را در environment توسعه/CI قرار دهید. دیتابیس تست مستقل با کاربر حداقل مجوز. `BETTER_AUTH_SECRET` تصادفی و محرمانه (حداقل ۳۲ بایت)، `BETTER_AUTH_URL` دامنه حقیقی (برای توسعه http://localhost:3000). هیچ secret در Git نیست.
3. Better Auth 1.7.x: `npx auth@1.7.5 generate --config src/lib/auth.cli.ts --output src/db/auth-schema.generated.ts` و schema تولیدشده را با `src/db/schema.ts` **از نظر ستون‌ها و نوع UUID و naming** تطبیق دهید؛ در تغییرات Auth بعدی re-generate کنید. `advanced.database.generateId: "uuid"` و نگاشت‌های adapter یکسان بمانند. توجه: نسخه‌های 1.7.0–1.7.2 ستون issuer داشتند که از 1.7.3 به بعد الزامش حذف شد.
4. migration اولیه در `drizzle/0000_flashy_the_captain.sql` و فایل‌های `drizzle/meta/` ثبت شده است. روی **دیتابیس خالی توسعه** با `npx drizzle-kit migrate` اعمال کنید؛ `npx drizzle-kit generate` در CI نبود تغییر ثبت‌نشدهٔ schema را کنترل می‌کند. production را با `push` تغییر ندهید.
5. تست ادغام DB و HTTP در `tests/e2e/access-db.spec.ts` با PostgreSQL موقت CI پوشش می‌دهد: session معتبر/منقضی/حذف‌شده، عضویت تعلیق‌شده، role جعلی، منع دسترسی بین مؤسسات/نقش‌ها، نظارت requested/revoked و `Cache-Control: no-store`. تست end-to-end با OTP واقعی، تغییر نقش concurrent، اتصال pooler واقعی و آزمون بار هنوز لازم است.
6. endpointهای نوشتن عضویت و تأیید نظارت تنها پس از طراحی approval/audit/transaction و authorization جدا اضافه شوند. خود کاربر هرگز مجاز به ساخت یا تغییر membership نیست.

## تصمیم‌های صریح

- no public signup تا SMS/OTP یا جریان email verified واقعی + rate limiting پیاده شود.
- به صورت پیش‌فرض Better Auth session cookie cache غیرفعال است؛ هر بار session دوباره از backend بررسی می‌شود. هزینه load باید پیش از ۵M اندازه‌گیری شود؛ تغییر cache نباید لغو عضویت/محدوده را به تأخیر ناامن بیندازد.
- DB pool max فعلاً ۱۰ اتصال **برای هر پردازش** است و مقدار نهایی باید از capacity تست و pooler محاسبه شود.
- تست CI با PostgreSQL موقت، تست محصول در محیط استقرار یا اثبات ظرفیت ۵ میلیون نفر نیست؛ پنل واقعی همچنان عرضه نشده است.

منابع مرجع: https://better-auth.com/docs/adapters/drizzle · https://better-auth.com/docs/integrations/next · https://better-auth.com/docs/concepts/database · https://orm.drizzle.team/docs/get-started/postgresql-new
