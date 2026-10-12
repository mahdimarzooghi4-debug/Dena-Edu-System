import { createServer } from "node:http";

// Localhost-only mock; NEVER deploy this test server or expose OTP retrieval.
if (process.env.DENA_DB_INTEGRATION !== "1") {
  throw new Error("Test SMS gateway requires disposable DB integration environment");
}
const token = process.env.DENA_SMS_GATEWAY_TOKEN;
if (!token || token.length < 16) throw new Error("Missing test SMS secret");

const sent = new Map();
const server = createServer(async (req, res) => {
  const reply = (status, body) => {
    res.writeHead(status, { "Content-Type": "application/json", "Cache-Control": "no-store" });
    res.end(JSON.stringify(body));
  };
  if (req.headers.authorization !== `Bearer ${token}`) {
    return reply(401, { error: "Unauthorized" });
  }
  if (req.method === "GET" && req.url === "/health") return reply(200, { ready: true });
  if (req.method === "GET" && req.url?.startsWith("/__test__/code?")) {
    const phone = new URL(req.url, "http://127.0.0.1:4317").searchParams.get("phone");
    const code = sent.get(phone);
    return code ? reply(200, { code }) : reply(404, { error: "Not found" });
  }
  if (req.method !== "POST" || req.url !== "/send") return reply(404, {});
  let body = "";
  for await (const part of req) {
    body += part;
    if (body.length > 512) return reply(413, {});
  }
  let data;
  try { data = JSON.parse(body); } catch { return reply(400, {}); }
  if (!/^\+989\d{9}$/.test(data.phoneNumber) || !/^\d{6}$/.test(data.code)) {
    return reply(400, {});
  }
  sent.set(data.phoneNumber, data.code);
  return reply(200, { accepted: true });
});
server.listen(4317, "127.0.0.1");
