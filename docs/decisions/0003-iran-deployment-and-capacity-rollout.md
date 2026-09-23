# ADR-0003 — انتخاب زیرساخت ایران و مسیر رسیدن به مقیاس ملی دنا

**تاریخ:** ۲۰۲۶-۰۹-۲۱  
**وضعیت:** معماری پیشنهادی برای ارزیابی و RFP؛ انتخاب قطعی فروشنده، قیمت، رزرو ظرفیت و SLA هنوز انجام نشده است.  
**ارتباط:** [ADR-0001](0001-technology-stack.md) · [ADR-0002: هدف ۵ میلیون کاربر همزمان](0002-five-million-concurrent-architecture.md) · [مرزهای امنیتی](../security-boundaries.md)

## ۱. نتیجه تصمیم

برای کاربران عمدتاً داخل ایران، **استقرار اصلی web/API و داده عملیاتی در یک بستر داخل ایران که در تست ISPها پذیرفته شود** را به‌عنوان baseline ارزیابی کنیم. توزیع ویدئو باید مستقل از Next.js، از object storage خصوصی و CDN دارای قرارداد ظرفیت انجام شود. پردازش‌های غیرهمزمان و آزمون پرترافیک از همان codebase دنا با deployment مستقل مقیاس می‌گیرند.

**این تصمیم به معنای تأیید هیچ برند برای ۵ میلیون کاربر نیست.** vendor نهایی باید با قرارداد کتبی throughput، شبکه، پاسخگویی رخداد، محل داده و تست فنی انتخاب شود. data/backup و مسیر بازیابی از یک failure domain منفرد مستقل باشند؛ نام متفاوت دو محصول الزاماً دیتاسنتر یا شبکه مستقل ایجاد نمی‌کند.

دو مسیر خرید تفکیک می‌شوند:
- **پایلوت قابل تعویض:** یک PaaS داخلی دارای Node/Next.js، PostgreSQL و Redis و S3-compatible storage؛ پیکربندی ساده و هزینه محدود. هدف تست عملکرد، دسترسی و یک جریان واقعی دانش‌آموز است، نه تعهد ملی.
- **قرارداد عملیاتی ملی:** استقرار کانتینری تکرارشونده، حداقل دو failure domain واقعی برای web، PostgreSQL HA + pooler، CDN خصوصی و streaming، DR مستقل، ظرفیت رزروشده و پشتیبانی اضطراری. محل دقیق/فروشندگان پس از RFP و تست انتخاب شوند.

معماری اپلیکیشن **یک codebase و modular monolith** است؛ تکثیر web instance، ingest و worker مجاز و لازم است. شش پنل مستقل یا microservices از روز اول ساخته نمی‌شود.

## ۲. اطلاعات عمومی فروشندگان بررسی‌شده، نه تأیید ظرفیت

