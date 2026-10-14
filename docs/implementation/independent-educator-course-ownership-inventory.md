# Inventory مالکیت دوره برای همکار مستقل

**وضعیت:** مالکیت نوع‌دار، انتقال به مؤسسه، ساخت پیش‌نویس، دریافت ویدئو در قرنطینه، ساخت/بازبینی ارزیابی یادگیری و تمرین کوتاه، و انتشار رایگان برای همکار مستقل پیاده‌سازی شده‌اند.

## مرز دادهٔ فعلی

`provider_id` در چند مفهوم متفاوت استفاده می‌شود. مهاجرت نباید همهٔ این موارد را به یک شناسهٔ جدید تبدیل کند:

| سطح | جدول/مفهوم فعلی | معنی و وابستگی |
|---|---|---|
| نقش سراسری | `dena_memberships.provider_id` | scope عضویت تأییدشدهٔ `provider` به `dena_verified_entities`؛ همکار مستقل نباید این عضویت را بگیرد. |
| مالک دوره | `dena_courses.owner_type`, `provider_id`, `independent_educator_profile_id` | مالک یکی از verified provider، پروفایل همکار مستقل یا مؤسسه است؛ `provider_id` برای دو نوع دیگر null می‌شود. `responsible_institute_id` scope مؤسسه را نگه می‌دارد. |
| snapshot نظارت | `dena_supervision_grants` و `dena_supervision_events` | grant/event نوع مالک و شناسهٔ مربوط را ثبت می‌کنند. سه FK مستقل provider/profile/institute از اتصال grant به دوره و مؤسسهٔ درست محافظت می‌کنند. |
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

ایجاد پیش‌نویس مستقل از `/api/independent-educator/courses` فقط با affiliation پذیرفته‌شده و عضویت فعال مؤسسهٔ ناظر انجام می‌شود؛ هر پیش‌نویس برای نظارت همان مؤسسه درخواست جدا ثبت می‌کند و فهرست شخصی از مالکیت جاری خوانده می‌شود. دریافت رسانه، ساخت ارزیابی چندسؤالی، تمرین کوتاه و انتشار رایگان نیز scope مستقل دارند؛ course UUID به‌تنهایی مجوز نیست.

ارزیابی چندسؤالی از `/api/independent-educator/courses/:courseId/assessments` و صفحهٔ `/account/independent-educator/courses/:courseId/assessments` مدیریت می‌شود. ایجاد ارزیابی فقط برای مالک مستقلِ دارای عضویت فعال دانش‌آموز، affiliation پذیرفته‌شدهٔ همان مؤسسه و پیش‌نویس تحت نظارت تأییدشده مجاز است. مؤسسهٔ مسئول، سؤال‌ها و کلید را مستقل بازبینی می‌کند؛ درخواست‌کننده نمی‌تواند ارزیابی خودش را تأیید کند. نوشتن هم‌زمان با لغو affiliation با همان قفل ترتیب‌دار رد می‌شود.

انتشار از `/api/independent-educator/courses/:courseId/publication` و دکمهٔ «انتشار دوره» در فضای همکار انجام می‌شود. انتشار به affiliation پذیرفته‌شده، عضویت فعال مالک، supervision تأییدشده با تأییدکنندهٔ فعال، سرویس رسانهٔ خصوصی آماده، دست‌کم یک ویدئوی آماده و نبود تمرین در حال بازبینی نیاز دارد. انتشار با لغو affiliation در یک ترتیب قفل مشترک اجرا می‌شود. دورهٔ منتشرشده فقط در کاتالوگ رایگان دانش‌آموز می‌آید؛ entitlement و تحویل ویدئو دوباره supervision و affiliation جاری را بررسی می‌کنند.

تمرین کوتاه از `/api/independent-educator/courses/:courseId/practice` و صفحهٔ `/account/independent-educator/courses/:courseId/practice` ثبت می‌شود. سؤال و کلید immutable هستند؛ مؤسسهٔ ناظر می‌تواند آن را تأیید یا رد کند و نویسنده حتی اگر عضو همان مؤسسه باشد قادر به بازبینی سؤال خودش نیست. صف بازبینی مؤسسه نیز grant نوع‌دارِ همکار مستقل را دنبال می‌کند. دانش‌آموز فقط سؤال تأییدشده را می‌بیند و API پاسخ، کلید را افشا نمی‌کند.

### مؤسسه، supervision و آزمون

- `src/server/institute/course-detail.ts`, `dashboard.ts`, `assessment-queue.ts`, `question-bank.ts`
- `src/server/assessments/exam-management.ts`
- `src/app/api/institute/supervision/route.ts`, `/api/institute/courses/[courseId]/*`, `/api/institute/exams/*`

فهرست و جزئیات پنل مؤسسه اکنون دوره‌های provider-owned، independent-owned و institute-owned را با scope فعال همان مؤسسه می‌خوانند. قبول affiliation به‌تنهایی مالکیت یا انتشار دوره را تأیید نمی‌کند؛ انتقال پس از revoke course و grant را به مؤسسه تغییر می‌دهد. actor مؤسسه از membership فعال همان `institute_id` احراز می‌شود.

### دانش‌آموز و دادهٔ خصوصی

