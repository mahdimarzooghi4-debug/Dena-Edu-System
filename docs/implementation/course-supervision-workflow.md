# رابطه نظارتی مؤسسه و ارائه‌دهنده به‌ازای هر دوره — دامنه و فرایند واقعی

**وضعیت:** API ایجاد دوره و درخواست نظارت، صف مؤسسه، تصمیم تأیید/رد/لغو و دو صفحه محدود در کد موجودند. جداول و migration در CI روی PostgreSQL 16 موقت تست می‌شوند؛ بدون استقرار PostgreSQL و OTP/SMS واقعی و قراردادهای آموزشی قابل ارائه به کاربران واقعی نیستند. دنا صادرکننده مجوز آموزشی نیست.

## قانون اصلی

**تأیید هویت ارائه‌دهنده/مؤسسه در مرحله درخواست نقش، به‌هیچ‌وجه معادل نظارت بر دوره نیست.** هر دوره یک `providerId` و `responsibleInstituteId` ثابت و یک رکورد وضعیت مستقل `dena_supervision_grants` دارد. فقط `status=approved` همراه شناسه فرد تأییدکننده مؤسسه و زمان تأیید، با تطابق هر سه شناسه، ممکن است مجوز نمای نظارتی ارائه‌دهنده/مؤسسه در همان دوره بدهد.

هیچ API برای پخش ویدئو، ثبت‌نام دانش‌آموز، خرید/پرداخت یا انتشار دوره باز نشده است. `GET /api/courses/:courseId/authorization` فقط **دسترسی نظارتی** را می‌آزماید؛ نباید برای دانش‌آموز، CDN یا streaming token به‌کار رود.

## چرخه وضعیت

`requested → approved → revoked` یا `requested → revoked` (رد درخواست). انتقال `revoked → approved` یا تأیید دوباره همان درخواست ممنوع است؛ تجدیدنظر و ثبت درخواست تازه بر روی همان دوره در این فاز وجود ندارد. برای هر دوره درخواست جداگانه لازم است. نام رویداد رد اولیه `rejected` و لغو تأیید `revoked` است، اما وضعیت نهایی هر دو در جدول جاری `revoked` می‌شود تا سیاست قدیمی fail-closed بماند.

### ارائه‌دهنده

- `POST /api/provider/courses`: `Origin` هم‌دامنه، Better Auth session معتبر و **membership فعال provider با همان `providerId`**. فقط چهار ورودی `providerId`, `responsibleInstituteId`, `title`, `clientRequestId` (UUID) پذیرفته می‌شوند. انتخاب ID در body اختیار نمی‌دهد.
- scope ارائه‌دهنده باید رکورد `verifiedEntities.role=provider` داشته باشد. scope مؤسسه باید `verifiedEntities.role=institute` و یک نماینده فعال **مستقل از همان provider** داشته باشد؛ یک شخص دارای هر دو role نمی‌تواند تنها تأییدکننده درخواست خودش باشد.
- course ID توسط PostgreSQL ساخته می‌شود. ایجاد دوره + رکورد grant در وضعیت requested + audit event در یک transaction ثبت می‌شوند. محدودیت یکتای `(provider_id, client_request_id)` باعث می‌شود تکرار درخواست با پارامترهای یکسان همان course ID را برگرداند، بدون رخداد یا دوره دوم؛ تغییر داده با همان کلید 409 است. UI این کلید را برای retry بدون تغییر فرم حفظ می‌کند.
- `GET /api/provider/courses`: فقط دوره‌های scopeهای provider همان نشست با وضعیت نظارت؛ بدون کاربران/دانش‌آموزان، مرجع مدارک یا محتوای ویدئو.
- `/provider/supervision`: صفحه محافظت‌شده واقعیِ درخواست نظارت و مشاهده وضعیت دوره‌های خود. UI شناسه مؤسسه را از نماینده مؤسسه دریافت می‌کند؛ فعلاً **دایرکتوری عمومی مؤسسات** یا دعوتنامه امضاشده وجود ندارد.

