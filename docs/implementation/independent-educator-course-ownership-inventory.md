# Inventory مالکیت دوره برای همکار مستقل

**وضعیت:** بررسی ایستای کد پیش از طراحی migration؛ هیچ دسترسی دوره‌ای برای همکار مستقل در این مرحله فعال نشده است.

## مرز دادهٔ فعلی

`provider_id` در چند مفهوم متفاوت استفاده می‌شود. مهاجرت نباید همهٔ این موارد را به یک شناسهٔ جدید تبدیل کند:

| سطح | جدول/مفهوم فعلی | معنی و وابستگی |
|---|---|---|
| نقش سراسری | `dena_memberships.provider_id` | scope عضویت تأییدشدهٔ `provider` به `dena_verified_entities`؛ همکار مستقل نباید این عضویت را بگیرد. |
| مالک دوره | `dena_courses.provider_id` | اجباری است و مسیر ساخت دوره، درخواست supervision و بیشتر queryهای ارائه‌دهنده بر آن بنا شده‌اند. `responsible_institute_id` دامنهٔ مؤسسهٔ ناظر دوره است. |
| snapshot نظارت | `dena_supervision_grants.provider_id` و `dena_supervision_events.provider_id` | grant با FK مرکب به `(course_id, provider_id, responsible_institute_id)` دوره وصل است؛ eventها برای ممیزی شناسه‌های تاریخی را نگه می‌دارند. |
| کارهای رسانه | `dena_media_ingests.provider_id` و `dena_media_multipart_plans.provider_id` | درخواست آپلود/پردازش، هویت ارائه‌دهنده و ایجادکننده را ثبت می‌کند؛ کارهای async باید پس از لغو affiliation نیز با scope زمان ایجاد و state فعلی بازبینی شوند. |
| همکاری provider مجاز | `dena_provider_institute_collaborations.provider_id` | رابطهٔ دو `verifiedEntities` برای provider دارای مجوز است و گردش دو مرحله‌ای خودش را دارد؛ مدل همکار مستقل جایگزین یا ورودی این جدول نیست. |
| تدارک هویت | `dena_verified_entities` و `dena_memberships` | مسیر role application برای provider entity و عضویت تأییدشده می‌سازد؛ استفاده از آن برای فرد فاقد مجوز تیک/اختیار نادرست ایجاد می‌کند. |

ستون `account.providerId` در جدول Better Auth مربوط به نام ارائه‌دهندهٔ ورود اجتماعی است و ارتباطی با نقش آموزشی Dena ندارد.

## مسیرهایی که مالکیت را مصرف می‌کنند

### ایجاد و ادارهٔ دوره

- `src/server/courses/workflow.ts`, `src/server/courses/contracts.ts`
- `src/app/api/provider/courses/route.ts`
- صفحات `/provider/courses`, `/provider/courses/[courseId]`, `/provider/courses/[courseId]/assessments`, `/provider/courses/[courseId]/media`
- routeهای API دوره برای `overview`, `publication`, `assessments`, `practice`, `supervision`, `ingest`, `media-ingest` و multipart plans.

این مسیرها معمولاً کاربر را از عضویت `provider` فعال می‌گیرند و `courses.provider_id` را با scope آن عضویت برابر می‌سنجند. برای همکار مستقل باید مجوز جدید فقط در شاخه‌ای صریح و با affiliation فعال به همان `responsible_institute_id` بررسی شود؛ fallback آزاد به course UUID یا مؤسسهٔ مقصد کافی نیست.

### مؤسسه، supervision و آزمون

- `src/server/institute/course-detail.ts`, `dashboard.ts`, `assessment-queue.ts`, `question-bank.ts`
- `src/server/assessments/exam-management.ts`
- `src/app/api/institute/supervision/route.ts`, `/api/institute/courses/[courseId]/*`, `/api/institute/exams/*`

هر دوره همچنان باید supervision مستقل مؤسسه را بگذراند. قبول affiliation، مالکیت یا انتشار دوره را تأیید نمی‌کند. actor مؤسسه باید از membership فعال همان `institute_id` احراز شود.

### دانش‌آموز و دادهٔ خصوصی

- `src/server/student/course-catalog.ts`, `course-detail.ts`, `enroll.ts`, `entitlement.ts`, `course-practice.ts`
- `src/server/assessments/learning-assessment.ts`
- routeهای student برای فهرست/ثبت‌نام، محتوا، پخش رسانه، تمرین و ارزیابی.

مسیرهای دانش‌آموز باید روی scope دوره، مؤسسهٔ مسئول و دسترسی جاری تکیه کنند؛ نباید شناسه یا affiliation مربی را افشا کنند. قطع رابطه باید ایجاد دسترسی عملیاتی تازه را متوقف کند، درحالی‌که تاریخچهٔ ثبت‌نام، تلاش آزمون، audit و مالی حذف یا بازنویسی نشوند.

