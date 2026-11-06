/* Dena student shell: no private response, API result or login data is cached. */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate" || event.request.method !== "GET") return;
  event.respondWith(
    fetch(event.request).catch(() => new Response(
      '<!doctype html><html lang="fa" dir="rtl"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>دنا</title><body style="font-family:sans-serif;padding:2rem;text-align:center"><h1>اتصال برقرار نیست</h1><p>برای مشاهده داده‌های دانش‌آموز دوباره آنلاین شو.</p><button onclick="location.reload()">تلاش دوباره</button></body></html>',
      { status: 503, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } }
    ))
  );
});
