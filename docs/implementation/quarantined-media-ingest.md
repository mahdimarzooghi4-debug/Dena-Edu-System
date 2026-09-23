# دریافت محدود ویدئو، قرنطینه و تأیید مستقل پردازش — pilot

**وضعیت:** این مرحله رزرو/انتقال/تأیید کنترل‌پلین در Next.js و PostgreSQL و شبیه‌ساز origin خصوصی با CI را پیاده کرده است. این **سرویس واقعی اسکن بدافزار، transcoding، object storage، CDN یا pipeline مقیاس ملی نیست**. SMS و storage عملیاتی هنوز فراهم نیستند. قابلیت جدید در `.env.example` به‌صورت پیش‌فرض خاموش است.

## محدوده و قرارداد

- فقط نمایندهٔ فعال `provider` دارای scope دورهٔ **پیش‌نویس**، با نظارت `approved` از مؤسسه مسئول و عضویت فعال تأییدکننده، می‌تواند در `/provider/courses/:courseId/media` درخواست دریافت بدهد.
- `POST /api/provider/courses/:courseId/media-ingest`: body دقیقاً `{title,clientRequestId,expectedBytes,sha256}`. `clientRequestId` باید UUID و `sha256` هگز lowercase ۶۴کاراکتری باشد. **کلید فایل، CDN URL، هویت کاربر، وضعیت آماده یا course provider scope از body پذیرفته نمی‌شود.** شناسه `uploadId` و `assetId` سمت PostgreSQL تولید می‌شوند. یک درخواست به ازای هر `(courseId,clientRequestId)`، idempotency با تطبیق کامل uploader، عنوان، اندازه، digest. سقف ۲۰ درخواست در هر دوره pilot، سقف ۸ MiB برای هر فایل.
- `GET /api/provider/courses/:courseId/media-ingest`: فقط وضعیت درخواست‌های ایجادشده توسط همان نمایندهٔ دارای membership فعال همان scope را می‌دهد؛ digest، objectKey، URL و Bearer خصوصی منتشر نمی‌شوند.
- `PUT /api/provider/courses/:courseId/media-ingest/:uploadId`: محتوای خام `video/mp4`، Content-Length مشخص و حداکثر ۸ MiB، هیچ multipart یا URL کاربر. role و course و همان پرونده درخواست و grant **هنگام انتقال دوباره در DB** کنترل می‌شوند. claim تک‌بار `reserved→uploading` از انتقال concurrent جلوگیری می‌کند؛ header `ftyp`، طول دقیق و SHA-256 محاسبه‌شده از خود بایت‌ها تطبیق داده می‌شود. یک خطا status را `rejected` می‌کند و نیازمند `clientRequestId` تازه است؛ حتی خطای شبکه قرنطینه را به «آماده» تبدیل نمی‌کند.
- سرور فایل را با Bearer سروری به `PUT /quarantine/:uploadId` روی origin خصوصی می‌فرستد. **هرگز فایل quarantined به جدول `dena_private_media_assets` یا مسیر public/student اضافه نمی‌شود.** ذخیره‌سازی قرنطینه و لزوم پاکسازی objectهای رهاشده باید در زیرساخت واقعی پیاده شود.

## اتستیشن مستقل worker

- worker مورد اعتماد پس از **آنتی‌ویروس، اعتبارسنجی نوع/codec، transcoding امن، بررسی خروجی، ذخیره جداگانه خصوصی و قرارداد محتوا** صرفاً `POST /api/internal/media-ingest/:uploadId/complete` با Bearer مستقل `DENA_MEDIA_PROCESSOR_TOKEN` و body دقیقاً `{}` را فراخوانی می‌کند. این کلید با `DENA_PRIVATE_MEDIA_ORIGIN_TOKEN` متفاوت و فقط در secret manager گردش داده شود. صفحه/کوکی ارائه‌دهنده به endpoint worker هیچ اختیاری نمی‌دهد؛ path فقط سیگنال است نه ادعای پاک بودن فایل.
- خود API پس از دریافت سیگنال، با credential origin سروری `GET /inspection/:uploadId` را می‌گیرد و **sha256 ورودی، اندازه، status malware=clean، transcoded=true، format=mp4 و کلید خروجیِ سرورساخت `<courseUUID>/<assetUUID>.mp4`** را کنترل می‌کند؛ سپس `HEAD /private/<key>` باید ویدئوی خصوصی MP4 را تأیید کند. تا آن زمان هیچ `ready` ساخته نمی‌شود.
- با lock پرونده و چک مجدد course draft، grant approved و عضویت‌های provider/approver فعال، درج فایل ready و ثبت `mediaIngests.status=ready` در **یک تراکنش** انجام می‌شود. notification تکراری ready همان نتیجه را می‌دهد. revoked grant، publication قبلی، گواهی ناقص/کاذب یا token نامعتبر همگی fail-closed هستند.
- **هشدار provenance:** قرارداد pilot برای خروجی بدون تغییر bytes (شبیه‌ساز CI) است. pipeline واقعی transcoding معمولاً sha/size خروجی متفاوتی دارد؛ قبل از production باید schema گواهی ورودی/خروجی، hash مستقل خروجی، نسخه پردازشگر، هویت scanner، signature قابل‌اعتبارسنجی و binding قطعی به job را گسترش داد. مقدار `transcoded: true` در شبیه‌ساز هیچ تضمین اسکن/تبدیل واقعی نمی‌دهد.

