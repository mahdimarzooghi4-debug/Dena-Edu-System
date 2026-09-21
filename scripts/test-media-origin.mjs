import { createHash } from "node:crypto";
import { createServer } from "node:http";

// LOCAL TEST DOUBLE only. This pretends to inspect/transcode for CI; it is
// emphatically NOT an antivirus, storage backend or production transcoder.
if (process.env.DENA_DB_INTEGRATION !== "1") {
  throw new Error("Media mock requires isolated DB integration");
}
const token = process.env.DENA_PRIVATE_MEDIA_ORIGIN_TOKEN;
if (!token || token.length < 16) throw new Error("Missing media integration token");

const fixture = Buffer.from("00000018667479706d7034326d70343269736f6d00000000", "hex");
const uuid = "[0-9a-f-]{36}";
const quarantined = new Map();
const inspections = new Map();
const privateAssets = new Map();
const health = "/health";
const reply = (res, status, data) => {
  res.writeHead(status, { "Content-Type": "application/json", "Cache-Control": "no-store" });
  res.end(JSON.stringify(data));
};

const server = createServer(async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.headers.authorization !== `Bearer ${token}`) {
    return reply(res, 401, { error: "Unauthorized" });
  }
  if (req.method === "GET" && req.url === health) return reply(res, 200, { ready: true });
  const quarantineMatch = new RegExp(`^/quarantine/(${uuid})$`).exec(req.url ?? "");
  if (req.method === "PUT" && quarantineMatch) {
    if (req.headers["content-type"] !== "video/mp4") return reply(res, 400, {});
    let length = 0;
    const chunks = [];
    for await (const part of req) {
      length += part.length;
      if (length > 8 * 1024 * 1024) return reply(res, 413, {});
      chunks.push(part);
    }
    const bytes = Buffer.concat(chunks);
    const digest = createHash("sha256").update(bytes).digest("hex");
    if (req.headers["x-dena-sha256"] !== digest) return reply(res, 400, {});
    quarantined.set(quarantineMatch[1], bytes);
    return reply(res, 201, { quarantined: true });
  }

  // Explicit CI test action, NOT a real scan. Only existing quarantined bytes
  // can be marked processed in the fake backend.
  const processMatch = new RegExp(`^/__test__/process/(${uuid})$`).exec(req.url ?? "");
  if (req.method === "POST" && processMatch) {
    const bytes = quarantined.get(processMatch[1]);
    if (!bytes) return reply(res, 404, {});
    let body = "";
    for await (const part of req) {
      body += part;
      if (body.length > 512) return reply(res, 413, {});
    }
    let input;
    try { input = JSON.parse(body); } catch { return reply(res, 400, {}); }
    if (!new RegExp(`^${uuid}$`).test(input.courseId) ||
        !new RegExp(`^${uuid}$`).test(input.assetId)) return reply(res, 400, {});
    const assetKey = `${input.courseId}/${input.assetId}.mp4`;
    const report = {
      sha256: createHash("sha256").update(bytes).digest("hex"),
      bytes: bytes.length,
      malware: "clean", transcoded: true, format: "mp4", assetKey,
    };
    inspections.set(processMatch[1], report);
    privateAssets.set(assetKey, bytes);
    return reply(res, 200, { processed: true });
  }
  const inspectionMatch = new RegExp(`^/inspection/(${uuid})$`).exec(req.url ?? "");
  if (req.method === "GET" && inspectionMatch) {
    const report = inspections.get(inspectionMatch[1]);
    return report ? reply(res, 200, report) : reply(res, 404, {});
  }

  const mediaMatch = new RegExp(`^/private/(${uuid}/${uuid}\\.mp4)$`).exec(req.url ?? "");
  if (!mediaMatch || !["GET", "HEAD"].includes(req.method ?? "")) return reply(res, 404, {});
  const bytes = privateAssets.get(mediaMatch[1]) ?? fixture;
  res.setHeader("Content-Type", "video/mp4");
  res.setHeader("Accept-Ranges", "bytes");
  if (req.method === "HEAD") {
    res.writeHead(200, { "Content-Length": bytes.length }); res.end(); return;
  }
  const range = req.headers.range;
  if (range) {
    const match = /^bytes=(\d+)-(\d*)$/.exec(range);
    if (!match) { res.writeHead(416); res.end(); return; }
    const from = Number(match[1]);
    const to = match[2] ? Number(match[2]) : bytes.length - 1;
    if (from >= bytes.length || to < from || to >= bytes.length) {
      res.writeHead(416); res.end(); return;
    }
    const part = bytes.subarray(from, to + 1);
    res.writeHead(206, {
      "Content-Length": part.length,
      "Content-Range": `bytes ${from}-${to}/${bytes.length}`,
    });
    res.end(part); return;
  }
  res.writeHead(200, { "Content-Length": bytes.length });
  res.end(bytes);
});
server.listen(4318, "127.0.0.1");
