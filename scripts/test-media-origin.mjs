import { createServer } from "node:http";

// Fake private origin is localhost-only for disposable CI. It cannot be used as
// a customer video hosting service and MUST NOT be deployed.
if (process.env.DENA_DB_INTEGRATION !== "1") {
  throw new Error("Media mock requires the isolated integration environment");
}
const token = process.env.DENA_PRIVATE_MEDIA_ORIGIN_TOKEN;
if (!token || token.length < 16) throw new Error("Missing media integration token");

const bytes = Buffer.from("00000018667479706d7034326d703432", "hex");
const objectKey = /^\/private\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.mp4$/;
const server = createServer((request, response) => {
  response.setHeader("Cache-Control", "no-store");
  if (request.headers.authorization !== `Bearer ${token}`) {
    response.writeHead(401); response.end(); return;
  }
  if (request.method === "GET" && request.url === "/health") {
    response.writeHead(200); response.end("ok"); return;
  }
  if (request.method !== "GET" || !objectKey.test(request.url ?? "")) {
    response.writeHead(404); response.end(); return;
  }
  const range = request.headers.range;
  response.setHeader("Content-Type", "video/mp4");
  response.setHeader("Accept-Ranges", "bytes");
  if (range) {
    const match = /^bytes=(\d+)-(\d*)$/.exec(range);
    if (!match) { response.writeHead(416); response.end(); return; }
    const from = Number(match[1]);
    const to = match[2] ? Number(match[2]) : bytes.length - 1;
    if (from >= bytes.length || to < from || to >= bytes.length) {
      response.writeHead(416); response.end(); return;
    }
    const body = bytes.subarray(from, to + 1);
    response.writeHead(206, {
      "Content-Length": body.length,
      "Content-Range": `bytes ${from}-${to}/${bytes.length}`,
    });
    response.end(body); return;
  }
  response.writeHead(200, { "Content-Length": bytes.length });
  response.end(bytes);
});
server.listen(4318, "127.0.0.1");
