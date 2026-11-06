import { z } from "zod";
const schema = z.object({ createdAt: z.string().datetime(), id: z.uuid() }).strict();
export function encodeCollaborationCursor(value: { createdAt: Date; id: string }) {
  return Buffer.from(JSON.stringify({ createdAt: value.createdAt.toISOString(), id: value.id })).toString("base64url");
}
export function decodeCollaborationCursor(token: string) {
  if (token.length > 1024) return null;
  try {
    const parsed = schema.safeParse(JSON.parse(Buffer.from(token,"base64url").toString("utf8")));
    return parsed.success ? { createdAt: new Date(parsed.data.createdAt), id: parsed.data.id } : null;
  } catch { return null; }
}
