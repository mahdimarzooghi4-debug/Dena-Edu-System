# تحویل وضعیت دنا و گیت پیکربندی انتشار — ۱۴۰۵/۰۷/۰۱

## وضعیت تأییدشده در GitHub

- مخزن: `mahdimarzooghi4-debug/Dena-Edu-System`، شاخه `chore/bootstrap-dena-stack`، Draft PR شماره ۱.
- سامانه فارسی RTL با نقش‌های student/institute/provider/admin/organization/benefactor و پشتیبانی فنی مشترک؛ Next.js 16, React 19, TS, Tailwind 4, PostgreSQL/Drizzle, Better Auth؛ پیش‌نمایش Figma و پوسته موبایل/دسکتاپ.
- ورود OTP فقط با mock CI یا adapter عمومی خاموش؛ اعطای دانش‌آموز با مالکیت شماره؛ نقش‌های ممتاز با درخواست، تأیید ادمین مستقل، scope سرورساخت و ممیزی؛ ادمین production از خوداظهاری ایجاد نمی‌شود.
- نظارت مؤسسه **برای هر دوره**، درخواست provider/تأیید مستقل مؤسسه/رد/لغو؛ ثبت‌نام **فقط دوره رایگان** پس از انتشار، grant approved و آماده بودن media، بررسی session و enrollment هنگام هر Range؛ stream از مسیر محافظت‌شده Next.js، نه CDN.
- Pilot ingest ۸ MiB: رزرو idempotent، SHA-256 و header MP4، قرنطینه، صف پایدار processing با claim/lease/retry/dead-letter، HMAC گواهی source/output و بررسی streaming واقعی، callback با lease؛ پاکسازی quarantine با lease/retry/fence ضد late writes؛ mock فقط localhost در CI.
- Dry-run multipart برای فایل >۱۶ MiB تا سقف قراردادی ۵ GiB: برنامه ۱۶ MiB، ذخیره metadata/idempotency، expiry و cancel؛ **هیچ storage grant، presigned URL یا آپلود حجیم واقعی صادر نمی‌شود**. مسیر گواهی AV/transcode/CDN/object storage production متصل نیست.
- Migrationهای Drizzle از ۰۰۰۰ تا **۰۰۰۹** ثبت شده‌اند و اجرای موفق قبلی GitHub Actions `35643793599` برای foundation و PostgreSQL integration هر دو سبز است.
- هدف ۵M concurrent، **صرفاً هدف ظرفیت**؛ نه benchmark یا تعهد خدمت اثبات‌شده.

## گیت جدید بررسی پیکربندی

`npm run check:release-config` یک بررسی **ایستا** و بدون اتصال شبکه/دیتابیس است. هیچ توکن، URL دارای password یا fingerprint راز را چاپ نمی‌کند؛ فقط نام متغیر و کد خطا را می‌نویسد. حالت CI (`DENA_DB_INTEGRATION` غیر از `0`)، نبودِ `NODE_ENV=production`، localhost یا HTTP در auth/SMS/media، خاموش‌بودن یکی از سرویس‌های OTP/media/ingest/processor/attestation/cleanup، تنظیم ناقص یا رازهای مشترک میان سرویس‌ها باعث nonzero exit می‌شود. `DATABASE_URL` نیز باید دیتابیس و میزبان غیر loopback، تنها یک `sslmode=verify-full` و بدون پارامتر مبهم `ssl` یا `host` داشته باشد؛ `require`/`verify-ca` یا حالت پیش‌فرض کافی نیستند. تنظیم `NODE_TLS_REJECT_UNAUTHORIZED=0` نیز ممنوع است و میزبان loopback شامل همهٔ `127/8` و `[::1]` رد می‌شود. این فقط کنترل **رشتهٔ اتصال و محیط** است، نه handshake یا اعتبارسنجی عملیاتی CA، نام گواهی و سیاست pooler؛ تست اتصال TLS به محیط واقعی همچنان گیت مستقل است.

این profile برای **انتشار تمام قابلیت‌های بررسی‌شده** تعریف شده است؛ برای عرضه محدود صرفاً مطالعه/پیش‌نمایش که SMS یا ingest لازم ندارد، به جای دورزدن شرط‌ها یک پروفایل محدود جدا با تصمیم مصوب تعریف شود.

**عبور از اسکریپت به معنی تأیید production نیست.** اسکریپت نمی‌تواند واقعی‌بودن vendor، AV، نگهداری داده، رضایت‌نامه والد، رمزنگاری DB در شبکه، bucket ACL، immutability نسخه فایل، HLS/CDN revocation، حذف داده، بار ۵M، پایداری SMS، بودجه یا مجوز مؤسسه را ثابت کند؛ هیچ real credential در repo commit نشود. سناریوهای unit test از secretهای ساختگی استفاده می‌کنند.

## تصمیم‌ها و کارهای باز

- انتخاب ارائه‌دهنده SMS واقعی، اجرای تست منطقه ایران، خرید/تنظیم credentials.
- PostgreSQL production با TLS، backup + restore drill، least-privilege roles، immutability/audit policy و bootstrap اولین ادمین با approval مستقل.
- private object store HTTPS واقعی با key/version immutable، signed multipart storage adapter، scanner/transcoder ایزوله با اصل least privilege، attestation provenance و خط‌مشی content moderation.
- تقویت محدودیت‌ها و rate limiting توزیع‌شده برای role/enrollment/upload، retry worker, cron GC، edge/CDN token + revoke، load test و ظرفیت واقعی.
- پنل‌های کامل، آزمون/تمرین، ویدئوی حجیم، پرداخت/صندوق، تیکت، بررسی حقوقی/حریم خصوصی دانش‌آموزان و QA فریم‌های اختصاصی Figma.

