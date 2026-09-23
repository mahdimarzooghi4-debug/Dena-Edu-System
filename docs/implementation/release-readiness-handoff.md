# تحویل وضعیت دنا و گیت پیکربندی انتشار — ۱۴۰۵/۰۷/۰۱

## مرحلهٔ فعلی پروژه

**پایلوت فنی متصل به PostgreSQL و آماده‌سازی برای staging کنترل‌شده**: گردش‌کار محدود هویت، بررسی نقش، تأیید نظارت دوره، ثبت‌نام رایگان و ویدئوی قرنطینه‌ای/خصوصی در CI موقت آزمایش می‌شود. این «MVP عرضه‌شده» یا «production-ready» نیست؛ اتصال vendor، زیرساخت واقعی، حقوق و حریم خصوصی و آزمون بار هنوز مانده‌اند.

## وضعیت تأییدشده در GitHub

- مخزن: `mahdimarzooghi4-debug/Dena-Edu-System`، شاخه `chore/bootstrap-dena-stack`، Draft PR شماره ۱.
- سامانه فارسی RTL با نقش‌های student/institute/provider/admin/organization/benefactor و پشتیبانی فنی مشترک؛ Next.js 16, React 19, TS, Tailwind 4, PostgreSQL/Drizzle, Better Auth؛ پیش‌نمایش Figma و پوسته موبایل/دسکتاپ.
- ورود OTP فقط با mock CI یا adapter عمومی خاموش؛ اعطای دانش‌آموز با مالکیت شماره؛ نقش‌های ممتاز با درخواست، تأیید ادمین مستقل، scope سرورساخت و ممیزی؛ ادمین production از خوداظهاری ایجاد نمی‌شود.
- نظارت مؤسسه **برای هر دوره**، درخواست provider/تأیید مستقل مؤسسه/رد/لغو؛ ثبت‌نام **فقط دوره رایگان** پس از انتشار، grant approved و آماده بودن media، بررسی session و enrollment هنگام هر Range؛ stream از مسیر محافظت‌شده Next.js، نه CDN.
- Pilot ingest ۸ MiB: رزرو idempotent، SHA-256 و header MP4، قرنطینه، صف پایدار processing با claim/lease/retry/dead-letter، HMAC گواهی source/output و بررسی streaming واقعی، callback با lease؛ پاکسازی quarantine با lease/retry/fence ضد late writes؛ mock فقط localhost در CI.
- Dry-run multipart برای فایل >۱۶ MiB تا سقف قراردادی ۵ GiB: برنامه ۱۶ MiB، ذخیره metadata/idempotency، expiry و cancel؛ **هیچ storage grant، presigned URL یا آپلود حجیم واقعی صادر نمی‌شود**. مسیر گواهی AV/transcode/CDN/object storage production متصل نیست.
- ده migration ثبت‌شدهٔ Drizzle از ۰۰۰۰ تا **۰۰۰۹** روی PostgreSQL موقت در CI اعمال می‌شوند. آخرین head و نتیجهٔ نهایی هر دو job از صفحهٔ Draft PR/Actions همان head بررسی شود؛ runهای قدیمی مبنای تأیید تغییر جدید نیستند.
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

## نخستین صفحهٔ خانه عملیاتی دانش‌آموز

`/student` اکنون به‌جای 404 یک خانهٔ RTL محافظت‌شده و متصل به PostgreSQL است: session معتبر + نقش فعال لازم است؛ فقط دوره‌های ثبت‌نام‌شدهٔ خود شخص با دسترسی معتبر جاری نشان داده می‌شوند، و لینک `/student/courses/:id/watch` مجوز مستقل دارد. فهرست ۲۰ مورد اخیر است، نه ادعای همهٔ داده‌ها؛ تمرین/آزمون/رشد، سایر پنل‌ها و SMS عملیاتی همچنان کار باز هستند. دسترسی ناشناس، فاقد نقش، لغو ثبت‌نام و قطع نظارت در HTTP/Playwright پوشش داده می‌شوند؛ لینک ورود از `/account` اضافه شده و پیش‌نمایش عمومی بدون داده مانده است.

## خانهٔ محدود واقعی ارائه‌دهنده