| نام/دسته | آنچه در صفحه رسمی اعلام می‌شود | مدرک قابل درخواست پیش از انتخاب |
|---|---|---|
| [آروان‌کلاد](https://www.arvancloud.ir/fa) | سرور، CDN، میزبانی ویدئو، object storage، کانتینر و دیتابیس ابری و خدمات امنیت | پوشش CDN روی ISPهای هدف، signed media access در edge، origin shield، quota و ظرفیت اختصاصی برحسب Tb/s و requests/s، توزیع AZ واقعی، HA/PITR PostgreSQL، امکان خروج داده، SLA و بهای پخش |
| [لیارا](https://liara.ir/) | میزبانی Next.js/Node/Docker، DBaaS شامل PostgreSQL/Redis/RabbitMQ و object storage با سازگاری S3 | حداکثر scale-out، topologies جداشده واقعی، replica و failover DB، PgBouncer/connection limits، throughput شبکه و policy داده/backup، مناسب‌بودن برای پایلوت یا قرارداد بزرگ |
| [پارس‌پک](https://parspack.com/) و [راهکار سازمانی](https://parspack.com/enterprise-cloud-solutions) | سرور ابری، CDN، فضای ابری و Object Storage سازگار با S3 در معرفی خدمات سازمانی | ظرفیت رسمی CDN/egress، HA/pooling پایگاه داده، DR در failure domain متفاوت، IP/NS/DNS و بازیابی در اختلال شبکه، quota و هزینه مصرف |
| [ابر آسیاتک](https://cloud.ir/) | گزینه بررسی IaaS/CDN و ارتباطات داخل ایران؛ جزئیات محصول/ظرفیت فقط با استعلام رسمی روز | شبکه و چند دیتاسنتر مستقل، ظرفیت CDN برای ویدئوی خصوصی، توافق کیفیت مسیر ISPها، HA دیتابیس و پنجره failover، RTO/RPO قراردادی |

توضیح: این جدول **فهرست گزینه‌های بررسی** است، نه رتبه‌بندی یا اعلام آمادگی برای بار ۵ میلیون. وجود صفحه محصول با اثبات throughput، multi-AZ و compatibility عملی متفاوت است؛ عبارت «نامحدود» در بازاریابی را جایگزین سهمیه رزروشده نکنیم. وابستگی shared به برق، دیتاسنتر، upstream و NSها را جداگانه بررسی کنیم.

## ۳. توپولوژی خریدنی نسخه اول

```text
Users on Iranian ISPs
      |
   DNS + WAF/DDoS + CDN
      ├── cacheable HLS segments [edge validated; no public origin]
      │       └── origin shield → private S3-compatible media storage
      └── private dynamic requests → regional load balancer
                 ├── Next.js web/API replicas (2+ failure domains if verified)
                 │     ├── Better Auth + centralized scoped permission
                 │     ├── pooler → PostgreSQL primary / replicas
                 │     └── Redis for ephemeral / rate-limit / cache
                 ├── exam ingress → durable stream → partitioned writers
                 └── background worker → outbox, payment reconciliation, SMS, transcoding
offsite encrypted backups + restore drills | logs/metrics/traces + synthetic ISP probes
```

توجه: failover دیتابیس فقط پس از تست consistency و promotion؛ read replica به شکل خودکار ظرفیت نوشتن بالا نمی‌آورد. سرور وب نباید در مسیر انتقال bytes ویدئو باشد. تمرکز بر routing و اندازه‌گیری داخل ایران، ولی مسیر بازیابی و بسته‌های CI/Container به اتصال غیرقابل‌اتکای خارج وابسته نمانند.

## ۴. RFP اجباری برای ارائه‌دهندگان

### CDN / Media

1. ظرفیت **رزروشده** ۱۵ Tb/s در سناریوی تمام‌ویدئو با ۳ Mb/s میانگین، یا ظرفیت متناظر سناریوی ترکیبی؛ حداقل ۱٫۲۵ میلیون segment request/s لبه با فرض segment چهارثانیه‌ای. آیا ظرفیت contractually به traffic mix و ISPهای مورد نیاز تخصیص دارد؟
2. تست cold cache و warm cache، origin shielding، cache hit ratio به تفکیک ISP/استان و ممانعت از origin bypass؛ edge token validation جدا از cache key و قابلیت HLS/ABR.
3. قیمت per GB egress، per million requests، storage، transcoding، log/analytics و burst/overage. سناریوی full-video تقریباً **۶٫۷۵ PB خروجی در ساعت** دارد؛ این فقط حساب bitrate است، نه قیمت یا پیش‌بینی مصرف واقعی.
4. SLA کیفیت پخش و گزارش startup delay، rebuffer ratio، error rate و p95 segment fetch؛ امکان تست با دستگاه‌های واقعی در چند ISP.
5. محل نگهداری master/origin و محافظت فایل خصوصی؛ قرارداد خروج فایل و کلیدها بدون توقف طولانی.

### Compute / DB / network

1. موقعیت دیتاسنتر، fault-domain واقعی، upstreamها، ظرفیت uplink، quotas مربوط به LB/WAF/IP، scaling speed و قیمت reserved/burst.
2. PostgreSQL managed: نسخه، PgBouncer/transaction pooling compatibility با driver و prepared statements، connection max، primary IOPS/write throughput، PITR retention، synchronous/async replication، read lag، maintenance و آزمون failover.
3. S3-compatible: multipart upload، presigned URL، signed download/access، object versioning/retention، encryption و درخواست/throughput quotas.
4. Redis: HA/failover، eviction، max connections، persistence (اگر لازم شد)؛ برای رویدادهای مالی و پاسخ تأییدشده از Redis به‌عنوان تنها system of record استفاده نشود.
5. ظرفیت stream/queue پایدار: replication، retention، partition count، throughput/latency و replay. اگر managed در بستر نبود، باید هزینه عملیاتی اجرای اختصاصی را لحاظ کرد.
6. backup مستقل + restore evidence، دسترسی اضطراری، metrics export، root cause analysis و خروج اطلاعات/مهاجرت.

### Iran-only/degraded-network rehearsal

- استقرار، certificate renewal، DNS resolution، OTP، gateway callback، monitoring، artifact registry، deployment و backup restore در محدودیت ارتباط بین‌المللی **به‌صورت end-to-end آزموده شوند**.
- dependencyهای اجرایی را self-host و pin کنیم: Estedad/Vazirmatn، assets، تصاویر کانتینری mirrorشده، npm/package dependencies در CI، DNS و telemetry. صرف داخلی بودن origin، تضمین مستقل ماندن کل زنجیره نیست.
- اسناد عمومی پارس‌پک درباره عملکرد سرویس‌های کلاستر ایران در اختلال و تفاوت کلاستر خارج: https://parspack.com/last-faq-and-status ؛ این سند جای تست واقعی دنا را نمی‌گیرد.

## ۵. فازهای ظرفیت و گیت ارتقا

جدول زیر **تعداد کاربران فعال همزمان** را هدف می‌گیرد، نه صرفاً registered users:

| مرحله | بازهٔ آزمون | فعال‌سازی معماری / گیت خروج |
|---|---|---|
| P0 — engineering | ۱۰۰ تا ۱٬۰۰۰ | auth و scope سروری، یک جریان خرید/دوره آزمایشی بدون پرداخت واقعی، CI قابل تکرار، DB migrations/backup/restore، CDN private prototype |
| P1 — pilot | ۱٬۰۰۰ تا ۱۰٬۰۰۰ | PostgreSQL/pooler، Redis با failover، CDN ویدئو، rate-limit، trace و dashboards؛ تست ISP و اندازه‌گیری cache hit و SLO |
| P2 — expansion | ۱۰٬۰۰۰ تا ۱۰۰٬۰۰۰ | دو failure domain واقعی web، load test + soak، سنجش DB writer/read replicas، outbox، مالی و DR، ظرفیت CDN مکتوب |
| P3 — large regional | ۱۰۰٬۰۰۰ تا ۱ میلیون | قرارداد رزرو شبکه/CDN/SMS، media origin shield، multi-provider recovery، failover game day، ingest مستقل آزمون و queue با durable ACK |
| P4 — national | ۱ تا ۵ میلیون | بارهای V/M/E/L در ADR-0002، proof ۱۵ Tb/s/۱٫۲۵M edge RPS در سناریوی ویدئو یا تخفیف رسمی scope، آزمون ۸۳٫۳k answer/s در حالت E، مالی/OTP و DR تحت بار همزمان، قرارداد هزینه و پشتیبانی 24×7 |

این سطوح به‌تنهایی زمان، قیمت یا تعداد pod تعیین نمی‌کنند. عبور از فاز فقط با **نتیجه تست قابل بازتولید** و budget مصوب انجام شود. هرکدام از V/M/E/L تعهد جدا هستند؛ اگر تست فقط مخلوط ۷۰٪ ویدئو/۲۰٪ مرور/۱۰٪ آزمون را پوشش داد، «پنج میلیون آزمون همزمان» را اعلام نکنیم.

## ۶. سنجه‌ها و شرط پذیرش مهندسی

- برای هر کلاس API p50/p95/p99 latency، errors، saturation و throughput؛ SLOها با محصول مصوب شوند و در تست/مشاهده واقعی اندازه‌گیری شوند.
- برای ویدئو: play start success، startup delay و rebuffer، نرخ خطا و CDN hit/origin miss، broken edge-auth و هزینه/ساعت.
- برای آزمون: شمار accepted ACK در برابر durable committed، delay به‌ازای attempt، replay پس از kill worker، deadline server-side، duplicate suppression در قطع/reconnect؛ هیچ پاسخ ACKشده‌ای در تست خرابی از بین نرود.
- برای DB: max pool wait و connection headroom، writer commit latency و lock contention، PITR و restore از نسخه مستقل.
- برای مالی: هیچ duplicate credit/refund در callback تکراری و replay job؛ تطبیق ledger با gateway و audit.
- قطعی شبیه‌سازی‌شده یک AZ/ISP/origin و failover Redis/DB + تست degradation در شرایط محدودیت شبکه؛ نتایج امضا و آرشیو شوند.

## ۷. بودجه و خرید

تا زمان مشخص شدن traffic mix، مصرف واقعی، فروشنده و SLA، **عدد ریالی ساختگی نسازیم**. مدل هزینه باید به شکل زیر محاسبه شود:

`monthly total = CDN egress GB × نرخ + CDN request count × نرخ + transcoding hours + storage GB-month + object requests + app CPU/RAM-hours + DB HA/IOPS/storage + Redis + durable stream + SMS + payment fees + backup/DR + monitoring + on-call + reserved capacity`

برای هر گزینه این سه سناریو قیمت‌گذاری شوند: میانگین روزانه، اوج آزمون و یک ساعت ویدئوی تمام‌ظرفیت. گیت خرید برای ۵M، مقایسه پیشنهاد رسمی فروشندگان و پیش‌پرداخت ظرفیت شبکه در صورت نیاز است.

## ۸. قدم بعدی اجرایی در مخزن

این ADR خرید انجام نمی‌دهد و deploy فعال نمی‌کند. اجرای کد از قابلیت‌های تازه مخزن شروع می‌شود: lockfile و CI و shell/preview و access policy توابع خالص موجودند، ولی session/DB/route واقعی هنوز نیستند. ترتیب بعدی:
1. فایل نمونه env را پس از انتخاب سرویس برای local/stage/prod تفکیک کنیم، بدون secrets در Git.
2. adapterهای قابل تعویض برای `Database`, `ObjectStorage`, `SMS`, `PaymentGateway`, `MediaSigner` تعریف کنیم؛ vendor-specific فقط در infrastructure layer.
3. PostgreSQL/Drizzle migration و Better Auth server integration، سپس role+scope واقعی و یک مسیر end-to-end دانش‌آموز.
4. load harness بازتولیدپذیر (k6 یا معادل)، traces و داشبورد، قرارداد CDN/private media، و تست failure.
5. اطمینان از پایبندی به مرزهای دانش‌آموز/مؤسسه/ارائه‌دهنده/سازمان/خیر و پشتیبانی فنی مشترک.

## منابع عمومی بررسی‌شده

- آروان‌کلاد — فهرست محصولات: https://www.arvancloud.ir/fa
- لیارا — پلتفرم و خدمات داده و storage: https://liara.ir/
- پارس‌پک — خدمات ابر/CDN: https://parspack.com/ ؛ سازمانی: https://parspack.com/enterprise-cloud-solutions
- ابر آسیاتک — معرفی پلتفرم: https://cloud.ir/
- پارس‌پک — راهنمای اختلالات ارتباطی: https://parspack.com/last-faq-and-status
- جزئیات بار، عملیات و شرط اثبات ۵M: [ADR-0002](0002-five-million-concurrent-architecture.md)
