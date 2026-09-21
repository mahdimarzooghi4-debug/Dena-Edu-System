import { randomInt } from "node:crypto";
import { eq } from "drizzle-orm";
import { expect, test } from "@playwright/test";
import { getDb } from "../../src/db";
import { user } from "../../src/db/schema";

test("mobile UI verifies OTP and creates student only, then signs out", async ({ page }) => {
  const token = process.env.DENA_SMS_GATEWAY_TOKEN;
  if (process.env.DENA_DB_INTEGRATION !== "1" || !token) throw new Error("OTP mock is required");
  const phone = `+989${String(randomInt(1_000_000_000)).padStart(9, "0")}`;
  let userId: string | undefined;
  try {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "ورود یا ثبت‌نام" })).toBeVisible();
    await page.getByLabel("شماره موبایل").fill("۰" + phone.slice(3).replace(/^9/, "9"));
    // The full pasted display value is a Persian-leading local 09... number.
    await page.getByLabel("شماره موبایل").fill("0" + phone.slice(3));
    await page.getByRole("button", { name: "دریافت کد تأیید" }).click();
    await expect(page.getByLabel("کد تأیید")).toBeVisible();

    const response = await fetch(
      `http://127.0.0.1:4317/__test__/code?phone=${encodeURIComponent(phone)}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    expect(response.status).toBe(200);
    const { code } = await response.json() as { code: string };
    await page.getByLabel("کد تأیید").fill(code);
    await page.getByRole("button", { name: "تأیید و ورود" }).click();
    await expect(page).toHaveURL(/\/account$/);
    await expect(page.getByRole("heading", { name: "به دنا خوش آمدید" })).toBeVisible();
    await expect(page.getByText("دانش‌آموز", { exact: true })).toBeVisible();
    await expect(page.getByText("ادمین", { exact: true })).toHaveCount(0);

    const identity = await page.request.get("/api/access/me", {
      headers: { Cookie: (await page.context().cookies())
        .map((cookie) => `${cookie.name}=${cookie.value}`).join("; ") },
    });
    expect(identity.status()).toBe(200);
    userId = (await identity.json()).userId as string;

    await page.getByRole("button", { name: "خروج از حساب" }).click();
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole("button", { name: "دریافت کد تأیید" })).toBeVisible();
    expect((await page.request.get("/api/access/me")).status()).toBe(401);
  } finally {
    if (userId) await getDb().delete(user).where(eq(user.id, userId));
  }
});
