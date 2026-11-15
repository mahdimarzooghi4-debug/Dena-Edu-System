import { expect, test } from "@playwright/test";

test("Dena homepage is Persian, RTL, and reflects launch readiness", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: "یک مسیر یکپارچه برای رشد تحصیلی" })).toBeVisible();
  await expect(page.getByText(/دورهٔ واقعی برای ثبت‌نام در این بخش منتشر نشده است/)).toBeVisible();
  await expect(page.getByRole("link", { name: "ثبت‌نام مؤسسه", exact: true })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.locator("html")).toHaveAttribute("lang", "fa");
});

test("institute application uses the protected role review workflow", async ({ page }) => {
  await page.goto("/institutes/request");
  await expect(page.getByRole("heading", { name: "درخواست همکاری مؤسسهٔ آموزشی" })).toBeVisible();
  await expect(page.getByRole("link", { name: "ورود و ثبت درخواست مؤسسه" })).toHaveAttribute(
    "href",
    "/login?next=%2Faccount%2Frole-applications",
  );
  await expect(page.locator('input[name="nationalId"]')).toHaveCount(0);
  await expect(page.locator('input[name="phone"]')).toHaveCount(0);
});

test("homepage keeps Android download only in the labeled header action", async ({ page }) => {
  await page.goto("/");
  const download = page.locator("header.dena-header a.dena-header__app-icon");
  await expect(download).toHaveAttribute("href", "/download/android");
  await expect(download).toContainText("دانلود اپلیکیشن");
  await expect(download.locator("svg")).toBeVisible();
  await expect(page.locator(".dena-hero a[href='/download/android']")).toHaveCount(0);
  await expect(page.locator(".dena-android-strip")).toHaveCount(0);
  await expect(page.locator("main a[href='/download/android']")).toHaveCount(1);
  await expect(page.locator(".dena-footer__brand")).toContainText("دنا، بستر آموزش، یادگیری و رشد دانش‌آموزان نوآفرین ایران.");
  await expect(page.locator(".dena-footer a[href='/download/android']")).toHaveCount(0);
});

test("shared public layout presents the same header download label and footer description", async ({ page }) => {
  await page.goto("/about");
  await expect(page.locator("header.dena-header a.dena-header__app-icon")).toContainText("دانلود اپلیکیشن");
  await expect(page.locator(".dena-footer__brand")).toContainText("اکوسیستم آموزشی دنا");
  await expect(page.locator(".dena-footer a[href='/download/android']")).toHaveCount(0);
});

test("Android download header action stays visible on narrow mobile", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  await expect(page.locator("header.dena-header a.dena-header__app-icon")).toBeVisible();
  await expect(page.locator("header.dena-header a.dena-header__app-label")).toHaveCount(0);
  await expect(page.locator("header.dena-header .dena-header__app-label")).toHaveText("دانلود اپلیکیشن");
});


test("Figma 59:5 homepage restores original imagery, section order and transparency content", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  const sectionClasses = await page.locator("main.dena-home > section").evaluateAll(
    (nodes) => nodes.map((node) => node.className),
  );
  expect(sectionClasses).toHaveLength(9);
  for (const section of [
    "dena-hero", "dena-how", "dena-courses", "dena-growth", "dena-network",
    "dena-roles", "dena-support", "dena-cta", "dena-institute-section",
  ]) {
    expect(sectionClasses.some((value) => typeof value === "string" && value.includes(section))).toBe(true);
  }
  for (const file of ["math-tenth.jpg", "physics-tenth.jpg", "chemistry-tenth.jpg"]) {
    const photo = page.locator('.home-course-card .home-course-card__photo[src*="' + file + '"]');
    await expect(photo).toBeVisible();
    expect(await photo.evaluate((img) => (img as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  }
  const art = page.locator('.dena-network img.network-art[src="/figma/dena-home/elite-network.svg"]');
  await expect(art).toBeVisible();
  expect(await art.evaluate((img) => (img as HTMLImageElement).naturalWidth)).toBe(580);
  await expect(page.locator(".dena-roles .role-card__icon-image")).toHaveCount(4);
  await expect(page.locator(".dena-ecosystem-hub")).toContainText("بستر اتصال و هماهنگی");
  await expect(page.getByRole("heading", { name: "شفافیت از انتخاب دوره تا مسیر رشد" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "شرایط پرداخت از قبل مشخص است" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "به اکوسیستم آموزشی دنا بپیوندید" })).toBeVisible();
  await expect(page.locator(".dena-courses")).toContainText("نمونهٔ نمایشی‌اند");
});

test("Figma 59:5 desktop section geometry remains close to design after custom download removal", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  const geometry: Array<[string, number]> = [
    ["header.dena-header", 80],
    [".dena-hero", 522],
    [".dena-how", 476],
    [".dena-courses", 802],
    [".dena-growth", 819],
    [".dena-network", 624],
    [".dena-roles", 855],
    [".dena-support", 478],
    [".dena-cta", 384],
    [".dena-institute-section", 440],
    ["footer.dena-footer", 378],
  ];
  for (const [selector, target] of geometry) {
    const rect = await page.locator("main.dena-home > " + selector).boundingBox();
    expect(rect, selector).not.toBeNull();
    const height = rect!.height;
    console.log("Figma 59:5", selector, "actual height", height, "target", target);
    expect(Math.abs(height - target), selector + " height differs from Figma").toBeLessThanOrEqual(48);
  }
});

test("Figma home artwork and hub do not overflow small screens", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  await expect(page.locator(".dena-ecosystem-hub")).toBeVisible();
  await expect(page.locator(".dena-institute-benefits")).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(2);
});

test("footer logo is anchored to the right edge of its brand column on desktop and mobile", async ({ page }) => {
  for (const viewport of [{ width: 1440, height: 900 }, { width: 375, height: 812 }]) {
    await page.setViewportSize(viewport);
    await page.goto("/");
    const brand = page.locator("footer.dena-footer .dena-footer__brand");
    const logo = brand.locator("a.dena-brand--footer");
    await expect(logo).toBeVisible();
    const brandBox = await brand.boundingBox();
    const logoBox = await logo.boundingBox();
    expect(brandBox).not.toBeNull();
    expect(logoBox).not.toBeNull();
    expect(Math.abs(logoBox!.x + logoBox!.width - brandBox!.x - brandBox!.width)).toBeLessThanOrEqual(2);
    await expect(brand.locator("p")).toHaveCSS("text-align", "right");
  }
});
