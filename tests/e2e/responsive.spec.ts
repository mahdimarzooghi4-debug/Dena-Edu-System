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
  await expect(nav.getByRole("link", { name: "داشبورد" })).toHaveAttribute("aria-current", "page");
});

test("all role preview shells fit narrow mobile and desktop viewports", async ({ page }) => {
  for (const width of [320, 375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const role of ["student", "institute", "provider", "admin", "organization", "benefactor"]) {
      await page.goto(`/preview/${role}`);
      await expect(page.getByRole("main")).toBeVisible();
      await expect(page.getByText("پیش‌نمایش رابط کاربری · بدون دادهٔ واقعی")).toBeVisible();
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
        `${role} preview should not overflow at ${width}px`,
      ).toBe(true);
      if (width < 1024) {
        await expect(page.getByTestId("mobile-preview-menu")).toBeVisible();
      } else {
        await expect(page.getByTestId("mobile-preview-menu")).toBeHidden();
        await expect(page.getByRole("navigation", { name: "منوی پیش‌نمایش", exact: true })).toBeVisible();
      }
    }
  }
});

test("role preview landmarks and navigation work with keyboard in RTL", async ({ page }) => {
  for (const role of ["student", "institute", "provider", "admin", "organization", "benefactor"]) {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`/preview/${role}`);
    await expect(page.locator("html")).toHaveAttribute("lang", "fa");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await page.keyboard.press("Tab");
    const skipLink = page.getByRole("link", { name: "رفتن به محتوای اصلی" });
    await expect(skipLink).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/#main-content$/);
    await expect(page.getByRole("main")).toBeVisible();

    const desktopNav = page.getByRole("navigation", { name: "منوی پیش‌نمایش", exact: true });
    await expect(desktopNav.getByRole("link", { name: "داشبورد" })).toHaveAttribute("aria-current", "page");

    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`/preview/${role}`);
    const mobileMenu = page.getByTestId("mobile-preview-menu");
    const summary = mobileMenu.locator("summary");
    await summary.focus();
    await page.keyboard.press("Enter");
    await expect(mobileMenu).toHaveAttribute("open", "");
    await page.keyboard.press("Tab");
    await expect(page.getByRole("navigation", { name: "منوی پیش‌نمایش موبایل" })
      .getByRole("link", { name: "داشبورد" })).toBeFocused();
  }
});
