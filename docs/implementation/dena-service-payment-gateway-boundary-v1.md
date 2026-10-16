# مرز callback درگاه پرداخت خدمات مؤسسه

## آنچه پیاده‌سازی شده

- `ServicePaymentGatewayAdapter` یک مرز vendor-neutral برای پیاده‌سازی آینده است.
- adapter باید **بایت خام** درخواست و headerها را بگیرد، امضا و قواعد ضد replay همان vendor را بررسی کند، و فقط رویداد نرمال‌شدهٔ معتبر را برگرداند.
- قرارداد نرمال‌شده فعلاً فقط `captured` با ارز `IRR`، شناسهٔ سفارش UUID، شناسهٔ رویداد محدود و مبلغ صحیح ریالی را می‌پذیرد.
- `handleServicePaymentWebhook` ورودی را از نظر اندازه محدود می‌کند، نتیجهٔ adapter را دوباره validate می‌کند، شناسهٔ رویداد را با namespace درگاه می‌سازد و فقط سپس تابع capture اتمیک دفتر مالی را فراخوانی می‌کند.
- خطاهای adapter به خطای عمومی تبدیل می‌شوند تا متن vendor، payload، امضا یا راز به caller نشت نکند.
- آزمون واحد، عبور موفق event، رد event تأییدنشده/نامعتبر، رد currency/status/فیلد اضافی، سقف payload و پاک‌سازی خطای adapter را با fake بررسی می‌کند.

## عمداً پیاده‌سازی نشده

این مرز هیچ callback عمومی را منتشر نمی‌کند و به‌تنهایی یک adapter قابل‌اعتماد نیست. تا زمان انتخاب API/vendor، جزئیات canonical signature، timestamp/replay policy، payment-intent creation، redirect کاربر، invoice، refund و settlement تعریف یا فعال نمی‌شوند. redirect مرورگر به‌هیچ‌وجه مدرک پرداخت نیست. پس از انتخاب vendor باید adapter واقعی، route محدود به method/size، secret مستقل در secret manager، sandbox تست و قراردادهای خطای آن اضافه شوند.

در حال حاضر فقط CI می‌تواند capture اتمیک داخلی را با شناسهٔ رویداد ساختگی آزمایش کند؛ adapter و پیکربندی درگاه واقعی وجود ندارد و سفارش `awaiting_payment` وجه دریافتی محسوب نمی‌شود.
