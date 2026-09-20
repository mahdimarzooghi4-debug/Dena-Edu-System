import { expect, test } from "@playwright/test";

test("student preview is RTL and contains no invented counts", async ({ page }) => {
  await page.goto("/preview/student");
  await expect(page.getByRole("heading", { name: "خانه من" })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.getByText("هنوز داده‌ای برای نمایش وجود ندارد")).toBeVisible();
  await expect(page.getByText("پیش‌نمایش رابط کاربری · بدون دادهٔ واقعی")).toBeVisible();
  await expect(page.locator('nav[aria-label="منوی پیش‌نمایش"]')).toBeVisible();
});

test("shared support preview has no fake ticket form", async ({ page }) => {
  await page.goto("/preview/support");
  await expect(page.getByRole("heading", { name: "پشتیبانی فنی" })).toBeVisible();
  await expect(page.getByText("هنوز امکان ثبت یا مشاهدهٔ تیکت فعال نیست")).toBeVisible();
  await expect(page.getByRole("button", { name: /ثبت تیکت/ })).toHaveCount(0);
});

test("unknown preview roles and paths are not available", async ({ request }) => {
  expect((await request.get("/preview/invalid")).status()).toBe(404);
  expect((await request.get("/preview/student/unsupported")).status()).toBe(404);
});
