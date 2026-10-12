/** Read a bounded, explicit JSON acknowledgement; never log provider response data. */
export async function smsGatewayAccepted(response: Response): Promise<boolean> {
  if (!response.ok ||
      response.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json" ||
      !response.body) {
    await response.body?.cancel().catch(() => {});
    return false;
  }
  const maxBytes = 1024;
  const declared = response.headers.get("content-length");
  if (declared && (!/^(0|[1-9]\d*)$/.test(declared) ||
      Number(declared) > maxBytes)) {
    await response.body.cancel().catch(() => {});
    return false;
  }
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      bytes += part.value.byteLength;
      if (bytes > maxBytes) {
        await reader.cancel().catch(() => {});
        return false;
      }
      chunks.push(part.value);
    }
  } finally {
    reader.releaseLock();
  }
  if (!bytes) return false;
  const value: unknown = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  return !!value && typeof value === "object" && !Array.isArray(value) &&
    (value as { accepted?: unknown }).accepted === true;
}
