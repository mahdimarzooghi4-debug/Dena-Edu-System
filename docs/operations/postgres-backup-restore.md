# آزمون backup و restore پایگاه داده PostgreSQL

این رویه فقط برای دیتابیس موقت CI است. این آزمون، پشتیبان‌گیری زمان‌بندی‌شده، رمزگذاری، retention، point-in-time recovery یا بازیابی Stage/Production را پیکربندی یا اثبات نمی‌کند.

## اجرای آزمون CI

Job عملیات در `.github/workflows/ci.yml` بعد از اعمال migrationها اجرا می‌شود:

```sh
DENA_DB_INTEGRATION=1 \
DATABASE_URL=postgresql://dena_test:dena_test@127.0.0.1:5432/dena_integration \
node scripts/test-postgres-backup-restore.mjs
```

اسکریپت به ابزارهای PostgreSQL client یعنی `pg_dump`, `pg_restore`, `createdb`, `dropdb` و `psql` نیاز دارد. اجرا فقط وقتی مجاز است که متغیر محیطی صریحاً روی `1` باشد و میزبان، نام کاربر و نام دیتابیس با تنظیمات CI برابر باشند.

آزمون archive سفارشی می‌سازد، آن را در یک دیتابیس جداگانه restore می‌کند، sentinel را از دیتابیس بازیابی‌شده می‌خواند، و منابع موقت را پاک می‌کند. موفقیت آن، صحت مسیر فنی dump/restore برای این نسخه از PostgreSQL را نشان می‌دهد.

پس از migration و آزمون restore، هر shard نقش `dena_app_ci` را با حداقل مجوزهای DML روی جداول/sequenceها ایجاد می‌کند؛ سپس build و Playwright با این نقش اجرا می‌شوند. workflow وجود نداشتن ویژگی superuser را کنترل می‌کند. کاربر `dena_test` فقط برای ایجاد schema و migration در CI است؛ این الگو هنوز معادل طراحی و بازبینی مجوزهای production نیست.

## تمرین لازم برای محیط واقعی

پیش از Stage/Production باید مالک سرویس این موارد را در runbook محیطی تکمیل و ثبت کند:

- تهیهٔ backup خودکار، رمزگذاری‌شده و خارج از میزبان اصلی؛
- دورهٔ نگهداری و کنترل دسترسی به نسخه‌ها؛
- تصمیم دربارهٔ snapshot یا point-in-time recovery و بررسی RPO/RTO؛
- ثبت TLS و روش امن دسترسی/بازیابی؛
- تمرین restore در محیط جدا با دادهٔ مصنوعی، ثبت زمان بازیابی و اعتبارسنجی برنامه؛
- ثبت مسئول اجرا، پایش شکست backup و مسیر escalation پشتیبانی.

اجرای CI هیچ‌کدام از این تنظیمات یا تمرین‌های محیط واقعی را جایگزین نمی‌کند.
