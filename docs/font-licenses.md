# قلم‌های فارسی دنا

این پروژه برای متن اصلی از **Vazirmatn Variable** و برای سرفصل‌ها از **Estedad Variable** استفاده می‌کند.
هر دو از طریق بسته‌های `@fontsource-variable` با نسخهٔ ثابت `5.3.0` از رجیستری npm
در زمان `npm ci` نصب و به‌صورت **self-hosted** توسط Next.js بسته‌بندی می‌شوند؛
هیچ وابستگی زمان اجرا به CDN قلم وجود ندارد.

| فونت | منبع اصلی | بسته | مجوز |
| --- | --- | --- | --- |
| Vazirmatn | https://github.com/rastikerdar/vazirmatn | @fontsource-variable/vazirmatn | SIL OFL-1.1 |
| Estedad | https://github.com/aminabedi68/Estedad | @fontsource-variable/estedad | SIL OFL-1.1 |

متن کامل مجوزها و اطلاعیه‌های حقوقی در فایل `LICENSE` هر بستهٔ npm موجود است و
هنگام توزیع فایل‌های قلم باید همراه آن حفظ شود.
تغییرات در فایل فونت انجام نشده؛ خانوادهٔ قلم در CSS با نام‌های Fontsource تعریف می‌شود.
در Figma بعضی متن‌ها از محور `kshd` استفاده کرده‌اند؛
بسته‌های Variable فعلی محور `wght` را ارائه می‌کنند و از تقلید ادعاییِ
`kshd` بدون دادهٔ آن قلم خودداری شده است.
