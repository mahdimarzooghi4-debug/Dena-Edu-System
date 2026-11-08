# دانلود APK آزمایشی دانش‌آموز دنا در سایت

بخش «اپ اندروید» در ناوبری، صفحهٔ اصلی و پاورقی سایت به `/download/android` متصل است. این صفحه **عمومی** است و برای دانلود به ورود احتیاج ندارد.

- فایل از GitHub Releases به صورت نسخه‌دار (tag `dena-student-demo-v0.1.1-preview`) سرو می‌شود، نه خروجی موقت Actions. نام فایل `dena-student-android-demo.apk` است.
- نسخهٔ آزمایشی به سرویس Render موجود `https://dena-student-demo.onrender.com/student-demo` وصل است؛ این نسخه قدیمی‌تر از PR #45 و فاقد دادهٔ عملیاتی است.
- نسخه روی Android 8+ قابل نصب است؛ اینترنت لازم است؛ کلید امضای debug متعلق به CI است، نه release رسمی.
- استفاده از URL عمومی برای عرضهٔ نسخهٔ واقعی و تغییر کد به نسخهٔ جدید نیازمند بررسی‌های جداگانه، امضای انتشار، تست روی دستگاه و تأیید انسانی است.
- GitHub Actions در PR مربوط به Android با مجوز محدود، یک **pre-release عمومی** می‌سازد و APK + SHA-256 را بارگذاری می‌کند. اگر همین نسخه قبلاً منتشر شده باشد آن را تعویض نمی‌کند؛ برای بروزرسانی باید نسخه/تگ افزایش یابد.
- هیچ کلید پرداخت، پیامک، حساب واقعی یا مجوز جدیدی برای دانلود لازم نیست.
- سایت روی شاخهٔ Draft است؛ نمایش عمومی این صفحه در سایت عملیاتی تنها بعد از ادغام/استقرارِ مجاز انجام خواهد شد.

## Public-release gate (November 2026)

The pinned APK moved from publicly served `public/downloads` to
`private-assets/android`; the standalone build does not copy private assets
unless `DENA_PUBLIC_ANDROID_APK_ENABLED=1` is explicitly configured following
separate human release approval. APK/checksum endpoints return HTTP 503 when
unapproved. The webpage then shows an explanation instead of a download link.
No public APK release is authorized by the Dena video consultation preview.