## تقویت پاسخ پخش ویدئو (بدون CDN)

مسیر محافظت‌شدهٔ MP4 علاوه بر session/enrollment/grant، پیش از ارسال بایت header خصوصی، نوع MP4، طول عددی امن و هم‌خوانی `Content-Range`، محدودهٔ درخواست‌شده و طول پاسخ 206 را می‌سنجد. در 200، `Content-Range` اضافی رد می‌شود. mock فقط CI با endpoint محرمانهٔ one-shot، پاسخ 206 با بازه غلط را تولید می‌کند؛ آزمون HTTP تأیید می‌کند proxy 503 می‌دهد و Range بعدی سالم است. این اعتبارسنجی **بررسی SHA-256 هر stream دانش‌آموز یا تضمین نسخه immutable نیست**، CDN/edge و ۵M همچنان گیت بازند.

## هم‌راستایی کنترل مقصد سرویس‌های بیرونی

`src/server/ops/unsafe-service-host.ts` بررسی hostname آشکارا ناامن (localhost، loopback، unspecified، IPv4-mapped و link-local 169.254/16 و fe80::/10) را میان آداپتور SMS و origin ویدئو مشترک می‌کند. `scripts/release-preflight.mjs` کنترل ایستای متناظر را نیز دارد؛ تست‌های مثبت امکان استفاده از IP خصوصی RFC1918 برای origin داخلی را حفظ می‌کنند. **این کنترل بررسی DNS، IP واقعی اتصال، فایروال/egress، شبکه خصوصی واقعی یا vendor نیست** و به معنی آماده‌شدن SMS یا object store نیست.

## تأیید صریح پاسخ SMS

آداپتور سروری OTP اکنون صرف HTTP 2xx را موفق تلقی نمی‌کند: بدنهٔ JSON با `accepted: true` بولی، `Content-Type: application/json` و سقف ۱۰۲۴ بایت لازم است؛ خطای vendor، JSON خراب، بدنه خالی یا بزرگ به خطای عمومی fail-closed منجر می‌شود. این قرارداد قابل تعویض برای gateway آینده است؛ mock CI تنها پذیرش مصنوعی را اثبات می‌کند، نه تحویل موبایلی اپراتور. تست‌های Vitest مثبت/منفی، محدودیت پاسخ و خطای sanitize را بررسی می‌کنند.

## محدودسازی پاسخ attestation origin

مسیر completion ویدئو گزارش JSON origin خصوصی را اکنون با سقف ۴KiB و کنترل Content-Type و طول اعلام‌شده/دریافت‌شده پیش از `JSON.parse` می‌خواند؛ گزارش بزرگ/نامعتبر asset آماده ایجاد نمی‌کند. Vitest و سناریوی localhost/PostgreSQL رفتار fail-closed و آزمون ادامهٔ پردازش سالم را می‌پوشانند. این کنترل به‌معنی واقعی‌بودن AV/transcode، امنیت signer یا immutability نیست.

## راهنمای ادامه برای چت جدید

از **head جدید PR #1** و آخرین CI آن شروع کنید، نه snapshotهای قدیمی. ابتدا `README.md`، `docs/implementation/quarantined-media-ingest.md`، `docs/implementation/scalable-media-foundation.md`، `docs/implementation/free-student-enrollment-private-video.md`، `src/server/media/{ingest,multipart,cleanup}.ts`، `src/db/schema.ts` و `drizzle/meta/_journal.json` را بررسی کنید. تغییر واقعی روی `chore/bootstrap-dena-stack` انجام دهید، migration را با Drizzle تولید و commit و هر دو job CI را تا green بررسی کنید. هیچ قابلیت fake scanner، upload حجیم یا ظرفیت ۵M را production ننامید.

## سخت‌سازی انتقال OTP به gateway

آداپتور `src/server/auth/phone.ts` اکنون gateway URL خراب یا دارای userinfo/query/fragment را رد می‌کند و با `redirect: "error"` امکان دنبال‌کردن ۳۰۷/۳۰۸ و بازفرستادن body حاوی شماره/OTP را می‌بندد. خطای network/redirect یا پاسخ غیر 2xx فقط خطای عمومی می‌دهد؛ URL، token، OTP، شماره یا متن خطای vendor منعکس نمی‌شود. `src/server/auth/phone.test.ts` این مرزها را با fixture ساختگی می‌سنجد. این کار **اتصال SMS واقعی یا راستی‌آزمایی vendor نیست**؛ آداپتور و flag پیش‌فرض همچنان خاموش‌اند. اعتبارسنجی runtime همچنین HTTPS loopback، IPv4-mapped، unspecified و link-local 169.254/16 را رد می‌کند؛ mock CI فقط `http://127.0.0.1` می‌ماند. تست HTTP واقعی localhost تأیید می‌کند redirect 307 فقط gateway را فراخوانی می‌کند و مقصد دوم OTP دریافت نمی‌کند. DNS rebinding، دسترسی شبکهٔ خروجی و انتخاب vendor باید مستقل بررسی شوند.
