# پایهٔ مستقل از فروشنده برای خط لولهٔ ویدئوی مقیاس‌پذیر

**وضعیت: کد قرارداد و صف پایدار پیاده شده؛ هیچ storage، signing gateway، scanner، transcoder، CDN یا edge عملیاتی به پروژه متصل نشده است.** مسیر فعال موجود همچنان پایلوت حداکثر ۸ MiB با عبور بایت‌ها از Next.js است. این تغییر نه آن سقف را برمی‌دارد و نه قابلیت direct-upload تولیدی را فعال می‌کند.

## direct-to-quarantine multipart: قرارداد قابل اتصال، نه endpoint فعال

`src/server/media/multipart.ts` با کلید سرورساخت `quarantine/<uploadUUID>`، بخش‌های ۱۶ MiB، سقف ۵ GiB، TTL پیشنهادی ۱۵ دقیقه، اعتبارسنجی تعداد/ترتیب/اندازهٔ بخش‌های **فهرست‌شده توسط storage** و تطبیق اندازه و SHA-256 نهایی خصوصی پیاده شده است. هر adapter واقعی باید:
- فقط پس از بازبینی **عضویت فعال ارائه‌دهنده، مالکیت دورهٔ draft و approval مؤسسه و تأییدکنندهٔ فعال** یک upload session را در bucket خصوصی ایجاد کند؛ هیچ URL/key/bucket/callback از کلاینت نپذیرد.
- امضای هر part را به upload UUID، کلید قرنطینه، part number، اندازه، checksum و TTL محدود کند؛ CORS صرفاً origin اپ را مجاز کند؛ مجوز list/read/delete عمومی ندهد. expiry و quota سراسری با PostgreSQL و rate limiter توزیع‌شده enforce شوند.
- قبل از complete، بخش‌ها را مستقل از اظهارات کلاینت از storage list کند، manifest را بررسی کند، object کامل را سروری از storage verify کند و سپس durable processing job را enqueue کند. اگر storage امکان whole-object SHA ندارد، به digest multipart/ETag اتکا نکند؛ یک stream verifier مستقل لازم است.
- در خطا multipart را abort کند و پس از TTL فایل/part رهاشده را از bucket واقعی حذف کند. سرویس cleanup فعلی تنها برای **ingest پایلوت** و `quarantine/<UUID>` قرارداد DELETE و صف retry دارد؛ نه abortِ multipart و نه cron عملیاتی و نه bucket واقعی متصل شده‌اند.

## صف PostgreSQL (هم‌اکنون در ingest پایلوت متصل)

Migration `0006_dena_processing_queue.sql` جدول `dena_media_processing_jobs` می‌سازد. بعد از انتقال موفق pilot به قرنطینه، درج job در **همان تراکنش** status quarantined انجام می‌شود. Worker داخلی با Bearer مستقل:
- `POST /api/internal/media-jobs/claim` با body `{"limit":1..10}`: `FOR UPDATE SKIP LOCKED`، lease تصادفی ۵ دقیقه‌ای، replay فقط پس از انقضا، سقف ۵ تلاش.
- `POST /api/internal/media-jobs/:uploadId/fail` با `{leaseToken,reason}`: فقط دارندهٔ lease زنده حق retry دارد؛ backoff نمایی ۳۰، ۶۰، ۱۲۰، ۲۴۰ ثانیه و سپس dead-letter.
- lease منقضی‌شدهٔ تلاش پنجم در فراخوانی claim به dead-letter می‌رود؛ ردیف/فایل private باقی می‌ماند تا operator/reaper معتبر آن را بررسی کند. callback اکنون فقط با body دقیق `{leaseToken}`، قفل lease فعال و معتبر را قبول می‌کند. تکرار درخواست بعد از `ready` پاسخ idempotent می‌گیرد؛ نشتی token نباید معادل مجوز انتشار پیش از پردازش باشد.

## گواهی مستقل ورودی و خروجی

