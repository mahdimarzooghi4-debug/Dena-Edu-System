const sweepUrl = process.env.DENA_LIVEKIT_QUOTA_SWEEP_URL;
const workerToken = process.env.DENA_LIVEKIT_QUOTA_WORKER_TOKEN;
if (process.env.DENA_LIVEKIT_ENABLED !== "1" || !workerToken || workerToken.length < 32) {
  throw new Error("LiveKit quota worker configuration is incomplete");
}
let target;
try { target = new URL(sweepUrl); } catch { throw new Error("LiveKit quota worker URL is invalid"); }
if (target.protocol !== "https:" || target.username || target.password || target.search || target.hash) {
  throw new Error("LiveKit quota worker URL must be HTTPS without credentials or query");
}

let stopping = false;
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => { stopping = true; });
}
const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

while (!stopping) {
  const startedAt = Date.now();
  try {
    const response = await fetch(target, {
      method: "POST",
      headers: { authorization: `Bearer ${workerToken}` },
      signal: AbortSignal.timeout(8_000),
      cache: "no-store",
    });
    if (!response.ok) {
      process.stderr.write(`LiveKit quota sweep unavailable (HTTP ${response.status})\n`);
    } else {
      const result = await response.json();
      process.stdout.write(`LiveKit quota sweep closed ${Number(result.closedRooms) || 0} room(s)\n`);
    }
  } catch {
    process.stderr.write("LiveKit quota sweep request failed\n");
  }
  await wait(Math.max(0, 1_000 - (Date.now() - startedAt)));
}
