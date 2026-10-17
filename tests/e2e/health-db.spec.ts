import { expect, request, test } from "@playwright/test";

test("liveness and readiness probes return safe operational status", async () => {
  const client = await request.newContext({ baseURL: "http://127.0.0.1:3000" });
  try {
    const live = await client.get("/api/health/live");
    expect(live.status()).toBe(200);
    expect(live.headers()["cache-control"]).toContain("no-store");
    expect(await live.json()).toEqual({ status: "ok" });

    const ready = await client.get("/api/health/ready");
    expect(ready.status()).toBe(200);
    expect(ready.headers()["cache-control"]).toContain("no-store");
    expect(await ready.json()).toEqual({ status: "ready" });
  } finally {
    await client.dispose();
  }
});