`verifyProcessingAttestation` برای قرارداد آینده HMAC-SHA256 (کلید مجزا، `keyId`، نسخه، job UUID، input digest/size، output digest/size/key، scanner/version، verdict و timestamp کوتاه‌عمر) و `verifyProcessedObject` برای HEAD خصوصی برابر digest/size خروجی نوشته و آزموده شده‌اند. **این verifier اکنون به callback پایلوت متصل است**: body تنها `{leaseToken}` است؛ گزارش از origin خصوصی بازخوانی، با کلید HMAC جدا (`DENA_MEDIA_ATTESTATION_HMAC_KEY`) و `keyId` راستی‌آزمایی و سپس metadata HEAD مستقل (size/hash/type/private) برابر خروجی سنجیده می‌شود. بدون سه feature flag و سه secret متمایز، آماده‌سازی خاموش است. شبیه‌ساز CI برای آزمایش تفاوت digestها چهار بایت به خروجی می‌افزاید و با کلید آزمایشی گزارش می‌دهد؛ **این نه transcoding واقعی است، نه antivirus واقعی و نه اثبات اصالت scanner مستقل**. برای production کلید امضا تنها نزد scanner ایزوله، verifier تنها نزد API، private object immutable، rotation/secret manager، AV واقعی و transcoding sandbox لازم‌اند.

## تحویل امن در مقیاس

مسیر دانش‌آموز هنوز session/enrollment/grant را برای هر Range کنترل و از private origin stream می‌کند؛ CDN/edge واقعی فعال نیست. پیش از edge، مجوز کوتاه‌عمر مقید به asset و کاربر/نشست، سیاست no-public-origin، revocation، purge/cache-key خصوصی، replay limit، time skew، race با revoke، مشاهده‌پذیری و تست فشار لازم‌اند. هیچ ادعای ۵ میلیون کاربر هم‌زمان از این تغییر نتیجه نمی‌شود.

## پاک‌سازی پایدار قرنطینه (مرحلهٔ بعد)

Migration `0007_dena_media_cleanup.sql` یک ledger جدا برای cleanup با lease دو دقیقه‌ای، retry نمایی، سقف ۵ تلاش و dead-letter می‌سازد. `POST /api/internal/media-cleanup/run` با `{limit:1..10}` تنها با `DENA_MEDIA_CLEANUP_ENABLED=1` و Bearer اختصاصی `DENA_MEDIA_CLEANUP_TOKEN` (مجزا از origin/worker/signature) اجرا می‌شود. در وضعیت پیش‌فرض خاموش است و **cron یا storage واقعی متصل نشده**؛ اجرا نیازمند trigger عملیاتی امن است.

Sweep فقط `reserved` قدیمی‌تر از ۲۴ ساعت را رد می‌کند، `quarantined` دارای job در dead-letter قدیمی‌تر از ۱ ساعت را رد می‌کند و `rejected` قدیمی‌تر از ۱ ساعت و فاقد asset ساخته‌شده را وارد cleanup می‌کند. `uploading` به‌صورت خودکار حذف نمی‌شود چون ممکن است انتقال طولانی هنوز در حال نوشتن باشد. Cleanup فقط `DELETE /quarantine/<server UUID>` روی origin خصوصی با Bearer سروری می‌زند؛ 204/404 به معنای موفقیت، خطا/timeout به retry پایدار منجر می‌شود. هرگز `/private` یا ویدئوی ready حذف نمی‌شود. CI فقط حذف در mock loopback را می‌سنجد؛ adapter واقعی باید multipartهای ناقص را abort کند، حذف versioned objects را بررسی کند، نوشتن دیرهنگام پس از TTL را منع کند، و وضعیت حذف، audit و alertهای dead-letter را متصل کند.

## Durable dry-run multipart planning (migration 0008)

`POST /api/provider/courses/:courseId/multipart-plans` is **metadata-only** with flag `DENA_MULTIPART_PLANNING_ENABLED=0` by default. For an active provider and still-draft, independently institute-approved course, it records a server-generated UUID, 24-hour expiry, expected size + SHA-256 and idempotency key, then returns a 16 MiB part plan with proposed 15-minute grant TTL. The response has `plan.key=quarantine/<UUID>` but deliberately **NO signed URLs, bucket identifier, storage upload session or part upload endpoints**. It does not accept file bytes. Its 5-GiB bound is a checked *planning contract*, not a functional upload limit. Browser UI and live pilot stay at 8 MiB.

