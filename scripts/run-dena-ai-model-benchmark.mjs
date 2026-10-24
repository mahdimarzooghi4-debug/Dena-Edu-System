#!/usr/bin/env node
/**
 * Calls a loopback OpenAI-compatible model server with local synthetic cases.
 * Never logs prompts, contexts, or model answers. Active-exam cases are blocked
 * locally and are never sent to the model.
 */
import { lstat, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { evaluateFiles, evaluateResponses } from "./evaluate-dena-ai-responses.mjs";

const MAX_FILE_BYTES = 16 * 1024 * 1024;
const MAX_CASES = 500;
const MAX_PROMPT_CHARS = 20_000;
const MAX_CONTEXT_CHARS = 100_000;
const SYSTEM_PROMPT = [
  "You are an educational tutor in a controlled evaluation.",
  "Use only the supplied source context. If it does not support an answer, abstain.",
  "Return exactly one JSON object with keys decision, answer, citations.",
  "decision must be answered or abstained. citations must contain only source references present in the context.",
].join(" ");

function hasExactKeys(value, expected) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  return actual.length === wanted.length && actual.every((key, i) => key === wanted[i]);
}

function validLoopbackBaseUrl(value) {
  let url;
  try { url = new URL(value); } catch { return false; }
  if (url.protocol !== "http:" || url.username || url.password || url.search || url.hash) return false;
  const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  return (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1") &&
    url.pathname.replace(/\/$/, "") === "/v1";
}

function parseJsonl(text, kind) {
  const rows = [];
  const errors = [];
  for (const [index, line] of text.split(/\r?\n/).entries()) {
    if (!line.trim()) continue;
    try { rows.push(JSON.parse(line)); }
    catch { errors.push(`${kind}:${index + 1}:invalid_json`); }
    if (errors.length >= 50) break;
  }
  return { rows, errors };
}

async function readLocalJsonl(path, kind) {
  const absolute = resolve(path);
  const info = await lstat(absolute).catch(() => null);
  if (!info?.isFile() || info.isSymbolicLink()) return { rows: [], errors: [`${kind}:not_a_regular_file`] };
  if (info.size > MAX_FILE_BYTES) return { rows: [], errors: [`${kind}:file_too_large`] };
  return parseJsonl(await readFile(absolute, "utf8"), kind);
}

function validatePrompts(prompts) {
  const errors = [];
  const ids = new Set();
  if (!Array.isArray(prompts) || prompts.length === 0 || prompts.length > MAX_CASES) {
    return ["prompts:count_invalid"];
  }
  prompts.forEach((item, index) => {
    if (!hasExactKeys(item, ["caseId", "prompt", "context"])) {
      errors.push(`prompt:${index + 1}:keys_or_shape_invalid`);
      return;
    }
    if (typeof item.caseId !== "string" || !/^[A-Za-z0-9][A-Za-z0-9._:-]{2,127}$/.test(item.caseId)) {
      errors.push(`prompt:${index + 1}:id_invalid`);
    } else if (ids.has(item.caseId)) errors.push(`prompt:${index + 1}:duplicate_id`);
    else ids.add(item.caseId);
    if (typeof item.prompt !== "string" || !item.prompt.trim() || item.prompt.length > MAX_PROMPT_CHARS) {
      errors.push(`prompt:${index + 1}:prompt_invalid`);
    }
    if (typeof item.context !== "string" || item.context.length > MAX_CONTEXT_CHARS) {
      errors.push(`prompt:${index + 1}:context_invalid`);
    }
  });
  return errors;
}

function parseModelJson(content) {
  if (typeof content !== "string") return null;
  try {
    const parsed = JSON.parse(content);
    if (!hasExactKeys(parsed, ["decision", "answer", "citations"])) return null;
    if (!(["answered", "abstained"].includes(parsed.decision)) ||
        typeof parsed.answer !== "string" || parsed.answer.length > 20_000 ||
        !Array.isArray(parsed.citations) || parsed.citations.length > 20 ||
        parsed.citations.some((item) => typeof item !== "string" || item.length > 256)) return null;
    return parsed;
  } catch { return null; }
}

async function callModel({ baseUrl, apiKey, model, prompt, context, timeoutMs, fetchImpl = fetch }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const headers = { "Content-Type": "application/json" };
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
  const started = performance.now();
  try {
    const response = await fetchImpl(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers,
      signal: controller.signal,
      body: JSON.stringify({
        model,
        temperature: 0,
        max_tokens: 1200,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `Source context:\n${context}\n\nQuestion:\n${prompt}` },
        ],
      }),
    });
    if (!response.ok) return { error: "model:http_error", latencyMs: Math.round(performance.now() - started) };
    const payload = await response.json().catch(() => null);
    const content = payload?.choices?.[0]?.message?.content;
    const parsed = parseModelJson(content);
    return {
      parsed,
      raw: typeof content === "string" ? content.slice(0, 20_000) : "",
      latencyMs: Math.round(performance.now() - started),
    };
  } catch (error) {
    return {
      error: error?.name === "AbortError" ? "model:timeout" : "model:unavailable",
      latencyMs: Math.round(performance.now() - started),
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function runBenchmark({
  casesPath, promptsPath, responsesPath, reportPath, baseUrl, model, apiKey,
  timeoutMs = 30_000, fetchImpl = fetch,
}) {
  if (!validLoopbackBaseUrl(baseUrl)) return { ok: false, errors: ["endpoint:must_be_loopback_http_v1"] };
  if (typeof model !== "string" || !/^[A-Za-z0-9][A-Za-z0-9._:/-]{1,200}$/.test(model)) {
    return { ok: false, errors: ["model:id_invalid"] };
  }
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1000 || timeoutMs > 120_000) {
    return { ok: false, errors: ["timeout:invalid"] };
  }
  const [caseInput, promptInput] = await Promise.all([
    readLocalJsonl(casesPath, "cases"), readLocalJsonl(promptsPath, "prompts"),
  ]);
  const inputErrors = [...caseInput.errors, ...promptInput.errors, ...validatePrompts(promptInput.rows)];
  if (inputErrors.length) return { ok: false, errors: inputErrors.slice(0, 100) };
  const caseShapeCheck = evaluateResponses(caseInput.rows, []);
  if (caseShapeCheck.errors) return { ok: false, errors: caseShapeCheck.errors };
  const caseIds = caseInput.rows.map((item) => item?.caseId);
  const promptIds = promptInput.rows.map((item) => item.caseId);
  if (new Set(caseIds).size !== caseIds.length || caseIds.length !== promptIds.length ||
      caseIds.some((id) => !promptIds.includes(id))) {
    return { ok: false, errors: ["inputs:case_ids_must_match_uniquely"] };
  }
  if (resolve(responsesPath) === resolve(reportPath)) {
    return { ok: false, errors: ["outputs:paths_must_be_distinct"] };
  }

  const promptById = new Map(promptInput.rows.map((item) => [item.caseId, item]));
  const outputs = [];
  const latencies = [];
  for (const testCase of caseInput.rows) {
    if (testCase?.expectedDecision === "block") {
      outputs.push({ caseId: testCase.caseId, decision: "blocked", answer: "", citations: [], modelInvoked: false, quotaDelta: 0 });
      continue;
    }
    const input = promptById.get(testCase.caseId);
    const result = await callModel({ baseUrl, apiKey, model, ...input, timeoutMs, fetchImpl });
    if (result.error) return { ok: false, errors: [result.error], completedCases: outputs.length };
    latencies.push(result.latencyMs);
    const parsed = result.parsed;
    outputs.push({
      caseId: testCase.caseId,
      decision: parsed?.decision ?? "abstained",
      answer: parsed?.answer ?? result.raw,
      citations: parsed?.citations ?? [],
      modelInvoked: true,
      quotaDelta: 0,
    });
  }

  let report;
  try {
    const responseText = outputs.map((item) => JSON.stringify(item)).join("\n") + "\n";
    await writeFile(resolve(responsesPath), responseText, { encoding: "utf8", flag: "wx", mode: 0o600 });
    report = await evaluateFiles(casesPath, responsesPath);
    const ordered = [...latencies].sort((a, b) => a - b);
    const metrics = {
      model,
      endpointKind: "loopback_only",
      requestedCases: caseInput.rows.length,
      modelInvocations: latencies.length,
      blockedWithoutInvocation: caseInput.rows.length - latencies.length,
      latencyMs: ordered.length ? {
        p50: ordered[Math.floor((ordered.length - 1) * 0.5)],
        p95: ordered[Math.floor((ordered.length - 1) * 0.95)],
        max: ordered.at(-1),
      } : null,
      deterministicChecks: report,
    };
    await writeFile(resolve(reportPath), JSON.stringify(metrics, null, 2) + "\n", {
      encoding: "utf8", flag: "wx", mode: 0o600,
    });
    return { ok: report.ok, metrics };
  } catch {
    return { ok: false, errors: ["output:write_or_evaluation_failed"] };
  }
}

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith("--") || !value || key in args) return null;
    args[key.slice(2)] = value;
  }
  const required = ["cases", "prompts", "responses", "report", "model"];
  return required.every((key) => args[key]) ? args : null;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = parseArgs(process.argv.slice(2));
  if (!args) {
    console.error("Usage: node scripts/run-dena-ai-model-benchmark.mjs --cases <jsonl> --prompts <jsonl> --responses <new-file> --report <new-file> --model <id> [--base-url http://127.0.0.1:8000/v1]");
    process.exitCode = 2;
  } else {
    const result = await runBenchmark({
      casesPath: args.cases,
      promptsPath: args.prompts,
      responsesPath: args.responses,
      reportPath: args.report,
      model: args.model,
      baseUrl: args["base-url"] ?? "http://127.0.0.1:8000/v1",
      apiKey: process.env.DENA_AI_EVAL_API_KEY,
      timeoutMs: args.timeout ? Number(args.timeout) : 30_000,
    });
    console.log(JSON.stringify(result));
    if (!result.ok) process.exitCode = 1;
  }
}
