import { expect, test } from "@playwright/test";

test("Dena foundation is Persian and RTL", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "زیرساخت فنی دنا" })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.locator("html")).toHaveAttribute("lang", "fa");
});