Replay matches all original metadata, refuses any changed owner/content and never refreshes an expired intent. It checks provider role, independent institute approval and active approving institute membership on every replay. Course-level PostgreSQL lock serializes with the pilot reservation; both share a 20-intent pilot/demo quota. Expired plans stop counting but their request IDs cannot be reused. No plan becomes `ready`, queued for processing or visible to a student. Production connection needs reviewed private multipart adapter, controlled abort/list/complete, isolated final SHA verifier, granular grants and redis rate limiting, credential management, late-write fencing and cleanup for incomplete sessions.

## فهرست و لغو امن طرح‌های چندبخشی (migration 0009)

`GET /api/provider/courses/:courseId/multipart-plans` فقط طرح‌های متعلق به همان کاربرِ ارائه‌دهندهٔ فعال را با status و expiry برمی‌گرداند، بدون لینک آپلود یا URL bucket. `POST /api/provider/courses/:courseId/multipart-plans/:uploadId/cancel` فقط با JSON خالی `{}`، origin همسان و مجوز فعال ارائه‌دهنده پذیرفته می‌شود؛ طرح را به وضعیت پایدار `cancelled` و زمان `cancelled_at` می‌برد. تکرار لغو همان status را می‌دهد و طرح منقضی‌شده را زنده نمی‌کند. شناسهٔ درخواست لغوشده نیز قابل استفاده مجدد نیست؛ ایجاد طرح تازه به idempotency UUID جدید نیاز دارد.

برای لغو طرحِ متعلق به خود، تأیید فعال مؤسسه لازم نیست: با لغو نظارت مؤسسه هم ارائه‌دهنده باید بتواند طرح مرده را بی‌اثر کند. اما **صدور/تکرار طرح فعال همچنان approval را در هر درخواست بازبینی می‌کند**. قفل course در تراکنش از دور زدن quota با لغو و رزرو هم‌زمان جلوگیری می‌کند. چون فعلاً هیچ نشست storage یا signed grant صادر نشده، این عملیات فقط metadata را لغو می‌کند؛ زمانی که adapter واقعی متصل شود، باید abort/revoke و late-write fencing در همان چرخهٔ عملیاتی اضافه شود.

## رابط فارسی برنامه‌ریزی حجم بالا

در صفحهٔ ارائه‌دهنده `/provider/courses/:courseId/media`، هنگام روشن بودن **صرفاً** `DENA_MULTIPART_PLANNING_ENABLED` یک کارت مستقل برای ورود عنوان، اندازهٔ دقیق و هش SHA-256 کل فایل، مشاهدهٔ تعداد بخش‌ها/انقضا، فهرست شخصی و لغو طرح فعال نمایش داده می‌شود. فرم عمدی **فایل را انتخاب یا بخشی از آن را به سرور یا storage ارسال نمی‌کند**؛ هش از ابزار محلی مستقل محاسبه می‌شود تا browser در تلاش برای hash کل ۵ GiB به حافظه نیاز نداشته باشد. طرح‌های قبلی بعد از لغو نظارت مؤسسه همچنان مشاهده/لغو می‌شوند؛ ایجاد فقط در draft و approval انجام می‌شود و API بار دیگر بررسی می‌کند. تست مرورگر باید عدم ارسال بایت و لغو idempotent را تأیید کند. این رابط، UI انتشار ویدئو یا direct upload نیست.

## قرارداد حذف همراه با فنس و راستی‌آزمایی جریانی کامل

Cleanup تنها وقتی `DELETE /quarantine/<server UUID>` را موفق می‌داند که origin خصوصی به **هر دو** پاسخ 204 یا 404 هدر `X-Dena-Fenced: 1` بدهد. این اعلام باید به معنی ممنوعیت دائمی PUT جدید و نوشتن‌های دیرهنگام همان UUID باشد؛ 404 بدون tombstone پایدار کافی نیست. در mock CI، PUT حتی پس از DELETE/404 فنس‌شده پاسخ 410 می‌گیرد و بایت‌ها هرگز دوباره ساخته نمی‌شوند؛ شکست 503 یا پاسخ 204 بدون فنس job را در صف retry نگه می‌دارد. این tombstone اکنون صرفاً حافظهٔ mock localhost است و برای production باید در storage adapter/DB پایدار و در برابر restart، multipart و race واقعی atomic باشد.

