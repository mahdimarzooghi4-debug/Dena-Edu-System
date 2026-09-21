# ثبت‌نام رایگان دانش‌آموز و دسترسی محافظت‌شده به MP4 خصوصی

**وضعیت:** این مرحله API/صفحه واقعی برای دوره رایگان، قرارداد انتشار و مسیر محافظت‌شده MP4 با PostgreSQL و شبیه‌ساز origin خصوصی در CI دارد. به‌معنی اتصال CDN/مخزن واقعی، ingestion/transcoding، محصول پولی یا ظرفیت پنج میلیون همزمان نیست. قابلیت media در `.env.example` خاموش و SMS واقعی نیز نصب نشده است.

## اصل امنیتی

- عضویت `student` فعال، ثبت‌نام `dena_student_enrollments.status=active` همان کاربر/دوره، انتشار `dena_courses.publication_status=published`، نظارت `dena_supervision_grants.status=approved` بر همان `course_id/provider_id/institute_id` و وجود عضویت‌های فعال ارائه‌دهنده، مؤسسه مسئول و **فرد تأییدکننده همان مؤسسه** همگی در هر درخواست مجوز محتوا الزامی‌اند.
- صرف ورود با OTP، شناختن course UUID، کپی‌کردن asset UUID، عضویت ادمین، داشتن نقش ارائه‌دهنده/مؤسسه یا دریافت قبلی فهرست ویدئو مجوز پخش دانش‌آموز نیست. مجوز نظارتی API قبلی یک مفهوم مستقل است.
- رد/لغو نظارت یا تعلیق عضویت student/provider/institute/approver مانع **درخواست جدید** فهرست و هر byte-range بعدی می‌شود؛ داده‌ای که پیش از ابطال به مرورگر منتقل شده را نمی‌توان از دستگاه حذف کرد، و یک stream فعال mid-transfer لزوماً بلافاصله قطع نمی‌شود. cache خصوصی `no-store` و ذخیره‌سازی origin/CDN باید جداگانه ممیزی شود.

## ثبت‌نام و انتشار، فقط رایگان

1. ارائه‌دهنده از `/provider/supervision` دورهٔ دارای تأیید مستقل همان مؤسسه را می‌بیند. `POST /api/provider/courses/:courseId/publication` فقط `{ "action":"publish" }` و Origin هم‌دامنه را می‌پذیرد؛ DB دوباره عضویت provider، grant approved و مؤسسه تأییدکننده فعال را در transaction بررسی می‌کند و وجود حداقل یک `dena_private_media_assets.status=ready` و تنظیم private media را لازم دارد. انتشار مجدد همان دوره idempotent است؛ دورهٔ پیش‌نویس یا لغو نظارت در catalog نمی‌آید.
2. `GET /api/student/courses` حداکثر ۵۰ دورهٔ منتشرشده رایگان با grant approved و دامنه‌های فعال را برمی‌گرداند، با پرچم enrollment محاسبه‌شده از **همان user session**. مشتری role یا `studentUserId` را ارسال نمی‌کند. `/student/courses` رابط RTL فهرست و ثبت‌نام است.
3. `POST /api/student/courses/:courseId/enroll`: body باید دقیقاً `{}` و Origin هم‌دامنه باشد؛ نشست Better Auth + membership دانش‌آموز active از DB لازم است. روی course/grant/member قفل خواندن گرفته می‌شود؛ وضعیت publish/approve و فعال‌بودن roleهای مربوطه مجدداً چک می‌شوند. unique index روی `(student_user_id,course_id)` جلوی ثبت‌نام تکراری حتی در درخواست concurrent را می‌گیرد؛ replay بدون ایجاد رکورد دوم پاسخ می‌دهد. این مسیر پرداخت یا entitlement پولی ایجاد نمی‌کند.
4. `POST /api/student/courses/:courseId/cancel`: فقط صاحب ثبت‌نام می‌تواند آن را لغو کند. وضعیت cancelled نگه داشته می‌شود؛ API ثبت‌نام رایگان آن را خودکار بازفعال نمی‌کند. بازگشت پس از لغو مستلزم گردش‌کار جداگانه/مصوب آینده است.

## ویدئو و پیاده‌سازی حداقلی private origin

