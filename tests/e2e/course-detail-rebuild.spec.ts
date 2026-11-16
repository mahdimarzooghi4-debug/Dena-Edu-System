import { expect, test } from "@playwright/test";

const demoCourses = [
  ["chemistry-tenth","شیمی دهم","chemistry"],
  ["physics-tenth","فیزیک دهم","physics"],
  ["math-tenth","ریاضی دهم","math"],
  ["biology-tenth","زیست‌شناسی دهم","biology"],
  ["arabic-tenth","عربی دهم","arabic"],
  ["literature-tenth","ادبیات فارسی دهم","literature"],
] as const;

test("Figma 139:68 rebuilt physics detail has the original complete section sequence", async ({ page }) => {
  await page.setViewportSize({ width:1440,height:900 });
  await page.goto("/courses/physics-tenth");
  const detail=page.getByTestId("dena-course-detail");
  await expect(detail.getByRole("heading",{level:1,name:"فیزیک دهم (مکانیک)"})).toBeVisible();
  for(const heading of [
    "پس از این دوره چه می‌آموزی؟",
    "سرفصل‌ها و جلسات دوره",
    "تمرین و ارزیابی در مسیر یادگیری",
    "این دوره چگونه به مسیر پیشرفتت متصل می‌شود؟",
    "ارائه‌دهنده این دوره",
    "سؤالات متداول",
    "آماده‌ای یادگیری را شروع کنی؟",
  ]) await expect(detail.getByRole("heading",{name:heading})).toBeVisible();
  await expect(detail.locator(".dena-course-detail__outcome")).toHaveCount(6);
  await expect(detail.locator(".dena-course-detail__chapter")).toHaveCount(4);
  await expect(detail.locator(".dena-course-detail__features > div")).toHaveCount(3);
  await expect(detail.locator(".dena-course-detail__faqs details")).toHaveCount(5);
  const hero=await detail.locator(".dena-course-detail__hero").boundingBox();
  const media=await detail.locator(".dena-course-detail__media-column").boundingBox();
  const copy=await detail.locator(".dena-course-detail__hero-copy").boundingBox();
  expect(hero).not.toBeNull(); expect(media).not.toBeNull(); expect(copy).not.toBeNull();
  expect(hero!.height).toBeGreaterThanOrEqual(700);
  expect(media!.x + media!.width).toBeLessThan(copy!.x);
  await expect(page.locator('header.dena-header a[href="/signup"]')).toBeVisible();
  await expect(page.locator('header.dena-header a[href="/download/android"]')).toBeVisible();
  await expect(page.locator("footer.dena-footer")).toBeVisible();
});

test("course curriculum and FAQ accordions really open and close", async ({ page }) => {
  await page.goto("/courses/physics-tenth");
  const chapters=page.locator(".dena-course-detail__chapter");
  await expect(chapters.first()).toHaveAttribute("open","");
  await expect(chapters.nth(1)).not.toHaveAttribute("open","");
  await chapters.nth(1).locator("summary").click();
  await expect(chapters.nth(1)).toHaveAttribute("open","");
  await expect(chapters.nth(1)).toContainText("جلسه ۳: مکان، جابه‌جایی و سرعت");
  const faq=page.locator(".dena-course-detail__faqs details");
  await expect(faq.first()).toHaveAttribute("open","");
  await faq.nth(1).locator("summary").click();
  await expect(faq.nth(1)).toHaveAttribute("open","");
});

test("all six demo courses have local illustrated covers and their own titles", async ({ page }) => {
  await page.goto("/courses");
  const cardCovers=page.locator(".dena-catalog-card__cover");
  await expect(cardCovers).toHaveCount(6);
  const asset=await page.request.get("/course-covers/dena-course-art.svg");
  expect(asset.status()).toBe(200);
  expect((await asset.body()).byteLength).toBeGreaterThan(4000);
  for(const [index,[id,title,subject]] of demoCourses.entries()){
    await expect(cardCovers.nth(index)).toHaveAttribute("data-subject",subject);
    expect(await cardCovers.nth(index).evaluate((node)=>getComputedStyle(node).backgroundImage)).toContain("/course-covers/dena-course-art.svg");
    await page.goto("/courses/"+id);
    await expect(page.getByRole("heading",{level:1})).toContainText(title);
    const cover=page.locator(".dena-course-detail__cover");
    await expect(cover).toHaveAttribute("data-subject",subject);
    expect(await cover.evaluate((node)=>getComputedStyle(node).backgroundImage)).toContain("/course-covers/dena-course-art.svg");
    await page.goto("/courses");
  }
});

test("non-installment demos never advertise a fictional installment option", async ({ page }) => {
  for(const id of ["biology-tenth","literature-tenth"]){
    await page.goto("/courses/"+id);
    await expect(page.locator(".dena-course-detail__price")).not.toContainText("۴ قسط");
    await expect(page.locator(".dena-course-detail__demo-notice")).toContainText("خرید، پرداخت یا ثبت‌نام واقعی انجام نمی‌شود");
  }
});

test("unknown course id never silently opens the physics demonstration",async({page})=>{
  await page.goto("/courses/nonexistent-course");
  await expect(page.getByRole("heading",{level:1,name:"دوره موردنظر پیدا نشد"})).toBeVisible();
  await expect(page.getByRole("heading",{name:"فیزیک دهم (مکانیک)"})).toHaveCount(0);
});

test("rebuilt course details fit phone, tablet and desktop without horizontal overflow",async({page})=>{
  for(const width of [375,768,1024,1440]){
    await page.setViewportSize({width,height:900});
    await page.goto("/courses/physics-tenth");
    await expect(page.locator(".dena-course-detail__cover")).toBeVisible();
    await expect(page.locator(".dena-course-detail__registration")).toBeVisible();
    await expect(page.locator("footer.dena-footer")).toBeVisible();
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
    expect(overflow,"width "+width).toBeLessThanOrEqual(2);
  }
});