`/provider` با نشست و نقش فعال scoped، تا ۲۰ دورهٔ متعلق به providerهای همان کاربر را با وضعیت واقعی نظارت و انتشار از PostgreSQL نشان می‌دهد. لینک قرنطینه فقط برای دورهٔ پیش‌نویس با نظارت approved ظاهر می‌شود و مسیر آپلود خود مجوز را دوباره می‌سنجد؛ وضعیت revoked در خانه دیده می‌شود اما لینک آپلود نمی‌گیرد. کاربر غیرمجاز به دادهٔ سایر ارائه‌دهندگان نمی‌رسد. لینک از `/account` اضافه شده؛ آزمون HTTP و Playwright مسیر ناشناس، نقش دیگر، تفکیک scope، requested/approved/revoked و ناوبری را پوشش می‌دهد. این بخش هنوز پنل کامل ارائه‌دهنده یا تأیید scanner/انتشار عملیاتی نیست.

## خانهٔ محدود واقعی مؤسسه

`/institute` با Better Auth + نقش institute فعال و scope سروری، ۲۰ رابطهٔ نظارت اخیر از مؤسسه‌های متعلق به کاربر را نشان می‌دهد. وضعیت‌های requested/approved/revoked در PostgreSQL خوانده می‌شوند؛ pending به `/institute/providers` ارجاع می‌شود، نه تأیید خودکار. تست مرورگر/HTTP شامل ناشناس، نقش بیگانه، مؤسسهٔ بیگانه، تعلیق و تغییر واقعی تصمیم است. صفحات پیش‌نمایش همچنان عمومی/بدون داده و پنل کامل مؤسسه (تمرین، یادگیری، پروفایل) عملیاتی نشده است.

## خانهٔ محدود واقعی مدیر

`/admin` اکنون با session + نقش admin فعال، شمار pending واقعی و ۱۰ درخواست قدیمی‌تر با دادهٔ حداقلی را از PostgreSQL نمایش می‌دهد؛ صف بررسی مستقل `/admin/role-applications` و ممنوعیت بررسی پروندهٔ خود مدیر پابرجاست. پروندهٔ تأیید/رد شده در درخواست بعدی خانه از فهرست pending حذف می‌شود. در HTTP/Playwright ناشناس، دانش‌آموز، عضویت معلق، گردش‌کار واقعی و عدم افشای مرجع مدارک آزموده می‌شوند. این خانه پنل کامل ادمین نیست؛ اولین ادمین عملیاتی و بررسی حقوقی و audit استقرار بازند.

## خانهٔ محدود واقعی سازمان

`/organization` و `/api/organization/overview` اکنون فقط پس از session و membership فعال سازمان، نام و زمان بررسی scopeهای سازمانی واقعی خود کاربر را از join با `verifiedEntities.role=organization` می‌خوانند. متقاضی پیش از approval دسترسی ندارد؛ نقش دیگر، سازمان دیگر، scope به نوع اشتباه و عضویت معلق نتیجه‌ای دریافت نمی‌کنند. مستندات محرمانهٔ تأیید، دادهٔ دانش‌آموز، تخصیص دوره، سفارش و آمار جعلی نمایش داده نمی‌شوند. لینک خانه از `/account` اضافه و سناریوی role approval/HTTP/Playwright تست شده است. سازمان هنوز پنل کامل استفاده/اعضا/سفارش ندارد؛ review حقوقی و privacy همچنان باز است.

## خانهٔ محدود واقعی خیر و حامی

`/benefactor` و `/api/benefactor/overview` با نشست و نقش فعال خیر، فقط entityهای واقعیِ با `role=benefactor` و `benefactor_id` متعلق به کاربر را از PostgreSQL می‌خوانند؛ نام و زمان بررسی داخلی دیده می‌شوند نه مدرک، نام بازبین، هویت دریافت‌کننده، مبلغ ساختگی یا صندوق. API خواندنی `no-store` است؛ آزمون PostgreSQL/HTTP/Playwright پیش و پس از بررسی ادمین، جداسازی دو خیر، scope از نوع organization، تعلیق و ناوبری را پوشش می‌دهد. صندوق حمایت/پرداخت/رسید و audit مالی و حریم خصوصی دریافت‌کننده همچنان پیاده‌سازی/استقرار نشده است. این ششمین **خانهٔ محدود نقش** است، نه تکمیل شش پنل و بک‌اند کل محصول.

## گسترش واقعی فهرست یادگیری دانش‌آموز