- `GET /api/student/courses/:courseId/assets` فقط بعد از احراز مجدد entitlement، عنوان و asset UUID فایل‌های `ready` همان دوره را می‌دهد؛ بدون objectKey، URL انبار، توکن، نام دانش‌آموز یا URL مستقیم CDN.
- `GET /api/student/courses/:courseId/media/:assetId` روی **هر درخواست Range** نشست + عضویت + ثبت‌نام + نظارت + انتشار + وجود asset آماده همان دوره را می‌سنجد و از backend خصوصی با Bearer محرمانه از env می‌خواند. asset key ثبت‌شده در DB باید دقیقاً `<courseUUID>/<assetUUID>.mp4` باشد؛ path، origin یا token از کاربر پذیرفته نمی‌شوند.
- پاسخ موفق فقط `video/mp4` با status 200 یا 206 و headerهای whitelist شامل `Content-Range` است؛ `Set-Cookie`, `Location`, CORS یا URL/credentials origin بازپخش نمی‌شوند. request header `Range` فقط یک byte-range با حد طولی محدود است؛ multipart و header injection رد می‌شوند. GET نامعتبر بدون اطلاعات وجود asset، 404 است؛ بی‌نشست 401؛ نبود origin خصوصی 503. HEAD عمداً 405 است.
- `DENA_MEDIA_ENABLED=0` و نبود `DENA_PRIVATE_MEDIA_ORIGIN_URL/TOKEN` پخش را خاموش می‌کنند. URL origin در محیط واقعی باید HTTPS، بدون userinfo/query/hash/path اضافی باشد؛ HTTP فقط برای mock روی `127.0.0.1` و فقط هنگام `DENA_DB_INTEGRATION=1` مجاز است. **هرگز** این پرچم integration یا mock را در production قرار ندهید.
- private origin **باید خود نیز دسترسی بدون Bearer را رد کند**؛ دسترسی عمومی به فایل‌های object storage/CDN را نباید با حفاظت صرف frontend پوشاند. `controlsList=nodownload` تضمین DRM/عدم ضبط نیست. این reverse proxy اولیه به‌علت انتقال همه بایت‌ها از Next.js **طرح مقیاس ۵ میلیون هم‌زمان نیست**. قبل از عرضه ملی، روش segment-level authorization در CDN/edge، ظرفیت، HLS/DRM در صورت ضرورت، اتصال کوتاه‌مدت، range caching امن و revocation policy باید با تست اثبات شوند.

## ingestion خارج از محدوده این مرحله

هیچ endpoint برای درج `objectKey` یا URL arbitrary از provider/user باز نیست. پایلوت دریافت MP4 محدود اکنون از طریق [قرنطینه و attestation worker](quarantined-media-ingest.md) شروع شده است؛ فقط کاربر provider مجاز می‌تواند metadata حداقلی و بایت‌های کوچک بفرستد و فقط callback مستقل همراه با بررسی مجدد گزارش origin، asset آماده می‌سازد. `dena_private_media_assets` اکنون در مسیر pilot فقط پس از گزارش بازرسی origin و callback داخلی دارای توکن متمایز ساخته می‌شود؛ scanner و transcoder واقعی و اثبات‌پذیری کامل گزارش هنوز باید متصل و آزموده شوند. در این CI فقط fixture ساختگی MP4 با token داخلی localhost تولید شده است. تأیید محتوای نسخه مشخص توسط مؤسسه، استناد به مجوزهای محتوا و انتشار نسخه جدید هنوز باید طراحی شود؛ گردش‌کار دوره این مرحله نباید برای انتشار نهایی محصول تلقی شود.

## ممیزی

`tests/e2e/student-private-media-db.spec.ts` PostgreSQL واقعی موقت + HTTP + مرورگر را آزمون می‌کند: عدم نمایش پیش‌نویس/عدم‌تأیید؛ انتشار مشروط؛ رد role و Origin جعلی؛ ثبت‌نام یکتا/idempotent؛ فهرست asset بدون object key؛ عدم دسترسی دانش‌آموز دیگر، نقش provider و UUID دوره دیگر؛ دریافت bytes با 200/206 Range؛ رد Range چندگانه/HEAD؛ عدم دسترسی مستقیم به origin؛ لغو ثبت‌نام و عدم بازفعال‌سازی؛ تعلیق student و لغو نظارت مؤسسه. `src/server/student/private-media.test.ts` قرارداد env/TLS/Range را در Vitest می‌سنجد. تست شبکه/CDN واقعی انجام نشده است.
