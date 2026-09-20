import { expect, test } from "@playwright/test";

test("mobile Persian menu opens, navigates, and closes without horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/preview/student");

  const menu = page.getByTestId("mobile-preview-menu");
  await expect(menu).toBeVisible();
  await expect(menu).not.toHaveAttribute("open");
  await expect(page.getByRole("navigation", { name: "منوی پیش‌نمایش موبایل" })).toBeHidden();

  await menu.locator("summary").click();
  await expect(menu).toHaveAttribute("open", "");
  const mobileNav = page.getByRole("navigation", { name: "منوی پیش‌نمایش موبایل" });
  await expect(mobileNav).toBeVisible();
  await mobileNav.getByRole("link", { name: "دوره‌های من" }).click();
  await expect(page).toHaveURL(/\/preview\/student\/courses$/);
  await expect(page.getByRole("heading", { name: "دوره‌های من" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("mobile menu is keyboard accessible", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/preview/institute");
  const menu = page.getByTestId("mobile-preview-menu");
  await menu.locator("summary").focus();
  await page.keyboard.press("Enter");
  await expect(menu).toHaveAttribute("open", "");
  await page.keyboard.press("Enter");
  await expect(menu).not.toHaveAttribute("open");
});

test("desktop sidebar retains role links and shared support entry", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/preview/benefactor");
  await expect(page.getByTestId("mobile-preview-menu")).toBeHidden();
  const nav = page.getByRole("navigation", { name: "منوی پیش‌نمایش", exact: true });
  await expect(nav).toBeVisible();
  await expect(nav.getByRole("link", { name: "پشتیبانی فنی مشترک" })).toHaveAttribute("href", "/preview/support");
  await expect(nav.getByRole("link", { name: "خانه خیر" })).toHaveAttribute("aria-current", "page");
});
