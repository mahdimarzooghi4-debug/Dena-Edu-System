import { expect, test } from "@playwright/test";

test("site header's last icon links to a single Android APK download button", async ({ page }) => {
  await page.goto("/");
  const icon = page.locator(".dena-header__actions > a").last();
  await expect(icon).toHaveAttribute("href", "/download/android");
  await expect(icon).toHaveAttribute("aria-label", "دانلود اپ اندروید دنا");
  await expect(icon.locator("svg")).toBeVisible();

  await icon.click();
  await expect(page).toHaveURL(/\/download\/android$/);
  const button = page.getByRole("link", { name: "دانلود اپ اندروید دنا" });
  await expect(button).toBeVisible();
  await expect(button).toHaveAttribute("href", "/download/android/apk");
  await expect(button).toHaveAttribute("download", "dena-student-android-v0.1.4-preview.apk");
  await expect(page.locator("main a")).toHaveCount(1);
  await expect(page.locator("main button")).toHaveCount(0);
  await expect(page.locator("main h1, main h2, main p, main ul, main ol")).toHaveCount(0);
});

test("single download button is visible and tappable on a narrow Android phone", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await page.goto("/download/android");
  const button = page.getByRole("link", { name: "دانلود اپ اندروید دنا" });
  await expect(button).toBeVisible();
  const box = await button.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.width).toBeGreaterThanOrEqual(220);
  expect(box!.height).toBeGreaterThanOrEqual(48);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("Android icon remains the last header action on other public pages", async ({ page }) => {
  for (const path of ["/", "/courses", "/about"]) {
    await page.goto(path);
    const actions = page.locator(".dena-header__actions");
    await expect(actions.locator("a").last()).toHaveAttribute("href", "/download/android");
  }
});
