import { NextResponse, type NextRequest } from "next/server";
import { WebhookReceiver } from "livekit-server-sdk";
import { LiveKitConfigError, readLiveKitServerConfig } from "../../../../server/institute/livekit";
import {
  LiveKitUsageEventError, recordLiveKitPresenceEvent,
} from "../../../../server/institute/livekit-usage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const MAX_WEBHOOK_BYTES = 64 * 1024;

async function readBoundedBody(request: Request) {
  const length = request.headers.get("content-length");
  if (length && (!/^\d+$/.test(length) || Number(length) > MAX_WEBHOOK_BYTES)) return null;
  if (!request.body) return null;
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_WEBHOOK_BYTES) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  if (!size) return null;
  const body = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.byteLength; }
  return body;
}

export async function POST(request: NextRequest) {
  if (!/^application\/webhook\+json(?:\s*;|\s*$)/i.test(
    request.headers.get("content-type") ?? "",
  )) return NextResponse.json({ error: "Invalid webhook" }, { status: 415 });
  const raw = await readBoundedBody(request);
  if (!raw) return NextResponse.json({ error: "Invalid webhook" }, { status: 400 });
  let rawBody: string;
  try { rawBody = new TextDecoder("utf-8", { fatal: true }).decode(raw); }
  catch { return NextResponse.json({ error: "Invalid webhook" }, { status: 400 }); }

  let event;
  try {
    const config = readLiveKitServerConfig();
    event = await new WebhookReceiver(config.apiKey, config.apiSecret).receive(
      rawBody, request.headers.get("authorization") ?? undefined,
    );
  } catch (error) {
    if (error instanceof LiveKitConfigError) return NextResponse.json(
      { error: "Webhook unavailable" }, { status: 503 },
    );
    return NextResponse.json({ error: "Invalid webhook" }, { status: 401 });
  }

  const kind = event.event === "participant_joined" ? "joined" :
    event.event === "participant_left" || event.event === "participant_connection_aborted" ? "left" :
      event.event === "room_finished" ? "room_finished" : null;
  if (!kind) return NextResponse.json({ ok: true, ignored: true });
  const roomId = event.room?.name;
  const identity = kind === "room_finished" ? null : event.participant?.identity ?? null;
  const timestamp = Number(event.createdAt);
  if (!roomId || !Number.isSafeInteger(timestamp) || timestamp <= 0) {
    return NextResponse.json({ error: "Invalid webhook" }, { status: 400 });
  }
  try {
    const result = await recordLiveKitPresenceEvent({
      eventId: event.id,
      callId: roomId,
      identity,
      kind,
      occurredAt: new Date(timestamp * 1000),
    });
    return NextResponse.json({ ok: true, connectedSeconds: result.connectedSeconds });
  } catch (error) {
    if (error instanceof LiveKitUsageEventError) {
      const status = error.kind === "call_unavailable" ? 404 : 400;
      return NextResponse.json({ error: "Invalid webhook" }, { status });
    }
    // A retry is safe: provider event IDs are persisted idempotently.
    return NextResponse.json({ error: "Webhook temporarily unavailable" }, { status: 503 });
  }
}
