import { expect, test } from "@playwright/test";

test("Persian login explains when SMS is not configured and never simulates an OTP", async ({ page }) => {
  await page.goto("/login");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.getByRole("heading", { name: "ورود یا ثبت‌نام" })).toBeVisible();
  await expect(page.getByRole("status")).toContainText("ورود با پیامک در این محیط هنوز فعال نشده است");
  await expect(page.getByRole("button", { name: "دریافت کد تأیید" })).toBeDisabled();
  await expect(page.getByText("کد شما", { exact: false })).toHaveCount(0);
});

test("mobile login is readable at approved widths without horizontal overflow", async ({ page }) => {
  for (const width of [375, 390, 1440]) {
    await page.setViewportSize({ width, height: 840 });
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "ورود یا ثبت‌نام" })).toBeVisible();
    const overflow = await page.evaluate(() =>
      document.documentElement.scrollWidth > window.innerWidth + 1,
    );
    expect(overflow).toBe(false);
  }
});
