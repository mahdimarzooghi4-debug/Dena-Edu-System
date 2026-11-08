import { expect, test } from "@playwright/test";

test("student mobile home follows the approved Dena V2 shell and home screen", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/student-demo");

  await expect(page.locator("html")).toHaveAttribute("lang", "fa");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.getByRole("heading", { name: "سلام محمد 👋" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "معلم هوشمند" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "ریاضی دهم" }).first()).toBeVisible();
  await expect(page.getByText("حالت نمایش اپ دانش‌آموز")).toHaveCount(0);
  const studentNav = page.locator('nav[aria-label="منوی پایین دانش‌آموز"]');
  await expect(studentNav).toBeVisible();
  await expect(studentNav.getByRole("link", { name: "خانه" })).toHaveAttribute("href", "/student-demo");
  await expect(studentNav.getByRole("link", { name: "دوره‌ها" })).toHaveAttribute("href", "/student-demo/courses");
  const navHrefs = await studentNav.locator("a").evaluateAll(links => links.map(link => (link as HTMLAnchorElement).getAttribute("href")));
  expect(navHrefs.every(href => href?.startsWith("/student-demo"))).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("student courses and course detail use compact Figma cards", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/student-demo/courses");
  await expect(page.getByRole("heading", { name: "دوره‌های من" })).toBeVisible();
  await expect(page.getByText("دوره‌هایی که در آن‌ها ثبت‌نام کرده‌ای")).toBeVisible();
  await expect(page.getByRole("navigation", { name: "فیلتر دوره‌ها" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "ریاضی دهم" })).toBeVisible();
  await expect(page.getByText("۷۵٪ پیشرفت").first()).toBeVisible();
  await expect(page.getByText("۴۵٪ پیشرفت").first()).toBeVisible();
  await expect(page.getByText("تابع و نمودار · جلسه ۸ از ۲۴")).toBeVisible();
  await expect(page.getByText("آخرین فعالیت: امروز", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("جلسه ۸ از ۲۴").first()).toBeVisible();
  await expect(page.getByRole("link", { name: "ادامه یادگیری" }).first()).toBeVisible();

  await page.goto("/student-demo/courses/math-7");
  await expect(page.getByText("۲۹٪ پیشرفت")).toBeVisible();
  await expect(page.getByText("جلسه ۸ از ۲۴")).toBeVisible();
  await expect(page.getByText("استاد احمدی").first()).toBeVisible();
  await expect(page.getByText("سارا کریمی")).toBeVisible();
  await expect(page.getByText("مهدی رضایی")).toBeVisible();
  await expect(page.getByRole("heading", { name: "تیم آموزشی دوره" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "محتوای دوره" })).toBeVisible();
});

test("mobile recorded learning shows the player before the session list and supports notes tab", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/student-demo/courses/math-7/lessons/3");
  const player = page.getByRole("region", { name: "پخش ویدئوی آموزشی" });
  await expect(player).toBeVisible();
  const playerBox = await player.boundingBox();
  const sessionsHeading = page.getByRole("heading", { name: "محتوای این دوره" });
  const sessionsBox = await sessionsHeading.boundingBox();
  expect(playerBox).not.toBeNull();
  expect(sessionsBox).not.toBeNull();
  expect(playerBox!.y).toBeLessThan(sessionsBox!.y);

  await page.getByRole("link", { name: "یادداشت من" }).click();
  await expect(page.getByText("هنوز یادداشتی برای این جلسه ثبت نشده است.")).toBeVisible();
});

test("student assessments, growth and profile screens remain reachable on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const [path, heading] of [
    ["/student-demo/assessments", "تمرین‌ها و آزمون‌ها"],
    ["/student-demo/growth", "مسیر رشد من"],
    ["/student-demo/profile", "پروفایل کاربری"],
    ["/student-demo/elite-club", "باشگاه نخبگان"],
  ]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { name: heading }).first()).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
  await page.goto("/student-demo/growth");
  await expect(page.getByText("۴۲").first()).toBeVisible();
  await expect(page.getByText("+۲۶").first()).toBeVisible();
  await expect(page.getByText("۶۸").first()).toBeVisible();
  await page.goto("/student-demo/profile");
  await expect(page.getByText("محمد علوی").first()).toBeVisible();
  await expect(page.getByText("۰۹۱۲••••••••").first()).toBeVisible();
});
