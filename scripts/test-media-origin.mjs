import { createHash, createHmac } from "node:crypto";
import { createServer } from "node:http";

// LOCAL TEST DOUBLE only. This pretends to inspect/transcode for CI; it is
// emphatically NOT an antivirus, storage backend or production transcoder.
if (process.env.DENA_DB_INTEGRATION !== "1") {
  throw new Error("Media mock requires isolated DB integration");
}
const token = process.env.DENA_PRIVATE_MEDIA_ORIGIN_TOKEN;
if (!token || token.length < 16) throw new Error("Missing media integration token");
const signer = process.env.DENA_MEDIA_ATTESTATION_HMAC_KEY;
const signerId = process.env.DENA_MEDIA_ATTESTATION_KEY_ID;
if (!signer || signer.length < 32 || !signerId ||
    signer === token || signer === process.env.DENA_MEDIA_PROCESSOR_TOKEN) {
  throw new Error("Missing independent MOCK attestation signer");
}
const fields = [
  "version", "keyId", "uploadId", "sourceBytes", "sourceSha256",
  "outputBytes", "outputSha256", "outputKey", "scanner",
  "processorVersion", "scannedAt", "malware", "format",
];

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
    // Changed bytes exercise input/output digest separation, NOT transcoding.
    const output = Buffer.concat([bytes, Buffer.from([0, 0, 0, 0])]);
    const report = {
      version: 1, keyId: signerId, uploadId: processMatch[1],
      sourceBytes: bytes.length,
      sourceSha256: createHash("sha256").update(bytes).digest("hex"),
      outputBytes: output.length,
      outputSha256: createHash("sha256").update(output).digest("hex"),
      outputKey: assetKey,
      scanner: "ci-mock-not-antivirus",
      processorVersion: "ci-mock-not-transcoder", scannedAt: Date.now(),
      malware: "clean", format: "mp4",
    };
    const signature = createHmac("sha256", signer)
      .update("dena-media-attestation-v1\n")
      .update(JSON.stringify(fields.map((field) => report[field])))
      .digest("hex");
    inspections.set(processMatch[1], { ...report, signature });
    privateAssets.set(assetKey, output);
    return reply(res, 200, { processed: true });
  }
  // CI-only report tampering; this double is NEVER a real scanner.
  const corruptMatch = new RegExp(`^/__test__/corrupt/(${uuid})$`).exec(req.url ?? "");
  if (req.method === "POST" && corruptMatch) {
    const report = inspections.get(corruptMatch[1]);
    if (!report) return reply(res, 404, {});
    inspections.set(corruptMatch[1], { ...report, outputSha256: "0".repeat(64) });
    return reply(res, 200, { corrupted: true });
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
    res.writeHead(200, {
      "Content-Length": bytes.length,
      "X-Dena-Sha256": createHash("sha256").update(bytes).digest("hex"),
      "X-Dena-Private": "1",
    }); res.end(); return;
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
