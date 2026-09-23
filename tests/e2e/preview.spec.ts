import { expect, test } from "@playwright/test";

test("student preview matches dashboard sections without invented data", async ({ page }) => {
  await page.goto("/preview/student");
  await expect(page.getByRole("heading", { name: "یادگیری‌ات از همین‌جا ادامه دارد" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "نمای کلی یادگیری" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "ادامه یادگیری در دوره‌ها" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "تمرین، ارزیابی و مسیر رشد" })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.getByText("هنوز داده‌ای برای نمایش وجود ندارد")).toBeVisible();
  await expect(page.getByText("پیش‌نمایش رابط کاربری · بدون دادهٔ واقعی")).toBeVisible();
  await expect(page.locator('nav[aria-label="منوی پیش‌نمایش"]')).toBeVisible();
  await expect(page.getByText("۶۵٪")).toHaveCount(0);
  await expect(page.getByText("۲ دوره نمایشی")).toHaveCount(0);
});

test("student preview navigation stays within public preview namespace", async ({ page }) => {
  await page.goto("/preview/student");
  await page.getByRole("link", { name: "مشاهدهٔ پوستهٔ دوره‌های من" }).click();
  await expect(page).toHaveURL(/\/preview\/student\/courses$/);
  await expect(page.getByRole("heading", { name: "دوره‌های من" })).toBeVisible();
});

test("all six role previews are public static shells, not live panels", async ({ request }) => {
  for (const role of ["student", "institute", "provider", "admin", "organization", "benefactor"]) {
    const page = await request.get("/preview/" + role);
    expect(page.status()).toBe(200);
    const html = await page.text();
    expect(html).toContain("بدون دادهٔ واقعی");
  }
  const protectedStudentHome = await request.get("/student", { maxRedirects: 0 });
  expect(protectedStudentHome.status()).toBe(307);
  expect(protectedStudentHome.headers().location).toBe("/login");
  expect((await request.get("/admin")).status()).toBe(404);
});

test("shared support preview has no fake ticket form", async ({ page }) => {
  await page.goto("/preview/support");
  await expect(page.getByRole("heading", { name: "پشتیبانی فنی" })).toBeVisible();
  await expect(page.getByText("هنوز امکان ثبت یا مشاهدهٔ تیکت فعال نیست")).toBeVisible();
  await expect(page.getByRole("button", { name: /ثبت تیکت/ })).toHaveCount(0);
});

test("unknown preview roles and paths are not available", async ({ request }) => {
  expect((await request.get("/preview/invalid")).status()).toBe(404);
  expect((await request.get("/preview/student/unsupported")).status()).toBe(404);
});

test("keyboard skip link reaches main content", async ({ page }) => {
  await page.goto("/preview/student");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "رفتن به محتوای اصلی" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#main-content$/);
});
