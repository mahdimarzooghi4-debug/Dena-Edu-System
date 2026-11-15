import { expect, test } from "@playwright/test";

test("Dena homepage is Persian, RTL, and reflects launch readiness", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: "یک مسیر یکپارچه برای رشد تحصیلی" })).toBeVisible();
  await expect(page.getByText(/دورهٔ واقعی برای ثبت‌نام در این بخش منتشر نشده است/)).toBeVisible();
  await expect(page.getByRole("link", { name: "ثبت درخواست همکاری مؤسسه" })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.locator("html")).toHaveAttribute("lang", "fa");
});

test("institute application uses the protected role review workflow", async ({ page }) => {
  await page.goto("/institutes/request");
  await expect(page.getByRole("heading", { name: "درخواست همکاری مؤسسهٔ آموزشی" })).toBeVisible();
  await expect(page.getByRole("link", { name: "ورود و ثبت درخواست مؤسسه" })).toHaveAttribute(
    "href",
    "/login?next=%2Faccount%2Frole-applications",
  );
  await expect(page.locator('input[name="nationalId"]')).toHaveCount(0);
  await expect(page.locator('input[name="phone"]')).toHaveCount(0);
});

test("homepage keeps Android download only in the labeled header action", async ({ page }) => {
  await page.goto("/");
  const download = page.locator("header.dena-header a.dena-header__app-icon");
  await expect(download).toHaveAttribute("href", "/download/android");
  await expect(download).toContainText("دانلود اپلیکیشن");
  await expect(download.locator("svg")).toBeVisible();
  await expect(page.locator(".dena-hero a[href='/download/android']")).toHaveCount(0);
  await expect(page.locator(".dena-android-strip")).toHaveCount(0);
  await expect(page.locator("main a[href='/download/android']")).toHaveCount(1);
  await expect(page.locator(".dena-footer__brand")).toContainText("دنا، بستر آموزش، یادگیری و رشد دانش‌آموزان نوآفرین ایران.");
  await expect(page.locator(".dena-footer a[href='/download/android']")).toHaveCount(0);
});

test("shared public layout presents the same header download label and footer description", async ({ page }) => {
  await page.goto("/about");
  await expect(page.locator("header.dena-header a.dena-header__app-icon")).toContainText("دانلود اپلیکیشن");
  await expect(page.locator(".dena-footer__brand")).toContainText("دنا، بستر آموزش، یادگیری و رشد دانش‌آموزان نوآفرین ایران.");
  await expect(page.locator(".dena-footer a[href='/download/android']")).toHaveCount(0);
});

test("Android download header action stays visible on narrow mobile", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  await expect(page.locator("header.dena-header a.dena-header__app-icon")).toBeVisible();
  await expect(page.locator("header.dena-header a.dena-header__app-label")).toHaveCount(0);
  await expect(page.locator("header.dena-header .dena-header__app-label")).toHaveText("دانلود اپلیکیشن");
});
