export class RequestBodyLimitError extends Error {
  constructor() {
    super("request_body_too_large");
  }
}

/** Reads a request stream only up to its configured byte limit. */
export async function readRequestBodyAtMost(request: Request, maxBytes: number): Promise<Buffer> {
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 0) throw new RangeError("invalid_body_limit");
  const reader = request.body?.getReader();
  if (!reader) return Buffer.alloc(0);

  const chunks: Buffer[] = [];
  let totalBytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        await reader.cancel().catch(() => undefined);
        throw new RequestBodyLimitError();
      }
      chunks.push(Buffer.from(value));
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks, totalBytes);
}

export async function readRequestTextAtMost(request: Request, maxBytes: number): Promise<string> {
  const body = await readRequestBodyAtMost(request, maxBytes);
  return new TextDecoder("utf-8", { fatal: true }).decode(body);
}

/** Parses multipart form data only after the raw request has passed a byte cap. */
export async function readFormDataAtMost(request: Request, maxBytes: number): Promise<FormData> {
  const contentType = request.headers.get("content-type");
  if (!contentType?.toLowerCase().startsWith("multipart/form-data;")) {
    throw new TypeError("invalid_form_content_type");
  }
  const body = await readRequestBodyAtMost(request, maxBytes);
  return new Request(request.url, {
    method: "POST",
    headers: { "content-type": contentType },
    body: Uint8Array.from(body),
  }).formData();
}
