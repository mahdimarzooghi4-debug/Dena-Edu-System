import { expect, test } from "@playwright/test";

/**
 * Admin overview access contract.
 * Full authenticated fixtures are supplied by the DB-backed suites.
 * These checks document the required external behavior.
 */
test.describe("admin overview", () => {
  test("rejects unauthenticated overview API access", async ({ request }) => {
    const response = await request.get("/api/admin/overview");
    expect([401, 403]).toContain(response.status());
  });
});