- `src/server/student/course-catalog.ts`, `course-detail.ts`, `enroll.ts`, `entitlement.ts`, `course-practice.ts`
- `src/server/assessments/learning-assessment.ts`
- routeهای student برای فهرست/ثبت‌نام، محتوا، پخش رسانه، تمرین و ارزیابی.

مسیرهای دانش‌آموز باید روی scope دوره، مؤسسهٔ مسئول و دسترسی جاری تکیه کنند؛ نباید شناسه یا affiliation مربی را افشا کنند. قطع رابطه باید ایجاد دسترسی عملیاتی تازه را متوقف کند، درحالی‌که تاریخچهٔ ثبت‌نام، تلاش آزمون، audit و مالی حذف یا بازنویسی نشوند.

### رسانه و workerها

- `src/server/media/ingest.ts`, `src/server/media/multipart-control.ts`
- routeهای provider برای ایجاد/cancel ingest و multipart plan، به‌علاوهٔ callbackهای داخلی complete/fail/claim.

مسیرهای ingest و multipart فعلاً provider-only هستند و مالکیت مستقل/مؤسسه‌ای برای آپلود فعال نشده است. توسعهٔ بعدی باید در هر job نوع مالک، پروفایل و مؤسسهٔ scope را ثبت و هنگام claim/finalize دوباره اعتبارسنجی کند؛ callback دیررس نباید پس از انتقال مالکیت asset را منتشر کند.

## مدل مالکیت و انتقال پیاده‌شده

مدل دوره مالک را tagged و انحصاری می‌کند: `verified_provider`, `independent_educator` یا `institute`. FKهای scoped جداگانه و check constraintها از ناسازگاری owner IDs جلوگیری می‌کنند. رابطهٔ فعال در authorization همچنان باید از DB بررسی شود؛ FK یا snapshot به‌تنهایی وضعیت فعال affiliation را تضمین نمی‌کند.

دادهٔ providerهای قبلی با مقدار پیش‌فرض `verified_provider` حفظ می‌شود. مسیر provider-only برای مالکیت‌های دیگر fail-closed است. media jobها و ایجاد دوره هنوز برای دو owner دیگر نیازمند توسعه‌اند.

برای قطع همکاری، دوره‌های متعلق به همان پروفایل و مؤسسه در تراکنش revoke به مؤسسه منتقل می‌شوند. رویداد مالکیت و audit ثبت می‌شود، supervision grant با وضعیت فعلی حفظ می‌شود و دسترسی دانش‌آموزان فعلی ادامه دارد. تست DB/HTTP این مسیر را پوشش می‌دهد.

- پیاده‌سازی‌شده: انتقال مالکیت جاری به مؤسسهٔ `responsible_institute_id` به‌صورت اتمیک و audit‌شده؛
- پیاده‌سازی‌شده: مربی قبلی از مسیرهای provider دسترسی نمی‌گیرد؛ فهرست/جزئیات مؤسسه و entitlement کاتالوگ دانش‌آموز پس از انتقال کار می‌کند؛
- پیاده‌سازی‌شده: محتوای منتشرشده و enrollment دانش‌آموز حذف نمی‌شود؛
- هنوز لازم: serialize کامل revoke با مسیرهای ایجاد/ویرایش و callbackهای media، چون pipeline مستقل هنوز ساخته نشده است؛
- فروش/ذی‌نفع سفارش آینده، refund، ledger و تسویه غیرفعال می‌مانند تا سیاست مالی و درگاه تکمیل شوند.

## تست‌های موجود و کارهای باقی‌مانده

- CI migration روی PostgreSQL تازه، regression FKهای provider-scope و تست DB/HTTP revoke موفق است.
- CI بررسی می‌کند دورهٔ منتقل‌شده در پنل مؤسسه و فهرست/جزئیات دانش‌آموز دیده شود و entitlement موجود باقی بماند.
- پیاده‌سازی‌شده: API/UI ایجاد پیش‌نویس مستقل، دریافت ویدئو و ارزیابی چندسؤالیِ محدود به affiliation؛ صف بازبینی همان مؤسسه برای ارزیابی مستقل و تست HTTP/DB در CI.
- پیاده‌سازی‌شده: انتشار رایگان دوره با کنترل‌های مالکیت/affiliation و نمایش در کاتالوگ دانش‌آموز؛ تست PostgreSQL/HTTP مسیر انتشار و کاتالوگ در CI.
- پیاده‌سازی‌شده: تمرین کوتاه، صف و تصمیم مستقل مؤسسه، رد self-review و پوشاندن answer key برای دانش‌آموز؛ تست PostgreSQL/HTTP مسیر author/review/enrollment.
- پیاده‌سازی‌شده: regression انتهابه‌انتها که callback رسانه را هنگام خواندن خروجی متوقف می‌کند، همکاری را revoke و دوره را منتقل می‌کند، سپس ثابت می‌کند callback دیررس asset آماده منتشر نمی‌کند.
- باقی‌مانده: multipart در صورت گسترش سقف فایل و بازبینی مرحله‌ای باقی مسیرهای owner-aware.
- رویداد انتقال و audit ثبت می‌شوند؛ دادهٔ مالی تاریخی دست‌کاری نمی‌شود و پرداخت جدید فعال نیست.

## اقدام بعد

گام کدنویسی بعدی، بازبینی باقی مسیرهای owner-aware است. ساختار affiliation و انتقال به مؤسسه دیگر نیازمند migration طراحی‌شدهٔ مجدد نیست.
