import { expect, test } from "@playwright/test";

test("Figma 145:94 elite club landing reproduces all approved desktop sections", async ({ page }) => {
  await page.setViewportSize({ width:1440,height:900 });
  await page.goto("/elite-club");

  const root=page.getByTestId("dena-elite-club");
  await expect(root).toHaveAttribute("data-figma-node","145:94");
  await expect(root.getByRole("heading",{level:1,name:"استعدادها در کنار هم شکوفا می‌شوند"})).toBeVisible();
  await expect(root.getByText("باشگاه نخبگان دنا",{exact:true}).first()).toBeVisible();
  await expect(root.getByRole("heading",{name:"باشگاه نخبگان دنا؛ رشد از اتصال"})).toBeVisible();
  await expect(root.getByRole("heading",{name:"یک اکوسیستم؛ نقش‌های روشن"})).toBeVisible();
  await expect(root.getByRole("heading",{name:"استعداد و یادگیری، در یک مسیر به‌هم‌پیوسته"})).toBeVisible();
  await expect(root.getByRole("heading",{name:"رشد در کنار هم، در اکوسیستم دنا"})).toBeVisible();

  const pillars=root.locator(".dena-elite-club__pillar");
  await expect(pillars).toHaveCount(3);
  await expect(pillars.nth(0)).toContainText("نگاه نوآفرینانه");
  await expect(pillars.nth(1)).toContainText("ارتباط و هم‌افزایی");
  await expect(pillars.nth(2)).toContainText("رشد استعدادها");

  const roles=root.locator(".dena-elite-club__role");
  await expect(roles).toHaveCount(3);
  await expect(roles.nth(0)).toContainText("دانش‌آموز");
  await expect(roles.nth(1)).toContainText("مؤسسات و ارائه‌دهندگان");
  await expect(roles.nth(2)).toContainText("باشگاه نخبگان دنا");
  await expect(root.getByText("این صفحه معرفی اولیه باشگاه است؛ اطلاعات عضویت و برنامه‌های آن پس از نهایی‌شدن اعلام می‌شود.")).toBeVisible();

  await expect(root.getByRole("link",{name:"مسیر رشد دنا"}).first()).toHaveAttribute("href","/growth");
  await expect(root.getByRole("link",{name:"مشاهده دوره‌ها"})).toHaveAttribute("href","/courses");
  await expect(root.locator("form")).toHaveCount(0);

  const nav=page.getByRole("navigation",{name:"ناوبری اصلی"});
  await expect(nav.locator('a[aria-current="page"]')).toHaveText("باشگاه نخبگان");
  await expect(page.locator("header.dena-header a[href='/download/android']")).toBeVisible();
  await expect(page.locator("footer.dena-footer")).toBeVisible();
});

test("Figma 145:94 desktop geometry and exact local network illustration are preserved", async ({ page }) => {
  await page.setViewportSize({ width:1440,height:900 });
  await page.goto("/elite-club");

  const boxes=await Promise.all([
    page.locator("header.dena-header").boundingBox(),
    page.locator(".dena-elite-club__hero").boundingBox(),
    page.locator(".dena-elite-club__pillars").boundingBox(),
    page.locator(".dena-elite-club__ecosystem").boundingBox(),
    page.locator(".dena-elite-club__cta").boundingBox(),
    page.locator("footer.dena-footer").boundingBox(),
  ]);
  for(const box of boxes) expect(box).not.toBeNull();
  const [header,hero,pillars,ecosystem,cta,footer]=boxes as NonNullable<(typeof boxes)[number]>[];
  expect(header.height).toBe(80);
  expect(hero.height).toBe(624);
  expect(pillars.height).toBe(331);
  expect(ecosystem.height).toBe(459);
  expect(cta.height).toBe(377);
  expect(footer.height).toBe(378);
  expect(Math.round(header.height+hero.height+pillars.height+ecosystem.height+cta.height+footer.height)).toBe(2249);

  const art=page.locator(".dena-elite-club__art img");
  await expect(art).toHaveAttribute("src","/figma/dena-home/elite-network.svg");
  const asset=await art.evaluate((node)=>{
    const img=node as HTMLImageElement;
    return {complete:img.complete,width:img.naturalWidth,height:img.naturalHeight,renderedWidth:img.getBoundingClientRect().width,renderedHeight:img.getBoundingClientRect().height};
  });
  expect(asset.complete).toBe(true);
  expect(asset.width).toBe(580);
  expect(asset.height).toBe(480);
  expect(asset.renderedWidth).toBe(580);
  expect(asset.renderedHeight).toBe(480);

  const artBox=await page.locator(".dena-elite-club__art").boundingBox();
  const copyBox=await page.locator(".dena-elite-club__hero-copy").boundingBox();
  const rolesBox=await page.locator(".dena-elite-club__roles-card").boundingBox();
  const positioningBox=await page.locator(".dena-elite-club__positioning").boundingBox();
  expect(artBox).not.toBeNull(); expect(copyBox).not.toBeNull();
  expect(rolesBox).not.toBeNull(); expect(positioningBox).not.toBeNull();
  expect(Math.round(artBox!.x)).toBe(80);
  expect(Math.round(copyBox!.x)).toBe(780);
  expect(Math.round(rolesBox!.x)).toBe(80);
  expect(Math.round(positioningBox!.x)).toBe(780);
});

test("elite club keeps the shared site shell and all content within mobile and tablet widths",async({page})=>{
  for(const width of [320,375,768,1024,1440]){
    await page.setViewportSize({width,height:900});
    await page.goto("/elite-club");
    await expect(page.getByTestId("dena-elite-club")).toBeVisible();
    await expect(page.locator("header.dena-header a[href='/signup']")).toBeVisible();
    await expect(page.locator("header.dena-header a[href='/download/android']")).toBeVisible();
    await expect(page.locator("footer.dena-footer")).toBeVisible();
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
    expect(overflow,"horizontal overflow at "+width).toBeLessThanOrEqual(2);
    const hero=await page.locator(".dena-elite-club__hero").boundingBox();
    const cta=await page.locator(".dena-elite-club__cta").boundingBox();
    expect(hero).not.toBeNull(); expect(cta).not.toBeNull();
    expect(hero!.width).toBeLessThanOrEqual(width);
    expect(cta!.width).toBeLessThanOrEqual(width);
  }
});

test("elite club CTAs navigate only to the existing growth and course pages",async({page})=>{
  await page.goto("/elite-club");
  await page.getByRole("link",{name:"مسیر رشد دنا"}).first().click();
  await expect(page).toHaveURL(/\/growth$/);
  await expect(page.getByRole("heading",{name:"روند یادگیری‌ات را در طول زمان ببین"})).toBeVisible();
  await page.goto("/elite-club");
  await page.getByRole("link",{name:"مشاهده دوره‌ها"}).click();
  await expect(page).toHaveURL(/\/courses$/);
  await expect(page.getByRole("heading",{name:"دوره مناسب مسیر یادگیری‌ات را پیدا کن"})).toBeVisible();
});