کاتالوگ `/api/student/courses` اکنون `q` عنوان و `mine=1` ثبت‌نام خود فرد با `nextCursor` مقید به فیلتر دارد؛ از سقف ۵۰ دورهٔ اولیه فراتر می‌رود و در هر درخواست ۲۰ دورهٔ با حق دسترسی فعلی برمی‌گرداند. UI `/student/courses` جست‌وجو، حالت بی‌نتیجه و «نمایش دوره‌های بیشتر» دارد. `src/server/student/course-catalog.ts` از `listedFreeCourse` مشترک با watch استفاده می‌کند؛ همهٔ صفحه‌ها دوباره permission را می‌سنجند. تست PostgreSQL/Playwright ۵۲ دوره، wildcard به‌صورت literal، سرچ شخصی با ثبت‌نام دو دانش‌آموز و سه صفحه را بررسی می‌کند. این **پیشرفت فهرست دوره** است نه ثبت پیشرفت تماشای ویدئو، آزمون یا آموزش کامل؛ Full-text فارسی، snapshot سراسری، ایندکس‌ها و load testing باز هستند.

## ثبت علامت واقعی ویدئوی انجام‌شده به انتخاب دانش‌آموز

`0010_dena_student_video_completions` و snapshot جدید به دیتابیس افزوده شده‌اند: رکورد یکتای student/asset با زمان ثبت. فقط دانش‌آموز دارای enrollment فعال و دسترسی جاری به ویدئوی ready و نظارت معتبر می‌تواند روی endpoint خصوصی completion علامت ایجاد/حذف کند؛ تکرار POST idempotent است و GET manifest فقط boolean وضعیت متعلق به خود او را نشان می‌دهد. در صفحهٔ watch امکان تغییر و شمارش صرفاً ویدئوهای نمایش‌داده‌شده فراهم است. این **self-report** است نه proof of watch یا آزمون/امتیاز/مدرک؛ گزارش رسمی، ارزیابی و tracking خودکار همچنان کار بازند. تست مرورگر/HTTP مالکیت، ذخیره در DB، تکرار، لغو علامت، لغو ثبت‌نام و نظارت/عضویت را بررسی می‌کند.

## نمای واقعی پیگیری شخصی دانش‌آموز

`src/server/student/progress-overview.ts` اکنون آمار DB-backed ویدئوهای `ready` و علامت‌های self-report همان دانش‌آموز را در هر دورهٔ دارای ثبت‌نام فعال و مجوز واقعی محاسبه می‌کند (حداکثر ۲۰ دورهٔ اخیر، عدد تجمعی فقط برای همان ۲۰ دوره). `/student/progress` و `/api/student/progress` برای student فعال و session محافظت شده‌اند؛ نقش دیگر و مهمان دسترسی ندارند. لینک از `/account` و خانهٔ `/student` برقرار است. رکورد لغوشده یا withdrawn یا نظارت revoked از خروجی فعلی حذف می‌شود، ولی این شمارش **اثبات ویدئوی دیده‌شده یا درصد پیشرفت/نمرهٔ خودکار نیست**؛ آزمون و گزارش یادگیری رسمی هنوز بازند. پوشش DB/Playwright برای دو کاربر، حالت خالی و بازخوانی پس از mark/unmark و لغو مجوز افزوده شد.

## یادداشت خصوصی ویدئو

`0011_dena_student_video_notes` + snapshot/journal با قید یکتای کاربر/asset و متن ۱ تا ۲۰۰۰ نویسه افزوده شد. PUT/DELETE note فقط با session و نقش دانش‌آموز فعال و حق دیدن همان ویدئوی آماده، Origin معتبر و JSON محدود کار می‌کند؛ manifest/watch فقط note صاحب همان دانش‌آموز را نشان می‌دهند، گزارش aggregate و پنل سایر نقش‌ها متن را انتخاب نمی‌کنند. UI فارسی ثبت، ویرایش، بارگذاری مجدد و حذف متن مستقل از completed را دارد. HTTP/Playwright رد unauthenticated/foreign/not-enrolled/wrong asset/withdrawn/revoked/cancelled و سوءاستفاده از Origin/طول متن را می‌سنجد. برای production هنوز retention/erasure والدین و کودکان، رمزنگاری داده در rest و ارزیابی حریم خصوصی لازم است؛ یادداشت، تکلیف یا مکاتبه با مربی نیست.

## پاک‌سازی خودخواستهٔ یادداشت ویدئو

