/** Limit the untrusted private origin's inspection report before JSON parsing.
 * A valid attestation is still verified separately with the isolated signer.
 */
export const MAX_INSPECTION_REPORT_BYTES = 4 * 1024;

export async function readBoundedInspectionReport(response: Response): Promise<unknown | null> {
  if (response.status !== 200 ||
      response.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json" ||
      !response.body) {
    await response.body?.cancel().catch(() => {});
    return null;
  }
  const declared = response.headers.get("content-length");
  if (declared !== null && (!/^(0|[1-9]\d*)$/.test(declared) ||
      Number(declared) > MAX_INSPECTION_REPORT_BYTES)) {
    await response.body.cancel().catch(() => {});
    return null;
  }
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    while (true) {
      const next = await reader.read();
      if (next.done) break;
      bytes += next.value.byteLength;
      if (bytes > MAX_INSPECTION_REPORT_BYTES) {
        await reader.cancel().catch(() => {});
        return null;
      }
      chunks.push(next.value);
    }
    if (bytes === 0 || (declared !== null && bytes !== Number(declared))) return null;
    const parsed: unknown = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
  } catch {
    await reader.cancel().catch(() => {});
    return null;
  } finally {
    reader.releaseLock();
  }
}
