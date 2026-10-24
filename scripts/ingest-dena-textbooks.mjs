#!/usr/bin/env node
import { createHash } from "node:crypto";
import { chmod, mkdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { join, resolve } from "node:path";

const OFFICIAL_HOSTS = new Set(["chap.sch.ir", "www.chap.sch.ir"]);
const MAX_PDF_BYTES = 150 * 1024 * 1024;
const USER_AGENT = "Dena-Textbook-Ingestion/1.0 (official educational content indexing)";

function args(argv) {
  const result = {};
  for (let i = 0; i < argv.length; i++) {
    if (!argv[i].startsWith("--") || !argv[i + 1]) throw new Error(`invalid argument: ${argv[i]}`);
    result[argv[i].slice(2)] = argv[++i];
  }
  for (const name of ["catalog", "book", "output"]) if (!result[name]) throw new Error(`--${name} is required`);
  return result;
}

function validateEntry(entry) {
  if (!entry || !/^[a-z0-9][a-z0-9-]{2,80}$/.test(entry.bookId ?? "")) throw new Error("invalid bookId");
  for (const field of ["title", "subject", "grade", "schoolYear", "edition"]) {
    if (typeof entry[field] !== "string" || !entry[field].trim()) throw new Error(`invalid ${field}`);
  }
  for (const [field, pathPattern] of [["sourcePageUrl", /^\/books\/\d+\/?$/], ["pdfUrl", /\//]]) {
    const value = entry[field];
    if (!value && field === "pdfUrl") throw new Error("pdfUrl is not yet recorded; copy it from the official book page");
    let url;
    try { url = new URL(value); } catch { throw new Error(`invalid ${field}`); }
    if (url.protocol !== "https:" || !OFFICIAL_HOSTS.has(url.hostname) || !pathPattern.test(url.pathname)) {
      throw new Error(`${field} must be an HTTPS URL on the official chap.sch.ir domain`);
    }
  }
}

async function sha256(path) {
  const hash = createHash("sha256");
  const { createReadStream } = await import("node:fs");
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest("hex");
}

async function fetchPdf(url, destination) {
  const response = await fetch(url, { headers: { "user-agent": USER_AGENT }, redirect: "manual", signal: AbortSignal.timeout(120_000) });
  if (response.status < 200 || response.status >= 300) throw new Error(`official source returned HTTP ${response.status}; redirects must be checked and recorded manually`);
  if (!OFFICIAL_HOSTS.has(new URL(response.url).hostname)) throw new Error("download left official textbook host");
  const length = Number(response.headers.get("content-length") ?? 0);
  if (length > MAX_PDF_BYTES) throw new Error("PDF exceeds 150 MiB limit");
  if (!response.body) throw new Error("empty response");
  let received = 0;
  const chunks = [];
  for await (const chunk of response.body) {
    received += chunk.length;
    if (received > MAX_PDF_BYTES) throw new Error("PDF exceeds 150 MiB limit");
    chunks.push(Buffer.from(chunk));
  }
  const data = Buffer.concat(chunks);
  if (!data.subarray(0, 5).equals(Buffer.from("%PDF-"))) throw new Error("official source did not return a PDF file");
  await writeFile(destination, data, { flag: "wx", mode: 0o600 });
}

function extractPdf(pdfPath) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn("pdftotext", ["-layout", "-enc", "UTF-8", pdfPath, "-"], { stdio: ["ignore", "pipe", "pipe"] });
    const stdout = [];
    const stderr = [];
    child.stdout.on("data", (chunk) => stdout.push(chunk));
    child.stderr.on("data", (chunk) => stderr.push(chunk));
    child.once("error", reject);
    child.once("close", (code) => code === 0
      ? resolvePromise(Buffer.concat(stdout).toString("utf8"))
      : reject(new Error(`pdftotext failed (${code}): ${Buffer.concat(stderr).toString("utf8").slice(0, 500)}`)));
  });
}

async function main() {
  const options = args(process.argv.slice(2));
  const catalogPath = resolve(options.catalog);
  const entries = (await readFile(catalogPath, "utf8")).split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
  const entry = entries.find((item) => item.bookId === options.book);
  if (!entry) throw new Error(`book not found in catalog: ${options.book}`);
  validateEntry(entry);
  const root = resolve(options.output);
  const bookRoot = join(root, entry.bookId);
  await mkdir(bookRoot, { recursive: true, mode: 0o700 });
  await chmod(bookRoot, 0o700);
  const tempPdfPath = join(bookRoot, `.source-${process.pid}.part`);
  try {
    await fetchPdf(entry.pdfUrl, tempPdfPath);
    const sourceHash = await sha256(tempPdfPath);
    const work = join(bookRoot, sourceHash);
    await mkdir(work, { recursive: true, mode: 0o700 });
    await chmod(work, 0o700);
    const pdfPath = join(work, "source.pdf");
    if (await stat(pdfPath).catch(() => null)) await rm(tempPdfPath, { force: true });
    else await rename(tempPdfPath, pdfPath);
    const fileStat = await stat(pdfPath);
    const text = await extractPdf(pdfPath);
    const pages = text.split("\f").map((pageText, index) => ({
      bookId: entry.bookId,
      title: entry.title,
      subject: entry.subject,
      grade: entry.grade,
      schoolYear: entry.schoolYear,
      edition: entry.edition,
      page: index + 1,
      sourcePageUrl: entry.sourcePageUrl,
      sourceSha256: sourceHash,
      extraction: "pdftotext-layout-v1",
      text: pageText.replace(/\r/g, "").trim(),
    })).filter((page) => page.text.length > 0);
    if (pages.length === 0) throw new Error("no text extracted; scanned pages require a separate OCR and human review pass");
    const pagesTemp = join(work, `.pages-${process.pid}.jsonl`);
    await writeFile(pagesTemp, `${pages.map((page) => JSON.stringify(page)).join("\n")}\n`, { mode: 0o600 });
    await rename(pagesTemp, join(work, "pages.jsonl"));
    const manifest = {
      schemaVersion: "dena-textbook-ingestion/v1",
      ...entry,
      pdfSha256: sourceHash,
      pdfBytes: fileStat.size,
      fetchedAt: new Date().toISOString(),
      extraction: "pdftotext-layout-v1",
      pageCount: pages.length,
      textPath: "pages.jsonl",
    };
    await writeFile(join(work, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, { mode: 0o600 });
    console.log(JSON.stringify({ bookId: entry.bookId, pageCount: pages.length, pdfBytes: fileStat.size, sha256: sourceHash, output: work }));
  } finally {
    await rm(tempPdfPath, { force: true });
  }
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });
