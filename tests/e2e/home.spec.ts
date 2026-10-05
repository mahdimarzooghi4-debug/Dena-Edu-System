import { expect, test } from "@playwright/test";

test("Dena homepage is Persian, RTL, and reflects launch readiness", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: "یک مسیر یکپارچه برای رشد تحصیلی" })).toBeVisible();
  await expect(page.getByText("در حال حاضر دوره‌ای برای ثبت‌نام منتشر نشده است.")).toBeVisible();
  await expect(page.getByRole("link", { name: "ثبت درخواست همکاری مؤسسه" })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.locator("html")).toHaveAttribute("lang", "fa");
});