## مصرف دانش‌آموز و مقیاس

فقط پس از آماده‌شدن asset و تأیید نظارت، `POST /api/provider/courses/:courseId/publication` (و بررسی دوباره provider/approver و media origin) مجاز است؛ سپس catalog دانش‌آموز فقط published و ready می‌بیند. `GET /api/student/courses/:courseId/media/:assetId` همچنان هر Range را با نشست + enrollment + grant دوباره کنترل می‌کند.

این pilot **تمام بایت‌های ۸MiB را در یک instance Next.js در RAM دریافت و سپس به origin ارسال می‌کند**؛ مناسب HLS، upload بزرگ، ۵ میلیون concurrent یا storage/antivirus واقعی نیست. قبل از عرضه باید direct-to-quarantine signed multipart upload با حد اندازه/نوع/TTL و storage policy، اسکن واقعی و صف پردازش durable، dead-letter/timeout recovery، GC پرونده و فایل orphaned، rate limit توزیع‌شده، quota و abuse detection، attestation امضاشده، مانیتورینگ، content moderation و تکمیل CDN/edge auth به همراه load tests طراحی و اجرا شوند. از mock `scripts/test-media-origin.mjs` فقط در `DENA_DB_INTEGRATION=1` روی localhost استفاده کنید و **هرگز** آن را در production مستقر نکنید.

## سقف پاسخ گواهی از origin خصوصی

مسیر callback پس از دریافت گزارش `/inspection/:uploadId`، **پیش از تبدیل پاسخ به JSON** نوع `application/json`، طول واقعی/اعلام‌شده و سقف ۴KiB را کنترل می‌کند؛ پاسخ غیر JSON، خالی، غیرشیء، خراب یا بیش از سقف به رد callback بدون ساخت asset آماده منتهی می‌شود. `src/server/media/inspection-report.test.ts` پاسخ معتبر و موارد منفی را می‌سنجد و CI با mock یک پاسخ حجیم one-shot را آزمایش می‌کند. این فقط محدودیت پردازش گزارش است؛ اصالت محتوا همچنان وابسته به HMAC signer مستقل، بررسی واقعی بایت‌ها و ذخیره‌سازی immutable آینده است.

## CI

`tests/e2e/media-ingest-db.spec.ts`: عدم دسترسی بی‌نشست/student؛ Origin/role/status/object URL تزریقی؛ درخواست idempotent و body conflict؛ رد فایل با hash نادرست؛ role suspension/revoked grant در زمان آپلود؛ دریافت quarantined ولی نبود asset آماده؛ عدم پذیرش notification بدون Bearer یا بدون گزارش بازرسی؛ پردازش mock صریح localhost + تأیید مستقل از origin، ایجاد یک asset و publish/free-enrollment/video byte-range. `src/server/media/ingest.test.ts` default-off، sniff header و تفکیک token worker را بررسی می‌کند. **موفقیت این تست به معنی گذر آزمون scanner واقعی نیست**.


## سخت‌گیری تکمیلی callback در مرحلهٔ بعد
`POST /api/internal/media-ingest/:uploadId/complete` اکنون علاوه بر Bearer worker دقیقاً `{leaseToken: UUID}` می‌خواهد؛ lease باید در جدول صف هنوز فعال باشد. گزارش با `DENA_MEDIA_ATTESTATION_HMAC_KEY` جدا از worker/origin token و `DENA_MEDIA_ATTESTATION_KEY_ID` بررسی می‌شود؛ digest/bytes خروجی و HEAD مستقل الزامی‌اند. توضیح‌های قدیمی همین سند درباره body `{}` و `transcoded: true` فقط تاریخچهٔ پایلوت قبلی‌اند، نه قرارداد فعلی. تست mock هنوز آنتی‌ویروس یا پردازشگر واقعی نیست.
