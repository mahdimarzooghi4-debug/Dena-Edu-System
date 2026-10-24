# استقرار کامل دنا روی سرور خودمان

این بسته، برنامهٔ Next.js، PostgreSQL با TLS داخلی، اجرای migration، reverse proxy با TLS عمومی و worker تماس را روی Docker Compose آماده می‌کند. هیچ داده‌ای از Render حذف یا جابه‌جا نمی‌شود تا سرور مقصد آماده و بررسی شود. LiveKit از راهنمای مستقل [`../livekit/README.md`](../livekit/README.md) نصب می‌شود؛ برای رسانهٔ زنده، سرور/شبکه باید UDP عمومی داشته باشد.

## سرور پایلوت

- Linux x86_64 با دسترسی root، Docker Engine و Docker Compose v2.
- شروع پیشنهادی برای برنامه و DB: 4 vCPU، 8–16 GB RAM، 80 GB SSD و IP عمومی ثابت. این برآورد برای Stage و پایلوت کم‌ترافیک است، ظرفیت کاربران هم‌زمان را تضمین نمی‌کند.
- دامنهٔ اصلی باید به IP سرور برسد؛ پورت‌های TCP 80 و 443 برای Caddy باز باشند. پورت PostgreSQL در اینترنت باز نمی‌شود.
- اگر LiveKit روی همین میزبان باشد، پورت‌های UDP تماس نیز باید مستقیم به همان سرویس برسند؛ اگر زیرساخت شبکه یا فایروال این کار را نمی‌کند، LiveKit روی VM جدا اجرا می‌شود.

## آماده‌سازی امن

1. مخزن را روی سرور clone کنید و `.env.example` را به `.env` کپی کنید. مقادیر دامنه و PostgreSQL را قرار دهید. برای پسورد DB از رشتهٔ hex تولیدشده با `openssl rand -hex 32` استفاده کنید تا در `DATABASE_URL` نیاز به URL-encoding نداشته باشد.
2. `app.env.example` را به `app.env` کپی کنید. دامنه، `BETTER_AUTH_URL`، `BETTER_AUTH_SECRET` تصادفی و `DATABASE_URL` را با پسورد DB یکسان تنظیم کنید. پارامتر TLS دیتابیس باید باقی بماند:

   ```text
   postgresql://dena_app:<same-password>@db:5432/dena?sslmode=verify-full
   ```

   Set `DATABASE_SSL_CA=/run/secrets/postgres-ca.crt`; Dena's postgres.js client uses this CA to verify the private database certificate and hostname.

   برای تولید secret از `openssl rand -hex 32` استفاده کنید؛ secret واقعی را در Git، چت یا log قرار ندهید. نگه‌داشتن feature flags روی `0` باعث می‌شود درگاه‌ها و APIهای بیرونیِ هنوز پیکربندی‌نشده خاموش بمانند.
3. روی دستگاه امن مدیر، گواهی داخلی PostgreSQL را بسازید:

   ```sh
   bash deploy/self-hosted/generate-postgres-tls.sh
   ```

   `ca.key` را آفلاین و خارج از سرور نگه دارید. فایل‌های `ca.crt`، `server.crt` و `server.key` را امن به مقصد منتقل کنید؛ روی سرور مالکیت `server.key` را به UID 999 بدهید و دسترسی آن را فقط برای مالک نگه دارید.
4. پیش از بالا آوردن سرویس، مطمئن شوید دامنه به IP همین سرور resolve می‌شود. Caddy برای گرفتن گواهی عمومی باید از اینترنت روی پورت 80/443 قابل دسترس باشد.

## ساخت و اجرای Stage

فرمان‌ها از ریشهٔ مخزن اجرا می‌شوند:

```sh
docker compose --env-file deploy/self-hosted/.env -f deploy/self-hosted/compose.yaml build web migrate
docker compose --env-file deploy/self-hosted/.env -f deploy/self-hosted/compose.yaml up -d db
docker compose --env-file deploy/self-hosted/.env -f deploy/self-hosted/compose.yaml run --rm migrate
docker compose --env-file deploy/self-hosted/.env -f deploy/self-hosted/compose.yaml up -d web caddy
```