`/student/privacy` و `GET/DELETE /api/student/private-notes` تنها بعد از نشست و نقش دانش‌آموز فعال کار می‌کنند؛ شمار رکوردهای یادداشت همان کاربر را حتی برای courseهای revoked یا enrollmentهای cancelled برمی‌گردانند، بدون متن/UUID noteها. حذف فقط با Origin هم‌دامنه و confirmation دقیق انجام می‌شود؛ صفحه نیز تایپ عبارت فارسی و دکمهٔ صریح می‌خواهد. رکورد یادداشت همان user از PostgreSQL فعال پاک می‌شود؛ completion و دادهٔ دیگر دانش‌آموزان دست‌نخورده می‌مانند. در HTTP/Playwright ناشناس/نقش دیگر، body غلط و userId تزریقی، Origin بیگانه، متن محرمانه در صفحه و پاک‌کردن یادداشت دو دانش‌آموز پس از قطع دسترسی بررسی شده است. این **حذف یادداشت از DB فعال** است، نه انطباق حقوقی کامل، پاک‌سازی backup یا حذف همهٔ داده‌های حساب؛ فرآیند درخواست دانش‌آموز تعلیق‌شده و تأیید والد همچنان مورد بررسی است.

## صفحهٔ معرفی واقعی دورهٔ رایگان قبل از ثبت‌نام

`src/server/student/course-detail.ts` فقط برای student فعال و همان course با `listedFreeCourse`، نام entityهای `role=provider`/`role=institute`، شمار ready video و وضعیت enrollment خود شخص را انتخاب می‌کند؛ title/UUID/object key رسانهٔ خصوصی، مدرک/بازبین هویت و userIdهای دیگر در خروجی نیست. `/student/courses/:courseId` و `GET /api/student/courses/:courseId` با SSR و no-store محافظت شده‌اند، کاتالوگ به معرفی لینک دارد و دکمه ثبت‌نام از endpoint رایگان فعلی با ارزیابی مجدد به watch می‌رسد. ثبت‌نام cancelled اینجا reactivation ندارد، و revoked/draft/بدون محتوای ready fail-closed است. تست‌ها شامل anonymous و غیرstudent، پیش/پس ثبت‌نام و لغو، اطلاعات فقط همین دوره، مرورگر/لینک/ثبت‌نام و revoked است؛ migration جدید ندارد. نام هویت بررسی‌شده فقط بررسی داخلی است نه مجوز آموزشی رسمی. تمرین واقعی، پرداخت و استقرار vendor همچنان کار بازند.

## راهنمای ادامه برای چت جدید

از **head جدید PR #1** و آخرین CI آن شروع کنید، نه snapshotهای قدیمی. ابتدا `README.md`، `docs/implementation/quarantined-media-ingest.md`، `docs/implementation/scalable-media-foundation.md`، `docs/implementation/free-student-enrollment-private-video.md`، `src/server/media/{ingest,multipart,cleanup}.ts`، `src/db/schema.ts` و `drizzle/meta/_journal.json` را بررسی کنید. تغییر واقعی روی `chore/bootstrap-dena-stack` انجام دهید، migration را با Drizzle تولید و commit و هر دو job CI را تا green بررسی کنید. هیچ قابلیت fake scanner، upload حجیم یا ظرفیت ۵M را production ننامید.

## سخت‌سازی انتقال OTP به gateway

آداپتور `src/server/auth/phone.ts` اکنون gateway URL خراب یا دارای userinfo/query/fragment را رد می‌کند و با `redirect: "error"` امکان دنبال‌کردن ۳۰۷/۳۰۸ و بازفرستادن body حاوی شماره/OTP را می‌بندد. خطای network/redirect یا پاسخ غیر 2xx فقط خطای عمومی می‌دهد؛ URL، token، OTP، شماره یا متن خطای vendor منعکس نمی‌شود. `src/server/auth/phone.test.ts` این مرزها را با fixture ساختگی می‌سنجد. این کار **اتصال SMS واقعی یا راستی‌آزمایی vendor نیست**؛ آداپتور و flag پیش‌فرض همچنان خاموش‌اند. اعتبارسنجی runtime همچنین HTTPS loopback، IPv4-mapped، unspecified و link-local 169.254/16 را رد می‌کند؛ mock CI فقط `http://127.0.0.1` می‌ماند. تست HTTP واقعی localhost تأیید می‌کند redirect 307 فقط gateway را فراخوانی می‌کند و مقصد دوم OTP دریافت نمی‌کند. DNS rebinding، دسترسی شبکهٔ خروجی و انتخاب vendor باید مستقل بررسی شوند.
