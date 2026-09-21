# پایهٔ مستقل از فروشنده برای خط لولهٔ ویدئوی مقیاس‌پذیر

**وضعیت: کد قرارداد و صف پایدار پیاده شده؛ هیچ storage، signing gateway، scanner، transcoder، CDN یا edge عملیاتی به پروژه متصل نشده است.** مسیر فعال موجود همچنان پایلوت حداکثر ۸ MiB با عبور بایت‌ها از Next.js است. این تغییر نه آن سقف را برمی‌دارد و نه قابلیت direct-upload تولیدی را فعال می‌کند.

## direct-to-quarantine multipart: قرارداد قابل اتصال، نه endpoint فعال

`src/server/media/multipart.ts` با کلید سرورساخت `quarantine/<uploadUUID>`، بخش‌های ۱۶ MiB، سقف ۵ GiB، TTL پیشنهادی ۱۵ دقیقه، اعتبارسنجی تعداد/ترتیب/اندازهٔ بخش‌های **فهرست‌شده توسط storage** و تطبیق اندازه و SHA-256 نهایی خصوصی پیاده شده است. هر adapter واقعی باید:
- فقط پس از بازبینی **عضویت فعال ارائه‌دهنده، مالکیت دورهٔ draft و approval مؤسسه و تأییدکنندهٔ فعال** یک upload session را در bucket خصوصی ایجاد کند؛ هیچ URL/key/bucket/callback از کلاینت نپذیرد.
- امضای هر part را به upload UUID، کلید قرنطینه، part number، اندازه، checksum و TTL محدود کند؛ CORS صرفاً origin اپ را مجاز کند؛ مجوز list/read/delete عمومی ندهد. expiry و quota سراسری با PostgreSQL و rate limiter توزیع‌شده enforce شوند.
- قبل از complete، بخش‌ها را مستقل از اظهارات کلاینت از storage list کند، manifest را بررسی کند، object کامل را سروری از storage verify کند و سپس durable processing job را enqueue کند. اگر storage امکان whole-object SHA ندارد، به digest multipart/ETag اتکا نکند؛ یک stream verifier مستقل لازم است.
- در خطا multipart را abort کند و پس از TTL فایل/part رهاشده را از bucket واقعی حذف کند. `abandonStalePilotUploads` فقط metadata را رد می‌کند و شناسه‌ها را برای reaper برمی‌گرداند؛ **فایل واقعی را پاک نمی‌کند و هنوز زمان‌بندی نشده است**.

## صف PostgreSQL (هم‌اکنون در ingest پایلوت متصل)

Migration `0006_dena_processing_queue.sql` جدول `dena_media_processing_jobs` می‌سازد. بعد از انتقال موفق pilot به قرنطینه، درج job در **همان تراکنش** status quarantined انجام می‌شود. Worker داخلی با Bearer مستقل:
- `POST /api/internal/media-jobs/claim` با body `{"limit":1..10}`: `FOR UPDATE SKIP LOCKED`، lease تصادفی ۵ دقیقه‌ای، replay فقط پس از انقضا، سقف ۵ تلاش.
- `POST /api/internal/media-jobs/:uploadId/fail` با `{leaseToken,reason}`: فقط دارندهٔ lease زنده حق retry دارد؛ backoff نمایی ۳۰، ۶۰، ۱۲۰، ۲۴۰ ثانیه و سپس dead-letter.
- lease منقضی‌شدهٔ تلاش پنجم در فراخوانی claim به dead-letter می‌رود؛ ردیف/فایل private باقی می‌ماند تا operator/reaper معتبر آن را بررسی کند. callback اکنون فقط با body دقیق `{leaseToken}`، قفل lease فعال و معتبر را قبول می‌کند. تکرار درخواست بعد از `ready` پاسخ idempotent می‌گیرد؛ نشتی token نباید معادل مجوز انتشار پیش از پردازش باشد.

## گواهی مستقل ورودی و خروجی

`verifyProcessingAttestation` برای قرارداد آینده HMAC-SHA256 (کلید مجزا، `keyId`، نسخه، job UUID، input digest/size، output digest/size/key، scanner/version، verdict و timestamp کوتاه‌عمر) و `verifyProcessedObject` برای HEAD خصوصی برابر digest/size خروجی نوشته و آزموده شده‌اند. **این verifier اکنون به callback پایلوت متصل است**: body تنها `{leaseToken}` است؛ گزارش از origin خصوصی بازخوانی، با کلید HMAC جدا (`DENA_MEDIA_ATTESTATION_HMAC_KEY`) و `keyId` راستی‌آزمایی و سپس metadata HEAD مستقل (size/hash/type/private) برابر خروجی سنجیده می‌شود. بدون سه feature flag و سه secret متمایز، آماده‌سازی خاموش است. شبیه‌ساز CI برای آزمایش تفاوت digestها چهار بایت به خروجی می‌افزاید و با کلید آزمایشی گزارش می‌دهد؛ **این نه transcoding واقعی است، نه antivirus واقعی و نه اثبات اصالت scanner مستقل**. برای production کلید امضا تنها نزد scanner ایزوله، verifier تنها نزد API، private object immutable، rotation/secret manager، AV واقعی و transcoding sandbox لازم‌اند.

## تحویل امن در مقیاس

مسیر دانش‌آموز هنوز session/enrollment/grant را برای هر Range کنترل و از private origin stream می‌کند؛ CDN/edge واقعی فعال نیست. پیش از edge، مجوز کوتاه‌عمر مقید به asset و کاربر/نشست، سیاست no-public-origin، revocation، purge/cache-key خصوصی، replay limit، time skew، race با revoke، مشاهده‌پذیری و تست فشار لازم‌اند. هیچ ادعای ۵ میلیون کاربر هم‌زمان از این تغییر نتیجه نمی‌شود.
