import { expect, test } from "@playwright/test";

test.describe("isolated installable synthetic Dena student app", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/student/demo");
    await expect(page.getByText("نسخهٔ آزمایشی با دادهٔ ساختگی").first()).toBeVisible();
  });

  test("accepts same-host JSON mutations with signed synthetic cookie", async ({ page }) => {
    const outcome = await page.evaluate(async () => {
      const response = await fetch("/api/student/demo/actions", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({type: "completeLesson", lesson: "physics-10:4"}),
      });
      return { status: response.status, body: await response.text() };
    });
    expect(outcome.status, outcome.body).toBe(200);
    expect(outcome.body).toContain("signed-cookie-only");
  });
  test("navigates home, course detail, learning, notes and persisted progress", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /سلام،/ })).toBeVisible();
    await page.getByRole("link", { name: "مشاهده جزئیات دوره" }).first().click();
    await expect(page).toHaveURL(/\/student\/demo\/course\/math-10$/);
    await page.getByRole("link", { name: "ادامه یادگیری" }).click();
    await expect(page).toHaveURL(/\/student\/demo\/learn\/math-10\/9$/);
    await page.getByRole("button", { name: "علامت‌گذاری جلسه به‌عنوان تکمیل‌شده" }).click();
    await expect(page.getByText("این درس در پیشرفت آزمایشی تکمیل شد.")).toBeVisible();
    await page.getByPlaceholder("نکته‌ای برای مرور بنویس…").fill("مرور مفهوم تابع و دامنه");
    await page.getByRole("button", { name: "ذخیره یادداشت" }).click();
    await expect(page.getByText("یادداشت آزمایشی ذخیره شد.")).toBeVisible();
    await page.reload();
    await expect(page.getByText("مرور مفهوم تابع و دامنه")).toBeVisible();
    await expect(page.getByRole("button", { name: "جلسه در پیشرفت نمونه ثبت شده" })).toBeDisabled();
  });

  test("grades a practice in backend and retains synthetic result without answer keys in GET", async ({ page }) => {
    const data = await page.request.get("/api/student/demo");
    expect(data.status()).toBe(200);
    expect(data.headers()["cache-control"]).toContain("no-store");
    expect(JSON.stringify(await data.json())).not.toContain("correctChoice");

    await page.goto("/student/demo/assessment/practice-functions");
    await page.getByRole("link", { name: "شروع تمرین" }).click();
    await page.getByRole("radio").first().check();
    await page.getByRole("button", { name: "مرور و ثبت پاسخ" }).click();
    await page.getByRole("button", { name: "ارسال پاسخ و دیدن نتیجه" }).click();
    await expect(page.getByText("پاسخ درست است")).toBeVisible();
    await page.getByRole("link", { name: "کارنامه آزمایشی" }).click();
    await expect(page.getByText("کارنامهٔ آزمایشی")).toBeVisible();
    await expect(page.getByText("پاسخ درست", { exact: true })).toBeVisible();
    const blocked = await page.request.post("/api/student/demo/actions", {
      data: { type: "reset" }, headers: { origin: "https://outside.example" },
    });
    expect(blocked.status()).toBe(403);
  });

  test("registers in sample elite club, answers evaluation, remains pending (never becomes member)", async ({ page }) => {
    await page.goto("/student/demo/elite-club");
    await page.getByRole("link", { name: "ثبت‌نام آزمایشی در باشگاه" }).click();
    await expect(page.getByRole("heading", { name: "ثبت‌نام آزمایشی" })).toBeVisible();
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "تأیید و ثبت درخواست نمونه" }).click();
    await expect(page.getByText("ثبت‌نام آزمایشی انجام شد؛ هیچ عضویت واقعی ایجاد نشد.")).toBeVisible();
    await page.getByRole("link", { name: "آغاز ارزیابی" }).click();
    await page.getByRole("button", { name: "آغاز ارزیابی" }).click();
    for (let i = 0; i < 3; i++) {
      await page.getByRole("radio").first().check();
      await expect(page.getByText("پاسخ آزمایشی ثبت شد.")).toBeVisible();
      if (i < 2) await page.getByRole("button", { name: "سؤال بعد" }).click();
    }
    await page.getByRole("link", { name: "مرور پاسخ‌ها" }).click();
    await expect(page.getByRole("heading", { name: "مرور پاسخ‌های ارزیابی" })).toBeVisible();
    await page.getByRole("button", { name: "ارسال ارزیابی نمونه" }).click();
    await expect(page.getByText(/در انتظار بررسی است و عضویتی اعطا نمی‌شود/)).toBeVisible();
    await page.getByRole("link", { name: "وضعیت بررسی" }).click();
    await expect(page.getByText("در انتظار بررسی", { exact: true })).toBeVisible();
  });

  test("submits sample services and support and edits profile without crossing into real data", async ({ page }) => {
    await page.goto("/student/demo/services/welfare");
    await page.getByRole("button", { name: "ثبت درخواست آزمایشی" }).click();
    await expect(page.getByText("درخواست نمونه ثبت شد؛ تخصیص خدمت یا هزینه‌ای انجام نشده است.")).toBeVisible();

    await page.goto("/student/demo/support/new");
    await page.getByPlaceholder("برای مثال، مشکل مشاهده درس").fill("راهنمایی درباره دوره");
    await page.getByPlaceholder("مشکل را برای نسخه آزمایشی شرح بده…").fill("در فضای آزمایشی نیاز دارم درباره مسیر دوره راهنمایی شوم.");
    await page.getByRole("button", { name: "ثبت درخواست نمونه" }).click();
    await expect(page.getByText("تیکت نمونه ثبت شد؛ برای کارشناس واقعی ارسال نشده است.")).toBeVisible();
    await page.goto("/student/demo/support");
    await expect(page.getByText("راهنمایی درباره دوره")).toBeVisible();

    await page.goto("/student/demo/profile/edit");
    await page.getByRole("textbox", { name: "نام نمایشی" }).fill("دانش‌آموز آزمایش");
    await page.getByRole("button", { name: "ذخیره تغییرات" }).click();
    await expect(page.getByText("پروفایل نمونه به‌روزرسانی شد.")).toBeVisible();
    await page.goto("/student/demo/profile");
    await expect(page.getByText("دانش‌آموز آزمایش")).toBeVisible();
  });

  test("records demo course-team message and non-booking problem-solving request", async ({ page }) => {
    await page.goto("/student/demo/team/math-10");
    await expect(page.getByRole("heading", { name: "تیم دوره و پشتیبانی آموزشی" })).toBeVisible();
    await page.getByRole("link", { name: "گفت‌وگو" }).first().click();
    await page.getByRole("textbox", { name: "پیام آموزشی" }).fill("برای جلسه نهم ریاضی به مرور بیشتری نیاز دارم.");
    await page.getByRole("button", { name: "ثبت پیام نمونه" }).click();
    await expect(page.getByText("پیام نمونه ثبت شد؛ برای مربی یا مشاور واقعی ارسال نشده است.")).toBeVisible();
    await page.goto("/student/demo/problem-solving");
    await page.getByRole("button", { name: "ثبت درخواست جلسهٔ نمونه" }).click();
    await expect(page.getByText("درخواست جلسهٔ نمونه ثبت شد؛ وقت واقعی رزرو نشده است.")).toBeVisible();
  });
  test("renders five-tab RTL mobile app at narrow widths and exposes the manifest", async ({ page }) => {
    for (const width of [320, 375, 390]) {
      await page.setViewportSize({ width, height: 840 });
      await page.goto("/student/demo");
      await expect(page.getByRole("navigation", { name: "منوی پایین دانش‌آموز" })).toBeVisible();
      const noOverflow = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
      expect(noOverflow, "student app must not overflow at " + width).toBe(true);
    }
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/student/demo");
    const rtlLayout = await page.evaluate(() => {
      const sidebar = document.querySelector("aside")?.getBoundingClientRect();
      const main = document.querySelector("main")?.getBoundingClientRect();
      const logo = document.querySelector("header a[aria-label='دنا، خانه دانش‌آموز']")?.getBoundingClientRect();
      const actions = document.querySelector("header [dir='ltr']")?.getBoundingClientRect();
      return {
        sidebarOnRight: Boolean(sidebar && main && sidebar.left > main.left),
        logoOnRight: Boolean(logo && actions && logo.left > actions.left),
        documentDirection: document.documentElement.dir,
      };
    });
    expect(rtlLayout.sidebarOnRight).toBe(true);
    expect(rtlLayout.logoOnRight).toBe(true);
    const manifest = await page.request.get("/manifest.webmanifest");
    expect(manifest.status()).toBe(200);
    const body = await manifest.json();
    expect(body.start_url).toBe("/student/");
    expect(body.display).toBe("standalone");
    const demoManifest = await page.request.get("/student-demo.webmanifest");
    expect(demoManifest.status()).toBe(200);
    expect((await demoManifest.json()).start_url).toBe("/student/demo");
    const asset = await page.request.get("/student-app-icon.svg");
    expect(asset.status()).toBe(200);
    expect(await asset.text()).toContain("<svg");
  });
});
