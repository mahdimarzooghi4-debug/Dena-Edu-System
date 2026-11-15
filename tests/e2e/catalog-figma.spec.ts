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
  await expect(page.getByTestId("dena-header-signup")).toBeVisible();
  await expect(page.locator(".dena-header__app-icon")).toHaveCount(0);
  await expect(page.locator(".dena-footer__brand")).toContainText("اکوسیستم آموزشی دنا");
});


test("Figma 134:37 header shows the exact login and visible 160px signup action", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/courses");
  const header = page.locator("header.dena-header");
  const actions = header.locator(".dena-header__actions--catalog");
  const login = actions.locator('a[href="/login"]');
  const signup = page.getByTestId("dena-header-signup");
  await expect(login).toBeVisible();
  await expect(login).toHaveText("ورود");
  await expect(signup).toBeVisible();
  await expect(signup).toHaveText("ثبت‌نام");
  await expect(signup).toHaveAttribute("href", "/signup");
  await expect(actions.locator(".dena-header__app-icon")).toHaveCount(0);
  const [actionsBox, loginBox, signupBox] = await Promise.all([
    actions.boundingBox(), login.boundingBox(), signup.boundingBox(),
  ]);
  expect(actionsBox).not.toBeNull();
  expect(loginBox).not.toBeNull();
  expect(signupBox).not.toBeNull();
  expect(actionsBox!.width).toBe(247);
  expect(Math.abs(actionsBox!.x - 80)).toBeLessThanOrEqual(1);
  expect(loginBox!.width).toBe(75);
  expect(signupBox!.width).toBe(160);
  expect(Math.abs(signupBox!.x - loginBox!.x - 87)).toBeLessThanOrEqual(1);
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
  await expect(page.getByTestId("dena-header-signup")).toBeVisible();
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


test("Figma 134:37 footer uses the design's 119×72 brand, true contact icons and exact desktop columns", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/courses");
  const footer = page.locator("footer.dena-footer");
  const brand = footer.locator(".dena-footer__brand");
  const logo = brand.locator("a.dena-brand--footer");
  const [footerBox, brandBox, logoBox] = await Promise.all([
    footer.boundingBox(), brand.boundingBox(), logo.boundingBox(),
  ]);
  expect(footerBox).not.toBeNull();
  expect(brandBox).not.toBeNull();
  expect(logoBox).not.toBeNull();
  expect(footerBox!.height).toBe(378);
  expect(brandBox!.width).toBe(340);
  expect(logoBox!.width).toBe(119);
  expect(logoBox!.height).toBe(72);
  expect(Math.abs((brandBox!.x + brandBox!.width) - (logoBox!.x + logoBox!.width))).toBeLessThanOrEqual(1);
  const legal = await footer.locator(".dena-footer__legal").boundingBox();
  expect(legal).not.toBeNull();
  expect(Math.abs(legal!.y - footerBox!.y - 299)).toBeLessThanOrEqual(2);
  await expect(brand).toContainText("اکوسیستم آموزشی دنا");
  const main = footer.locator(".dena-footer__main");
  const mainBox = await main.boundingBox();
  expect(mainBox).not.toBeNull();
  expect(mainBox!.width).toBe(1280);
  expect(mainBox!.height).toBe(195);
  const columns = [
    [".dena-footer__brand", 1020, 340],
    [".dena-footer__column--dena", 814, 150],
    [".dena-footer__column--collaboration", 578, 180],
    [".dena-footer__column--guide", 352, 170],
    [".dena-footer__contact", 80, 216],
  ] as const;
  for (const [selector, x, width] of columns) {
    const box = await footer.locator(selector).boundingBox();
    expect(box, selector).not.toBeNull();
    expect(Math.abs(box!.x - x), selector + " x").toBeLessThanOrEqual(1);
    expect(Math.abs(box!.width - width), selector + " width").toBeLessThanOrEqual(1);
  }
  for (const [selector, width] of [
    [".dena-footer__contact-row--phone", 170],
    [".dena-footer__contact-row--email", 170],
    [".dena-footer__contact-row--address", 208],
  ] as const) {
    const box = await footer.locator(selector).boundingBox();
    expect(box, selector).not.toBeNull();
    expect(box!.width).toBe(width);
  }
  await expect(footer.locator(".dena-footer__contact-row--phone")).toContainText("تلفن۰۲۱-۶۶۴۸۵۳۷۴");
  await expect(footer.locator(".dena-footer__contact-row--email")).toContainText("ایمیلinfo@denaes.ir");
  await expect(footer.locator(".dena-footer__contact-row--address")).toContainText("آدرسخیابان انقلاب، خیابان رازی، کوچه شهبازیان، پلاک ۲۲");
  await expect(footer.locator(".dena-footer__legal")).toHaveText("حقوق پلتفرم و هویت دنا محفوظ است. حقوق محتوای آموزشی هر دوره متعلق به مؤسسه یا ارائه‌دهنده آن است.");
  const footerLogo = brand.locator('img[src="/figma/dena-catalog/footer-logo.svg"]');
  await expect(footerLogo).toBeAttached();
  expect(await footerLogo.evaluate((node) => (node as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  const icons = footer.locator(".dena-footer__contact img");
  await expect(icons).toHaveCount(3);
  for (const icon of await icons.all()) {
    expect(await icon.evaluate((node) => (node as HTMLImageElement).naturalWidth)).toBe(16);
  }
  await expect(footer.locator('a[href="tel:+982166485374"]')).toBeVisible();
  await expect(footer.locator('a[href="mailto:info@denaes.ir"]')).toBeVisible();
});

test("Figma 134:37 trust cards preserve their distinct 151px and 130px heights", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/courses");
  const cards = page.locator(".dena-catalog-trust__grid article");
  await expect(cards).toHaveCount(3);
  for (const [index, expected] of [151, 130, 130].entries()) {
    const rect = await cards.nth(index).boundingBox();
    expect(rect).not.toBeNull();
    expect(rect!.height).toBe(expected);
  }
});