### مؤسسه

- `GET /api/institute/supervision`: فقط فهرست دوره‌های `responsibleInstituteId` مربوط به عضویت‌های فعال مؤسسه، تا ۵۰ رکورد، شامل شناسه دوره و provider و عنوان و وضعیت؛ بدون student PII.
- `/institute/providers`: صفحه واقعی محدود نماینده مؤسسه؛ شناسه scope قابل اشتراک با ارائه‌دهنده را نشان می‌دهد.
- `POST /api/institute/supervision/:courseId/decision`: فقط نماینده مؤسسه مسئول **همان دوره**، role فعال و origin هم‌دامنه. `action:approve|revoke` و `reason` با حداقل ۱۵ و حداکثر ۵۰۰ کاراکتر لازم است؛ role/provider/institute/status/approver از body پذیرفته نمی‌شوند.
- تأیید برای وضعیت requested، لغو برای requested یا approved مجاز است. رد درخواست اولیه رویداد rejected، لغو تأیید رویداد revoked ثبت می‌کند؛ هر تصمیم دوباره 409 است. شخص متقاضی یا نماینده‌ای که خود دارای membership provider **همان دوره** است نمی‌تواند تصمیم بگیرد.
- انتخاب دوره و grant در transaction با row lock، بررسی مجدد role فعال `FOR SHARE`، تطبیق scope، تغییر وضعیت و درج event. با لغو، فیلدهای approval جاری پاک می‌شوند و شواهد تصمیم قبلی در جدول events می‌مانند.

## محافظت دیتابیس و حریم خصوصی

- migration `0003_massive_hobgoblin.sql` داده‌های سازگاری/Idempotency، `dena_supervision_events` و foreign key مرکب `(course_id,provider_id,institute_id)` را اضافه می‌کند؛ حتی UPDATE ناخواسته scope grant به دوره دیگری در PostgreSQL رد می‌شود.
- جدول رویداد فقط از مسیر server-side INSERT می‌گیرد و با FK restrict جلوی حذف تصادفی سوابق را می‌گیرد. **append-only واقعی در production نیازمند کاربر DB محدود INSERT/SELECT و جلوگیری از UPDATE/DELETE یا ذخیره مستقل/WORM است؛ این تغییر به‌تنهایی ضد‌دست‌کاری رمزنگاری‌شده نیست.**
- رکوردهای دستی قدیمی آزمایشی بدون `requestedByProviderUserId` در workflow تصمیم جدید fail-closed هستند؛ صرفاً برای سازگاری fixtureهای پیشین، ستون اضافه‌شده nullable است. قبل از ورود اطلاعات واقعی legacy backfill و تأیید provenance لازم است.
- APIهای لیست حداکثر ۵۰ رکورد دارند؛ cursor pagination و تعامل هم‌زمان میلیون‌ها کاربر باید قبل از scale ملی تکمیل شود. status و scope باید در هر resource/API دیگر نیز دوباره کنترل شوند.

## تست

`tests/e2e/course-supervision-db.spec.ts`: session جعلی/بدون role، provider scope جعلی، مؤسسه ناموجود، origin و field تزریقی؛ دوره مستقل دوم، idempotency تکرار/تغییر؛ رد پیش از approval و رد مؤسسه بیگانه؛ رد reviewer dual-role، الزام دلیل؛ تأیید همان دوره، بلافاصله اثر در authorization و عدم اثر بر دوره دوم؛ revoke و reject و عدم reapprove؛ audit events؛ foreign key مرکب و suspension. مرورگر واقعی درخواست ارائه‌دهنده و تأیید مؤسسه نیز پوشش داده می‌شود.

موارد پیش از عرضه: مدارک و حدود وظایف مؤسسه برای هر دوره، اعلان قابل اتکا، تجدیدنظر، نسخه محتوای تأییدشده، حق انتشار با سیاست جداگانه، ثبت‌نام دانش‌آموز، revocation CDN، audit retention/WORM، DB production/staging و SMS vendor واقعی.