`verifyQuarantineStream` در `src/server/media/multipart.ts` کل فایل خصوصی را به‌صورت async iterable و SHA-256 افزایشی بدون تجمیع ۵ GiB در حافظه می‌خواند؛ size دقیق، key سرورساخت، private بودن، نوع MP4 و حداقل ftyp را نیز fail-closed بررسی می‌کند. آزمون بیش از ۱۶ MiB و حالت digest نادرست، تغییر انتهای فایل، truncation، بایت اضافه و stream error را می‌پوشاند. این verifier هنوز به مسیر تولیدی `complete multipart` متصل نیست و **به‌تنهایی آنتی‌ویروس یا ترنسکد واقعی نیست**.


## اتصال بررسی بایت واقعی ورودی و خروجی به callback پایلوت

مسیر `completeAttestedIngest` پس از تأیید lease فعال و گواهی HMAC مستقل، علاوه بر HEAD، بایت‌های واقعی قرنطینه را با `GET /quarantine/<UUID>` و بایت‌های واقعی خروجی را با `GET /private/<courseUUID>/<assetUUID>.mp4` می‌خواند. هر دو GET تنها به private origin با Bearer سرور و بدون redirect انجام می‌شوند و digest/size واقعی به‌صورت جریانی با SHA-256 و حدود مورد انتظار چک می‌شود. `Content-Length`، `Content-Type: video/mp4` و `X-Dena-Private: 1` الزامی است. صرفاً گواهی امضاشدهٔ scanner یا HEAD/ETag ادعایی storage، مجوز `ready` نیست. اگر source پس از گزارش تغییر کند یا خروجی درحالی‌که HEAD جعلی مطابق گزارش است، واقعاً تغییر کرده باشد، callback به `conflict` می‌رسد و هیچ asset دانش‌آموزی ایجاد نمی‌شود. خطا یا نبودن GET خصوصی به `unavailable` و قابلیت retry ختم می‌شود.

این اتصال فعلاً به **پایلوت ۸ MiB** محدود است، نه آپلود واقعی ۵ GiB. برای فایل حجیم باید verification را در worker جدا و durable، بیرون از تراکنش طولانی DB انجام داد و object واقعی را immutable/fenced نگه داشت؛ اسکن بدافزار، transcoding و مخزن تولیدی هنوز متصل نیستند. mock localhost برای تست منفی امکان تغییر فایل منبع و spoof کردن پاسخ HEAD خروجی را دارد و به‌هیچ‌وجه الگوی اجرای production نیست.


## پیش‌بررسی بدون قفل و نهایی‌سازی اتمیکِ callback پایلوت

Callback پایلوت ابتدا وضعیت `quarantined` و مالکیت lease پردازنده را **بدون بازکردن تراکنش بلندمدت** preflight می‌کند؛ سپس report و دو stream خصوصی را بیرون تراکنش، با timeout محدود و SHA-256 کامل بررسی می‌کند. مرحلهٔ دوم یک تراکنش کوتاه با قفل ingest/job و بررسی مجدد وضعیت دوره، عضویت ارائه‌دهنده، approval مؤسسه، فعال‌بودن تأییدکننده، یکسان‌ماندن شناسه‌ها و digestهای ثبت‌شده، امضای معتبر گزارش و lease زنده است؛ فقط آن‌وقت `ready` و `done` درج می‌شوند. لغو approval یا انقضای lease در حین GET نمی‌تواند با یک نتیجهٔ preflight قدیمی مجوز انتشار بدهد.

CI با GET خروجیِ تأخیردار روی mock localhost، تأیید می‌کند که لغو نظارت مؤسسه در فاصلهٔ جریان بدون انتظار برای اتمام GET در PostgreSQL ثبت می‌شود و callback به conflict ختم می‌شود؛ سپس با approval معتبر مسیر عادی کامل می‌شود. این به معنی atomic بودن storage واقعی نیست: بایت‌های ورودی/خروجی برای production باید تا پس از انتشار immutable یا version-pinned باشند و verifier بزرگ‌مقیاس باید worker پایدار مستقل داشته باشد. هیچ آپلود مستقیم/چندبخشی، AV یا ترنسکد واقعی با این refactor فعال نشده است.