### رسانه و workerها

- `src/server/media/ingest.ts`, `src/server/media/multipart-control.ts`
- routeهای provider برای ایجاد/cancel ingest و multipart plan، به‌علاوهٔ callbackهای داخلی complete/fail/claim.

هر upload/job باید هنگام claim و finalize دوباره بررسی کند که دوره هنوز مالک معتبر و affiliation فعال دارد. حفظ فقط `provider_id` در job کافی نیست؛ job مستقل به profile و مؤسسهٔ مشخص نیاز دارد. لغو affiliation نباید callback تکراری یا دیررس را به انتشار asset تبدیل کند.

## جهت مدل‌سازی قبل از migration

مدل دوره باید مالک را tagged و انحصاری کند: یا verified provider فعلی، یا `(independent_educator_profile_id, responsible_institute_id)`. در هر دو حالت `responsible_institute_id` ثابت می‌ماند و approval نظارت برای همان دوره لازم است. رابطهٔ فعال در write/read authorization هر بار با DB بررسی می‌شود؛ FK یا snapshot به‌تنهایی وضعیت فعال را تضمین نمی‌کند.

پیش از قطعی‌کردن schema باید تصمیم بگیریم provider-owned courseهای قدیمی چگونه بدون تغییر داده حفظ می‌شوند؛ uniqueness/idempotency درخواست ساخت، supervision grant و event، media jobها و routeهای قدیمی باید برای هر دو owner type صریح شوند. تغییرات باید additive و مرحله‌ای باشند: ابتدا ستون‌ها/قیدهای سازگار با courseهای کنونی، سپس مسیر جدید و تست، و فقط پس از backfill/تطبیق، nullable/constraint نهایی.

برای قطع همکاری، state جاری affiliation در transaction با ساخت/انتشار دوره serialize شود. قاعدهٔ محصول مصوب می‌گوید دورهٔ وابسته به مؤسسه منتقل می‌شود، مربی قبلی دسترسی مدیریتی را از دست می‌دهد و دسترسی دانش‌آموزان فعلی بدون وقفه می‌ماند. بعد از `revoked`:

- انتقال مالکیت جاری به مؤسسهٔ `responsible_institute_id` به‌صورت اتمیک و audit‌شده انجام شود؛
- مربی قبلی دیگر نتواند ساخت/ویرایش، انتشار، ایجاد upload/job یا دسترسی مدیریتی به دوره را انجام دهد؛ مؤسسه پس از انتقال می‌تواند در scope خودش ادامه دهد؛
- content منتشرشده، enrollment/attempt و رویدادهای مالی تاریخی خودکار حذف نشوند؛
- دسترسی دانش‌آموزانی که پیش از انتقال entitlement معتبر دارند حفظ شود. سفارش یا گزارش تاریخی به مالک جدید بازنویسی نشود؛ قواعد فروش/ذی‌نفع سفارش‌های آینده و تسویه پس از انتقال همچنان تا تکمیل سیاست مالی، درگاه و ledger غیرفعال می‌ماند.

## تست‌های لازم برای مرحلهٔ مالکیت

- مهاجرت PostgreSQL تازه و upgrade دادهٔ provider فعلی، با بررسی یکتایی و FKهای composite.
- ساخت و خواندن دو نوع مالک؛ جلوگیری از ارسال هم‌زمان provider/profile ID، institute ID جعلی و client-supplied owner.
- فرد با چند affiliation فقط در دوره‌های همان مؤسسهٔ فعال دسترسی دارد؛ مؤسسهٔ دوم و provider دیگر جداسازی می‌شوند.
- رد/تعلیق عضو مؤسسه، self-review، revoke هم‌زمان با ساخت/انتشار و callback دیررس media.
- regression کامل برای دوره‌ها و media ارائه‌دهندهٔ مجاز.
- student entitlement، تمرین، ارزیابی و پخش، بدون نشت هویت/شناسهٔ مربی؛ نگهداری تاریخچه پس از revoke.
- audit و log مالی تاریخی با snapshot owner type و institute scope؛ بدون فعال‌کردن پرداخت.

## اقدام بعد

این inventory فقط بررسی ایستا است. قبل از تغییر `courses.provider_id`، باید اثر FKها و SQL migrationهای موجود، routeهای واقعی و تست‌های DB موجود را با `rg`/query catalog تطبیق داد؛ سپس migration و design جدید جداگانه review شود. جداسازی مالکیت دوره، پرونده‌ای مستقل از اضافه‌کردن فرم درخواست affiliation است.
