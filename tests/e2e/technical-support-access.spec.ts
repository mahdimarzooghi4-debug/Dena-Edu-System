import { expect, test } from "@playwright/test";

test.describe("technical support denies requests without an account", () => {
  test("both shared and operator inbox APIs fail closed with private caching", async ({ request }) => {
    const [tickets, inbox] = await Promise.all([
      request.get("/api/support/tickets"),
      request.get("/api/admin/support/tickets"),
    ]);
    expect(tickets.status()).toBe(401);
    expect(inbox.status()).toBe(401);
    expect(tickets.headers()["cache-control"]).toContain("no-store");
    expect(inbox.headers()["cache-control"]).toContain("no-store");
  });
});
