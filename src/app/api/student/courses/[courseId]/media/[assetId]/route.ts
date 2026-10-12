import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerAccessContext } from "../../../../../../../server/access/actor";
import {
  configuredPrivateMediaOrigin, getApprovedPrivateAsset, safeMediaRange, validatedPrivateMediaResponse,
} from "../../../../../../../server/student/private-media";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = {
  "Cache-Control": "private, no-store, max-age=0",
  "Cross-Origin-Resource-Policy": "same-origin",
  "X-Content-Type-Options": "nosniff",
};
const deny = (status: number) => NextResponse.json({
  error: status === 401 ? "Unauthorized" : status === 503
    ? "Private media unavailable" : "Not found",
}, { status, headers });

export async function GET(
  request: Request,
  { params }: { params: Promise<{ courseId: string; assetId: string }> },
) {
  const actor = await getServerAccessContext();
  if (!actor) return deny(401);
  const { courseId, assetId } = await params;
  if (!z.uuid().safeParse(courseId).success ||
      !z.uuid().safeParse(assetId).success) return deny(404);
  const asset = await getApprovedPrivateAsset(actor.userId, courseId, assetId);
  if (!asset) return deny(404);
  const media = configuredPrivateMediaOrigin();
  if (!media) return deny(503);

  const range = safeMediaRange(request.headers.get("range"));
  if (range === false) return new Response(null, {
    status: 416, headers: { ...headers, "Accept-Ranges": "bytes" },
  });
  // URL is assembled ONLY from the DB-checked UUID key, never a client URL.
  // Origin MUST be private and deny public/non-Bearer requests on its own.
  const url = new URL(`/private/${asset.objectKey}`, media.origin);
  let upstream: Response;
  try {
    upstream = await fetch(url, {
      method: "GET",
      redirect: "error", cache: "no-store",
      headers: {
        Authorization: `Bearer ${media.token}`,
        ...(range ? { Range: range } : {}),
      },
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    return deny(503);
  }
  // The origin is not allowed to return a different range or inconsistent
  // byte framing. Only these validated metadata fields cross the proxy.
  // No upstream Location, Set-Cookie, CORS or origin address can escape.
  const framed = validatedPrivateMediaResponse(upstream.status, range, upstream.headers);
  if (!framed || !upstream.body) {
    await upstream.body?.cancel();
    return deny(503);
  }
  const output = new Headers(headers);
  output.set("Content-Type", "video/mp4");
  output.set("Accept-Ranges", "bytes");
  output.set("Content-Length", framed.length);
  if (framed.range) output.set("Content-Range", framed.range);
  return new Response(upstream.body, {
    status: upstream.status, headers: output,
  });
}

// Explicitly do not expose media metadata via unauthenticated HEAD.
export async function HEAD() {
  return new Response(null, { status: 405, headers });
}
