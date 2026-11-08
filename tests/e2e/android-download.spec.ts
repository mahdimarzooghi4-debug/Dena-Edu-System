import { expect, test } from "@playwright/test";
import { denaAndroidPreview as preview } from "../../src/lib/dena-android-download";

test("public website links to an APK information page, not a public download", async ({ page }) => {
  await page.goto("/");
  const icon = page.locator(".dena-header__actions > a").last();
  await expect(icon).toHaveAttribute("href", "/download/android");
  await expect(icon).toHaveAttribute("aria-label", "دانلود اپ اندروید دنا");
  await icon.click();
  await expect(page).toHaveURL(/\/download\/android$/);
  await expect(page.getByRole("heading", { name: "انتشار عمومی اپ اندروید هنوز تأیید نشده است" })).toBeVisible();
  await expect(page.getByRole("link", { name: "مشاهده نسخه نمایشی دنا" })).toBeVisible();
  await expect(page.getByRole("link", { name: "دانلود اپ اندروید دنا" })).toHaveCount(0);
});

test("APK routes and former static path fail closed without release approval", async ({ request }) => {
  expect((await request.get("/download/android/apk")).status()).toBe(503);
  expect((await request.get("/download/android/checksum")).status()).toBe(503);
  expect((await request.get(`/downloads/${preview.localFile}`)).status()).toBe(404);
});

test("unapproved download page remains readable on Android phone width", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await page.goto("/download/android");
  await expect(page.getByRole("heading", { name: "انتشار عمومی اپ اندروید هنوز تأیید نشده است" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("Android information link remains in public headers", async ({ page }) => {
  for (const path of ["/", "/courses", "/about"]) {
    await page.goto(path);
    await expect(page.locator(".dena-header__actions > a").last()).toHaveAttribute("href", "/download/android");
  }
});
