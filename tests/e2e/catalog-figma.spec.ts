import { expect, test } from "@playwright/test";

test("Figma 134:37 catalog shows six RTL course cards and exact sample information", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/courses");
  await expect(page.getByRole("heading", { level: 1, name: "دوره مناسب مسیر یادگیری‌ات را پیدا کن" })).toBeVisible();
  const cards = page.locator(".dena-catalog-card");
  await expect(cards).toHaveCount(6);
  await expect(page.locator(".dena-catalog-results__label")).toHaveText("نمونه نمایشی دوره‌ها");
  await expect(cards.nth(0)).toContainText("شیمی دهم (کیهان و ساختار)");
  await expect(cards.nth(1)).toContainText("فیزیک دهم (مکانیک)");
  await expect(cards.nth(2)).toContainText("ریاضی دهم تجربی و ریاضی");
  await expect(cards.nth(3)).toContainText("زیست‌شناسی دهم (پایه و مفاهیم)");
  await expect(cards.nth(4)).toContainText("۱,۹۰۰,۰۰۰ تومان");
  await expect(cards.nth(4)).toContainText("مؤسسه ناظر: آموزشگاه اندیشه");
  await expect(cards.nth(5)).toContainText("مؤسسه فرهنگ و ادب");
  await expect(cards.nth(3).locator(".course-card__price span")).toHaveCount(0);
  await expect(cards.nth(5).locator(".course-card__price span")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "قبل از انتخاب دوره، اطلاعاتش را شفاف ببین" })).toBeVisible();
  await expect(page.locator(".dena-catalog-trust__grid article")).toHaveCount(3);
  await expect(page.locator(".dena-header__app-icon")).toContainText("دانلود اپلیکیشن");
  await expect(page.locator(".dena-footer__brand")).toContainText("دنا، بستر آموزش، یادگیری و رشد دانش‌آموزان نوآفرین ایران.");
});

test("catalog filtering and search affect demo cards without creating real orders", async ({ page }) => {
  await page.goto("/courses");
  await page.getByRole("combobox", { name: "درس" }).selectOption("physics");
  await expect(page).toHaveURL(/subject=physics/);
  await expect(page.locator(".dena-catalog-card")).toHaveCount(1);
  await expect(page.locator(".dena-catalog-card")).toContainText("فیزیک دهم");
  await page.getByRole("combobox", { name: "وضعیت ارائه‌دهنده" }).selectOption("licensed");
  await expect(page.locator(".dena-catalog-empty")).toBeVisible();
  await page.getByRole("link", { name: "پاک‌کردن فیلترها" }).click();
  await expect(page.locator(".dena-catalog-card")).toHaveCount(6);
  await expect(page.getByRole("combobox", { name: "درس" })).toHaveValue("");
  await expect(page.getByRole("combobox", { name: "وضعیت ارائه‌دهنده" })).toHaveValue("");
  await page.getByRole("searchbox", { name: "نام درس، دوره یا ارائه‌دهنده" }).fill("مبین");
  await page.getByRole("button", { name: "جست‌وجو در دوره‌های نمایشی" }).click();
  await expect(page.locator(".dena-catalog-card")).toHaveCount(1);
  await expect(page.locator(".dena-catalog-card")).toContainText("عربی دهم");
});

test("Figma 134:37 desktop geometry and intentionally blank course cover fills", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/courses");
  for (const [selector, expected] of [
    [".dena-catalog-intro", 368],
    [".dena-catalog-filter-section", 181],
    [".dena-catalog-results", 1262],
    [".dena-catalog-trust", 352],
  ] as const) {
    const box = await page.locator(selector).boundingBox();
    expect(box).not.toBeNull();
    console.log("Figma 134:37", selector, "actual", box!.height, "target", expected);
    expect(Math.abs(box!.height - expected), selector).toBeLessThanOrEqual(16);
  }
  const cardBox = await page.locator(".dena-catalog-card").first().boundingBox();
  expect(cardBox).not.toBeNull();
  expect(Math.abs(cardBox!.height - 559)).toBeLessThanOrEqual(3);
  expect(Math.abs(cardBox!.width - 405.33)).toBeLessThanOrEqual(3);
  const cover = page.locator(".dena-catalog-card__cover").first();
  await expect(cover).toHaveCSS("background-color", "rgb(255, 255, 255)");
  const pseudo = await cover.evaluate((node) => getComputedStyle(node, "::before").display);
  expect(pseudo).toBe("none");
  for (const asset of ["search.svg", "chevron-down.svg"]) {
    const img = page.locator('img[src*="' + asset + '"]').first();
    await expect(img).toBeAttached();
    expect(await img.evaluate((node) => (node as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  }
});

test("catalog fits mobile widths and leaves shared public footer right-aligned", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/courses");
  await expect(page.locator(".dena-catalog-card")).toHaveCount(6);
  await expect(page.getByRole("combobox", { name: "محدوده قیمت" })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(2);
  const brand = page.locator(".dena-footer__brand");
  const logo = brand.locator(".dena-brand--footer");
  const [brandBox, logoBox] = await Promise.all([brand.boundingBox(), logo.boundingBox()]);
  expect(brandBox).not.toBeNull();
  expect(logoBox).not.toBeNull();
  expect(Math.abs(logoBox!.x + logoBox!.width - brandBox!.x - brandBox!.width)).toBeLessThanOrEqual(2);
});