بررسی کنید `https://<DENA_DOMAIN>/api/health/live` و `/api/health/ready` سالم باشند؛ سپس ورود، کوکی‌های secure، ثبت‌نام آزمایشی، migration و restart سرور را بررسی کنید. پورت 3000 و 5432 نباید از اینترنت در دسترس باشند. برای Stage نام/دامنه و secret جدا از Production استفاده کنید.

## انتقال PostgreSQL از Render بدون حذف نسخهٔ مبدأ

1. ابتدا مقصد را به‌صورت Stage با دیتابیس خالی بالا بیاورید و رفتار برنامه را بررسی کنید.
2. در پنجرهٔ انتقال، نوشتن روی نسخهٔ Render را متوقف کنید، از دیتابیس Render یک `pg_dump --format=custom --no-owner --no-acl` بگیرید و فایل را رمزگذاری‌شده به سرور منتقل کنید. مقدار اتصال Render را در shell history، خروجی فرمان یا گفتگو چاپ نکنید.
3. snapshot را به دیتابیس تازهٔ مقصد restore کنید؛ owner/ACL را طبق roleهای مقصد تنظیم کنید. تعداد جدول‌ها، رکوردهای کلیدی، کاربران/عضویت‌ها، migration ledger و داده‌های دوره‌ها را با queryهای فقط‌خواندنی تطبیق دهید.
4. `drizzle-kit migrate` را اجرا کنید، سلامت `/api/health/ready` را بررسی کنید و تست ورود و عملیات مهم را با حساب Stage انجام دهید.
5. پس از آماده‌شدن دامنهٔ Production، DNS را تغییر دهید. Render و snapshot آن را تا پایان دورهٔ اطمینان نگه دارید تا rollback ممکن باشد؛ پس از تغییر DNS هر دو دیتابیس هم‌زمان قابل نوشتن نباشند.

دستور restore دقیق باید بر اساس نسخهٔ PostgreSQL، schema و نوع دسترسی دیتابیس مبدأ در پنجرهٔ انتقال نهایی شود. این راهنما هنوز به هیچ Render service یا VPS وصل نشده و هیچ داده‌ای را کپی/حذف نکرده است.

پس از استقرار و آزمون LiveKit، `DENA_LIVEKIT_ENABLED=1` و `DENA_LIVEKIT_ROOM_CONTROL_ENABLED=1` را در `app.env` قرار دهید و worker را با `docker compose --env-file deploy/self-hosted/.env -f deploy/self-hosted/compose.yaml --profile livekit up -d livekit-quota-worker` اجرا کنید. تا پیش از آماده‌شدن webhook، سرور رسانه و تست تماس از دو شبکه، این flagها را روشن نکنید.

## پشتیبان و بازیابی

Volume محلی به‌تنهایی backup نیست. قبل از Production باید backup رمزگذاری‌شده و خارج از همین failure domain، retention، پایش موفقیت job، آزمون restore و مسئول عملیاتی مشخص شود. پورت DB را عمومی نکنید. نسخهٔ پایلوت Compose جایگزین PostgreSQL HA یا برنامهٔ DR برای انتشار ملی نیست.

## موارد وابسته به زیرساخت مقصد

برای نصب و انتقال واقعی باید IP/سیستم‌عامل سرور، دامنه‌ای که DNS آن در اختیار شماست، دسترسی ترمینال مدیریتی، مشخصات دیتابیس فعلی Render (بدون ارسال secret در چت)، و روش/زمان پنجرهٔ قطع نوشتن مشخص باشند. در ابزار فعلی این نشست اتصال SSH یا پنل VPS نداریم؛ بنابراین این فایل‌ها بستهٔ آمادهٔ استقرارند، نه اعلام انجام migration.
