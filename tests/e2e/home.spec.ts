import { expect, test } from "@playwright/test";

test("Dena homepage is Persian, RTL, and renders its current hero", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: "یک مسیر یکپارچه برای رشد تحصیلی" })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.locator("html")).toHaveAttribute("lang", "fa");
});
