# ADR-0002 — معماری هدف دنا برای ۵٬۰۰۰٬۰۰۰ کاربر همزمان

**تاریخ:** ۲۰۲۶-۰۹-۲۱  
**وضعیت:** جهت‌گیری معماری مورد توافق؛ «ظرفیت ۵ میلیون» هدف طراحی است، نه ظرفیت اثبات‌شده یا زیرساخت خریداری‌شده.  
**مرجع‌ها:** [ADR-0001](0001-technology-stack.md) · [مرزهای امنیتی](../security-boundaries.md) · [قراردادهای دسترسی](../access-contracts.md) · [Figma](https://www.figma.com/design/8Bo8BNS5LVQfTJhxwCYQmo/Dena-Ecosystem)

## ۱. تعریف هدف و فرض‌های قابل اندازه‌گیری

«همزمان» را به تعداد حساب ثبت‌شده، session معتبر یا connection باز تعبیر نمی‌کنیم. هدف: **۵ میلیون کاربر فعال در پنجره زمانی مشخص**، با حداقل سه آزمون ظرفیت مستقل. نسبت‌های زیر فرض بار هستند و باید با داده واقعی جایگزین شوند:

| پروفایل | بار هدف محاسباتی | نتیجهٔ معماری |
|---|---:|---|
| V — پنج میلیون تماشاگر ویدئو | ۵M × میانگین ۳ Mb/s = **۱۵ Tb/s** خروجی CDN؛ **۶٫۷۵ PB در ساعت**؛ قطعه HLS چهارثانیه‌ای ≈ **۱٫۲۵M درخواست قطعه/ثانیه** به لبه CDN، نه به Next.js | قرارداد ظرفیت CDN و پوشش ISPهای ایران ضروری؛ origin نباید این بار را ببیند. |
| M — بار ترکیبی نمونه، نه پیش‌بینی | ۷۰٪ ویدئو = ۳٫۵M تماشاگر → **۱۰٫۵ Tb/s**؛ ۲۰٪ مرور = ۱M کاربر با یک درخواست/۶۰ثانیه → **۱۶٫۷k RPS**؛ ۱۰٪ آزمون = ۵۰۰k با یک پاسخ/۳۰ثانیه → **۱۶٫۷k رویداد پاسخ/ثانیه**؛ پیشرفت ویدئو هر ۱۲۰ثانیه ≈ **۲۹٫۲k رویداد/ثانیه** | read API و ingest/write دو مسیر جداگانه با ظرفیت مستقل می‌خواهند. |
| E — آزمون سراسری بدبینانه | ۵M شرکت‌کننده، هرکدام یک پاسخ/۶۰ثانیه = **۸۳٫۳k رویداد پاسخ/ثانیه**؛ شروع/پایان هم‌زمان می‌تواند انفجار چندبرابری ایجاد کند | صرف یک PostgreSQL و route عادی Next.js بدون ingestion پایدار، تضمین این حالت نیست. |
| L — ورود هم‌زمان | ۵M ورود در ۱۰دقیقه ≈ **۸٫۳k تلاش ورود/ثانیه**، پیش از retry و SMS | OTP/SMS ظرفیت قراردادی، اعتبارسنجی و محدودکننده مستقل می‌خواهد. |

اندازه محتوا، ABR واقعی، زمان تماشای هم‌زمان، تعداد دوره‌های داغ، نرخ تعامل، جغرافیا، کیفیت شبکه و توزیع زمانی، بار واقعی را تعیین می‌کنند. از هیچ تعداد ثابت pod، instance، core یا کانکشن دیتابیس بدون benchmark نتیجه ظرفیت نگیریم. «۵ میلیون ویدئوبین» با «۵ میلیون نفر در حال ارسال پاسخ» دو تعهد متفاوت‌اند.

## ۲. تصمیم معماری کلان

**یک codebase / modular monolith دامنه‌ای** با Next.js 16 + React 19 + TypeScript حفظ می‌شود؛ **یک deployment منفرد یا یک PostgreSQL منفرد، تعهد ظرفیت نیست**. بسته‌های مشترک دامنه و سیاست دسترسی در مخزن واحد؛ deploymentهای مقیاس‌پذیر مستقل برای وب/API، ingest آزمون، worker و pipeline ویدئو. جداسازی deployment به معنای ساخت شش فرانت‌اند مستقل نیست.

```text
Iran ISPs / Internet
  │
  ├── CDN + edge auth + WAF/DDoS ────── HLS/CMAF immutable segments
  │       │                                 ↑
  │       └── private media origins + origin shield + object storage
  │
  └── Global/Regional traffic management + load balancers
          │
          ├── Stateless Next.js web/API replicas, multi-AZ
          │      ├── session/auth & scoped authorization
          │      ├── cached/public reads and private projections
          │      ├── PostgreSQL poolers → writer + read replicas
          │      └── Redis cluster (ephemeral/cache/rate limits)
          │
          ├── Exam ingress (same repo/domain; independently scaled)
          │      └── replicated durable event stream
          │             ├── answer writers → partitioned data stores
          │             ├── grading / anti-duplication / audit
          │             └── durable archive + reporting projections
          │
          └── workers / outbox relay → SMS, email, transcoding, payment checks
                 └── financial ledger and verified gateway records in DB

Central observability, backup/restore, secrets/KMS, on-call and runbooks
```

**Region و provider باز است**؛ multi-AZ در یک region نزدیک مسیر واقعی کاربران و DR در محل مستقل، پیش‌فرض بررسی است. multi-region active-active برای همهٔ عملیات دارای دادهٔ تغییرپذیر، بدون طراحی مالکیت و سازگاری داده ممنوع؛ در صورت نیاز از failover کنترل‌شده یا مسیریابی مبتنی بر مالکیت shard استفاده شود. قابل‌دسترس بودن، کیفیت edge و پرداخت/SMS برای داخل ایران باید با قرارداد و اندازه‌گیری واقعی سنجیده شود، نه نام برند.

## ۳. مقیاس وب، ویدئو و فایل

- Next.js صرفاً HTML/API و **مجوز شروع پخش** را ارائه کند؛ bytes فایل، transcoding و segmentها از مسیر برنامه عبور نکنند. media pipeline: upload محدود و اسکن‌شده → object storage خصوصی → queue/transcode ABR → HLS/CMAF → origin shield → CDN.
- برای محتوای خصوصی، پس از کنترل server-side enrollment/مالکیت دوره، توکن/کوکی کوتاه‌عمر **محدود به همان محتوای مجاز** صادر شود؛ اعتبارسنجی در edge، private origin و جلوگیری از bypass. expiration و شیوه تمدید باید قطع اشتباهی پخش را مدیریت کند. **DRM یا محافظت کامل در برابر ضبط صفحه از این الگو نتیجه نمی‌شود.**
- cache key segmentها بر مبنای نسخه ویدئو/کیفیت/segment پایدار باشد و با توکن منحصربه‌فرد هر دانش‌آموز خرد نشود؛ امضای دسترسی جدا از cache key بررسی شود. مسیرهای پاسخ خصوصی، پاسخ آزمون، کوکی‌های session و رسید مالی **CDN-cache عمومی ندارند**.
- ظرفیت ویدئو با CDN قرارداد و تست مستقل دارد: throughput در Tb/s، request rate، hit ratio براساس مسیر، نشت توکن، عملکرد در ISPهای ایران، cold cache، origin miss، failover و تخمین هزینه خروجی. multi-CDN و origin دوم در صورت نیاز حاصل تست و بودجه‌اند، نه پیش‌فرض فعال. مثال: hit ratio برابر ۹۹٫۹٪ از ۱٫۲۵M درخواست/ثانیه، حدود **۱٬۲۵۰ miss/ثانیه** می‌دهد؛ مقدار فرضی است و playlistها/کیفیت‌های متفاوت می‌توانند آن را تغییر دهند.
- مدارک، تصاویر و آپلودهای دانش‌آموز، خصوصی و با دسترسی محدود هستند؛ presigned upload با محدودیت نوع/اندازه، malware scanning، metadata کمینه و lifecycle/retention.

## ۴. وب/API، session و authorization

- web replicas بدون state محلی؛ health/readiness، load balancing، autoscaling براساس **RPS، CPU، latency، queue depth و saturation** و ظرفیت از پیش رزروشده در زمان رویداد ملی. حداقل دو AZ، rolling/canary و امکان rollback. تصاویر immutable یکسان و key مشترک `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` و `deploymentId` یکسان در هر release؛ shared cache/tag invalidation در صورت استفاده از Next cache بین instanceها.
- Better Auth با session قابل ابطال و ذخیره‌سازی معتبر. cache کوکیِ کوتاه‌عمر تنها برای مسیرهای کم‌خطر پس از بررسی سیاست ابطال؛ **برای مالی، تغییر نقش، مشاهده اطلاعات حساس و صدور اجازه ویدئو باید تازگی مجوز/وضعیت عضویت مجدداً بررسی شود**. session cache و authorization cache دو مسئله جدا هستند؛ role از client و cookie قابل اعتماد استخراج نشود.
- `AccessContext` صرفاً از session معتبر و membershipهای server-side ساخته شود. پس از load رکورد دامنه، بررسی actor + role + tenant/organization + course + fund + state انجام شود؛ پیش‌فرض deny. از سیاست‌های مرکزی موجود `src/domain/access/*` استفاده و اتصال آنها به API/DB را تست کنیم.
- دانش‌آموز، مؤسسه، ارائه‌دهنده، ادمین، سازمان و خیر همه در یک سیستم‌اند؛ رابطه نظارتی ارائه‌دهنده **برای همان دوره** فقط با تأیید معتبر مؤسسه قابل استفاده است. سازمان فقط داده خودش و گزارش تجمیعی محافظت‌شده؛ خیر فقط حمایت خودش و گزارش صندوق مجاز. پشتیبانی فنی یک ماژول با `/support` و inbox اپراتور مجاز `/admin/support` است، نه دو سامانه.
- تغییر مجوز یا ابطال فوری روی endpoint حساس از primary یا منبع نسخه‌بندی‌شده قابل اتکا خوانده شود. داده کم‌حساسیت را می‌توان با TTL محدود cache کرد، همراه با سناریوی مشخص انتشار invalidation. هیچ cache عمومی حاوی داده دانش‌آموز نباشد.

## ۵. پایگاه داده و قابلیت نوشتن

- PostgreSQL + Drizzle برای **system of record**: هویت/عضویت، دوره/نظارت، ثبت‌نام، سفارش، مجوز صندوق، وضعیت امتحان، رخداد و ledger مالی. managed HA + PITR + encrypted backups؛ connection pooling با سقف budget به‌ازای replica/pool و reserve برای admin/failover. تعداد زیاد app pod نباید به همان تعداد کانکشن PostgreSQL تبدیل شود.
- primary برای read-after-write، تأیید مالی، permission حساس و deadline آزمون؛ read replicas فقط برای queryهای stale-tolerant. مانیتور replication lag، failover و timeline؛ read replica راه‌حل write throughput نیست.
- ایندکس بر queryهای tenant/course/user + predicate واقعی، pagination keyset، query plans، زمان اجرای P95، نبود N+1؛ partition داده‌های پرترافیک مثل audit/progress/answer به‌تناسب تاریخ و ownership. **Partitioning یک PostgreSQL مساوی sharding یا ظرفیت نامحدود نوشتن نیست.**
- برای پروفایل آزمون E، write ingestion مستقل: validation هویت/دوره/زمان سرور → پاسخِ دارای `attemptId + questionId + answerVersion/idempotencyKey` → replicated durable stream با کلید partition مشتق از attempt/student برای جلوگیری از hotspot یک exam → تأیید دریافت **فقط پس از durable ack** → consumerهای idempotent → DB partition/shardهای دارای مالکیت تعیین‌شده، snapshot/aggregate و آرشیو durable. «ثبت نهایی آزمون» فقط با state machine و تأیید durable پاسخ‌های پذیرفته‌شده انجام شود؛ UI حالت pending/confirmed را شفاف نشان دهد.
- انتخاب Kafka-like managed stream، تعداد partition و نیاز به sharded PostgreSQL یا datastore ویژه eventها **گیت ظرفیت آزمون** هستند؛ بعد از آزمون بار E تعیین می‌شوند. گزارش تحلیلی در replica/warehouse جدا اجرا شود، نه روی primary تراکنشی.
- زمان پایان آزمون با ساعت قابل‌اعتماد سرور و منطق grace مستند؛ عدم از دست رفتن پاسخ تأییدشده و idempotency در reconnect/retry الزامی. عملیات محدودکننده در اوج آزمون باید قابل ظرفیت‌سنجی و پرهیز از false positive باشند.

## ۶. Redis، queue و backpressure

- Redis HA برای rate limits، OTP موقت، caching کم‌حساسیت و coordination؛ **نه** تنها محل رخداد مالی یا پاسخ تأییدشده. پارتیشن‌بندی keyها و TTL، سقف حافظه، eviction policy و رفتار هنگام failover آزمایش شود.
- Queue پایدار برای transcoding، notification، reconciliation و outbox؛ stream replicated و partitioned ویژه ingest پرترافیک آزمون در صورت نیاز. retries محدود، exponential backoff، DLQ، replay و metrics lag.
- در فشار شدید، graceful degradation: پیشنهادها/گزارش‌ها/نوتیفیکیشن ابتدا کند یا متوقف شوند؛ پرداخت، احراز اختیار و پاسخ تأییدشده آزمون نباید بی‌صدا drop شوند. 429/503 با retry-after و jitter، بدون retry storm؛ admission control و ظرفیت افزوده در آغاز آزمون.

## ۷. پرداخت، صندوق و تسویه

- gateway callback صرفاً **ادعا** است؛ سمت سرور با gateway تطبیق، مبلغ/واحد پول/شناسه سفارش و امضای قابل اعمال بررسی شود. DB transaction برای transition معتبر state + event/ledger + unique constraints؛ idempotency key برای request و شناسه یکتای تراکنش gateway.
- transactional outbox برای dispatch پس از commit؛ webhook تکراری و job replay نباید double charge/credit/refund ایجاد کند. reconciliation مستقلِ روزانه و هنگام اختلاف؛ مسیرهای refund/settlement با state machine، سطوح اختیار، audit بدون امکان ویرایش عادی و تست failure injection.
- رقم مالی از client، Redis یا redirect success صفحه استخراج نشود. خیر هیچ دسترسی استنتاج‌پذیر به هویت/پرونده دانش‌آموز ندارد؛ انتشار گزارش صندوق subject به privacy review است.

## ۸. امنیت، حفاظت داده و مشاهده‌پذیری

- WAF، DDoS protection، rate limiting چندسطحی (edge / API / actor / phone / action)، ضد سوءاستفاده OTP با حفظ دسترس‌پذیری کاربران واقعی؛ TLS، secrets/KMS، حداقل مجوز سرویس و اصل جداسازی origin.
- PII دانش‌آموزان از trace/log/analytics حذف یا mask شود؛ audit امنیتی و مالی با retention و کنترل دسترسی؛ گزارش‌های تجمیعی سازمان باید حداقل جمعیت و جلوگیری از حمله استنتاج بین برش‌ها داشته باشند.
- OpenTelemetry یا معادل آن برای traceID، metrics با cardinality کنترل‌شده، log ساختاریافته، APM و alert. داشبورد جدا: CDN bitrate/startup/rebuffer/4xx، API p50/p95/p99، login و OTP، pool wait/DB lag، queue lag/oldest age، accepted-vs-persisted answers، تراکنش مالی/اختلاف reconciliation.
- سنجش synthetic و real-user از چند شبکه/ISP ایران و سناریوی اینترنت مختل، جدا از تست آزمایشگاهی دیتاسنتر.

## ۹. اهداف اولیه قابلیت اطمینان و بازیابی (پیشنهاد؛ نه SLA مصوب)

| موضوع | هدف طراحی قابل بازبینی |
|---|---|
| قابلیت دسترسی API حیاتی | ۹۹٫۹۵٪ ماهانه، بعد از سنجش ظرفیت و هزینه مصوب شود |
| RPO داده‌های اصلی | حداکثر ۵ دقیقه در فاجعه منطقه‌ای به‌عنوان هدف اولیه؛ ledger و پاسخِ ackشده نیازمند تعهد دقیق‌تر و replay/replication |
| RTO سرویس حیاتی | حداکثر ۳۰ دقیقه، مشروط به DR واقعی و تمرین failover |
| عمر قابل تحمل صف | به تفکیک event آزمون، مالی، SMS، ویدئو با هشدار و DLQ |
| بار تست | V، M، E، L به‌صورت مستقل و ترکیب معتبر؛ ۲۴ ساعت soak و تست قطعی یک AZ / origin / Redis / DB failover |

بکاپ رمزگذاری‌شده و مستقل از محل اصلی، PITR، immutable/offsite copy، تمرین restore و تطبیق شمار رویدادهای مالی/آزمون پس از بازیابی لازم است. RPO صفر یا هیچ‌گاه از دست نرفتن داده را بدون معماری و آزمون مشخص ادعا نکنیم.

## ۱۰. فازبندی بدون overengineering

1. **Foundation کنونی:** lockfile و CI واقعی در branch موجودند؛ پیش‌نمایش‌های Figma و قراردادهای خالص access هم اضافه شده‌اند، ولی مسیرهای نقش، session و DB عملیاتی نیستند. CI و lockfile را دوباره به‌عنوان کار انجام‌نشده فهرست نکنیم.
2. **نسخه عملیاتی کوچک:** یک Next.js modular monolith، PostgreSQL HA/pool، auth و scoped authorization، object storage/CDN امن، outbox/worker و observability پایه؛ همه با آزمون رد دسترسی.
3. **آماده‌سازی بار بالا:** load balancing چند AZ، read replicas، cache هدفمند، capacity reservation CDN/SMS، آزمون V/M، capacity planning و cost ceiling.
4. **گیت آزمون ملی E:** ingress و durable stream مستقل، partition/shard plan، آزمون end-to-end تأیید پاسخ و بازیابی، load test E و admission control؛ بدون عبور از این گیت، ادعای «۵ میلیون آزمون هم‌زمان» نکنیم.
5. **پیش از اعلام آمادگی ۵M:** تأیید کتبی/فنی quota و throughput تأمین‌کنندگان، هزینه Tb/s و PB/hour، تست از داخل ایران، گواهی evidence تست بار و failover، گزارش p95/p99/error rate و signed operational runbook.

## ۱۱. تصمیم‌های باز / گیت خرید

- تعریف تجاری ۵M: نسبت ویدئو، آزمون، مرور، پنجره اوج، bitrate، ISP و جغرافیا، latency/SLO و budget.
- hosting/region و کیفیت اتصال داخل ایران؛ ظرفیت رزروشده و توزیع load روی چند AZ/ISP.
- vendor و قرارداد ظرفیت CDN/edge authorization، transcoding و object storage.
- PostgreSQL managed، سقف IOPS/connection/replica؛ سازگاری PgBouncer transaction pooling با driver و prepared statements در تست ادغام.
- provider SMS/OTP و gateway پرداخت با quota، webhook SLA و امکان reconciliation.
- انتخاب durable stream، schema پاسخ، partition key و ترتیب/نسخه‌بندی آزمون؛ sizing shard فقط از benchmark.
- observability، مقادیر RPO/RTO، مسئول on-call، retention داده و بودجه DR.

### مراجع فنی تصمیم

- Next.js self-hosting / multi-instance, encryption key, deployment ID, shared cache: https://nextjs.org/docs/app/guides/self-hosting
- Better Auth session persistence/cache/revocation tradeoff: https://better-auth.com/docs/concepts/session-management
- PgBouncer transaction pooling / prepared statements: https://www.pgbouncer.org/faq.html
- Private HLS delivery via CDN signed cookies: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-choosing-signed-urls-cookies.html
- PostgreSQL partitioning: https://www.postgresql.org/docs/current/ddl-partitioning.html
