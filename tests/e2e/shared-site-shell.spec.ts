import { expect, test } from "@playwright/test";

const publicPages = [
  "/", "/courses", "/courses/physics-tenth", "/about", "/growth", "/elite-club", "/assessments",
  "/institutes/request", "/institutes/collaboration",
];

test("all public-site pages render the homepage footer with the same content and order", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  const homepage = page.locator("footer.dena-footer");
  const text = await homepage.innerText();
  const links = await homepage.locator("a").evaluateAll(
    (anchors) => anchors.map((node) => [node.textContent?.trim(), node.getAttribute("href")]),
  );
  const grid = await homepage.locator(".dena-footer__main").evaluate((node) => getComputedStyle(node).gridTemplateColumns);
  const footerColor = await homepage.locator(".dena-footer__brand p").evaluate((node) => getComputedStyle(node).color);
  const signupBackground = await page.locator('header.dena-header a[href="/signup"]').evaluate((node) => getComputedStyle(node).backgroundColor);
  expect(signupBackground).toBe("rgb(91, 76, 226)");
  expect(footerColor).toBe("rgb(117, 111, 131)");
  const height = (await homepage.boundingBox())!.height;
  for (const path of publicPages) {
    await page.goto(path);
    const footer = page.locator("footer.dena-footer");
    await expect(footer).toBeVisible();
    expect(await footer.innerText(), path).toBe(text);
    expect(await footer.locator("a").evaluateAll(
      (anchors) => anchors.map((node) => [node.textContent?.trim(), node.getAttribute("href")]),
    ), path).toEqual(links);
    expect(await footer.locator(".dena-footer__main").evaluate((node) => getComputedStyle(node).gridTemplateColumns), path).toBe(grid);
    expect((await footer.boundingBox())!.height, path).toBe(height);
    expect(await footer.locator(".dena-footer__brand p").evaluate((node) => getComputedStyle(node).color), path).toBe(footerColor);
    expect(await page.locator('header.dena-header a[href="/signup"]').evaluate((node) => getComputedStyle(node).backgroundColor), path).toBe(signupBackground);
    await expect(page.locator("header.dena-header .dena-header__app-icon")).toBeVisible();
  }
});

test("homepage footer, signup and download remain usable without horizontal overflow on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  for (const path of ["/", "/courses", "/courses/physics-tenth", "/about", "/growth", "/elite-club"]) {
    await page.goto(path);
    await expect(page.locator("footer.dena-footer .dena-footer__brand")).toContainText("دنا، بستر آموزش، یادگیری و رشد دانش‌آموزان نوآفرین ایران.");
    await expect(page.locator('header.dena-header a[href="/signup"]')).toBeVisible();
    await expect(page.locator('header.dena-header a[href="/download/android"]')).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, path).toBeLessThanOrEqual(2);
    const footerBrand = await page.locator(".dena-footer__brand").boundingBox();
    const logo = await page.locator("footer.dena-footer .dena-brand--footer").boundingBox();
    expect(footerBrand).not.toBeNull();
    expect(logo).not.toBeNull();
    expect(Math.abs(logo!.x + logo!.width - footerBrand!.x - footerBrand!.width), path).toBeLessThanOrEqual(2);
  }
});

test("Figma 139:68 course details reuses the exact homepage header and footer", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  const refHeader = page.locator("header.dena-header");
  const refFooter = page.locator("footer.dena-footer");
  const headerDimensions = await refHeader.boundingBox();
  const footerDimensions = await refFooter.boundingBox();
  const headerActionLinks = await refHeader.locator(".dena-header__actions a").evaluateAll(
    (anchors) => anchors.map((link) => [link.getAttribute("href"), link.textContent?.trim()]),
  );
  const footerText = await refFooter.innerText();
  const footerGrid = await refFooter.locator(".dena-footer__main").evaluate((el) => getComputedStyle(el).gridTemplateColumns);
  expect(headerDimensions).not.toBeNull();
  expect(footerDimensions).not.toBeNull();

  await page.goto("/courses/physics-tenth");
  const header = page.locator("header.dena-header");
  const footer = page.locator("footer.dena-footer");
  const actions = header.locator(".dena-header__actions");
  const signup = actions.locator('a[href="/signup"]');
  const download = actions.locator('a[href="/download/android"]');
  await expect(signup).toBeVisible();
  await expect(download).toBeVisible();
  await expect(download).toContainText("دانلود اپلیکیشن");
  await expect(header.locator('a[href="/login"]')).toBeVisible();
  expect((await header.boundingBox())!.height).toBe(headerDimensions!.height);
  expect(await actions.locator("a").evaluateAll(
    (anchors) => anchors.map((link) => [link.getAttribute("href"), link.textContent?.trim()]),
  )).toEqual(headerActionLinks);
  expect(await footer.innerText()).toBe(footerText);
  expect((await footer.boundingBox())!.height).toBe(footerDimensions!.height);
  expect(await footer.locator(".dena-footer__main").evaluate((el) => getComputedStyle(el).gridTemplateColumns)).toBe(footerGrid);
});

test("header highlights current public section rather than always highlighting home", async ({ page }) => {
  for (const [path, name] of [
    ["/", "خانه"],
    ["/courses", "دوره‌ها"],
    ["/courses/physics-tenth", "دوره‌ها"],
    ["/growth", "مسیر رشد"],
    ["/elite-club", "باشگاه نخبگان"],
  ]) {
    await page.goto(path);
    const nav = page.getByRole("navigation", { name: "ناوبری اصلی" });
    await expect(nav.locator('a[aria-current="page"]')).toHaveText(name);
    await expect(nav.locator("a.is-active")).toHaveCount(1);
  }
});
