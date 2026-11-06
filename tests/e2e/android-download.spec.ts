import { expect, test } from "@playwright/test";

test("the Dena website exposes the Android download without login", async ({ page }) => {
  await page.goto("/");
  const lastHeaderAction = page.locator(".dena-header__actions > a").last();
  await expect(lastHeaderAction).toHaveAttribute("href", "/download/android");
  await expect(lastHeaderAction).toHaveAttribute("aria-label", "دانلود اپ اندروید دنا");
  await expect(lastHeaderAction.locator("svg")).toBeVisible();
  await expect(page.getByRole("link", { name: "دانلود اپ دانش‌آموز دنا" }))
    .toHaveAttribute("href", "/download/android");

  await page.goto("/download/android");
  await expect(page.getByRole("heading", { name: /اپ دانش‌آموز دنا/ })).toBeVisible();
  const apk = page.getByRole("link", { name: "دریافت فایل APK اندروید" });
  await expect(apk).toHaveAttribute("href",
    "https://github.com/mahdimarzooghi4-debug/Dena-Edu-System/releases/download/dena-student-demo-v0.1.1-preview/dena-student-android-demo.apk");
  await expect(page.getByText(/امضای دیباگ/)).toBeVisible();
  await expect(page.getByText(/اینترنت لازم است/)).toBeVisible();
  await expect(page.getByRole("link", { name: /SHA-256/ }))
    .toHaveAttribute("href", /\.apk\.sha256$/);
});

test("Android download page fits a narrow phone screen", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/download/android");
  await expect(page.getByRole("link", { name: "دریافت فایل APK اندروید" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "نحوهٔ نصب روی اندروید" })).toBeVisible();
  const noHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth <= window.innerWidth,
  );
  expect(noHorizontalOverflow).toBe(true);
});

test("the Android download is the last header action on public pages and mobile", async ({ page }) => {
  for (const route of ["/", "/download/android", "/courses"]) {
    await page.goto(route);
    const actions = page.locator(".dena-header__actions");
    await expect(actions.locator("a").last()).toHaveAttribute("href", "/download/android");
    await expect(page.getByRole("navigation", { name: "ناوبری اصلی" })
      .getByRole("link", { name: "دانلود اپ اندروید دنا" })).toHaveCount(0);
  }

  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  const last = page.locator(".dena-header__actions > a").last();
  await expect(last).toBeVisible();
  await last.click();
  await expect(page).toHaveURL(/\/download\/android$/);
  await expect(page.getByRole("heading", { name: /اپ دانش‌آموز دنا/ })).toBeVisible();
});
