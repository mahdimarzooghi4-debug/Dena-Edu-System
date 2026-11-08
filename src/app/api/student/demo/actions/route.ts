import { NextRequest, NextResponse } from "next/server";
import { isStudentDemoEnabled } from "../../../../../server/student/demo-app";
import { applyDemoAction, decodeDemoState, DEMO_COOKIE, DemoInputError, encodeDemoState } from "../../../../../server/student/demo-engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!isStudentDemoEnabled()) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const origin = request.headers.get("origin");
  const publicHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const acceptableHosts = [request.headers.get("host"), publicHost, request.nextUrl.host].filter(Boolean);
  let sameOrigin = request.headers.get("sec-fetch-site") !== "cross-site";
  if (origin) {
    try {
      const parsedOrigin = new URL(origin);
      sameOrigin = sameOrigin && (parsedOrigin.protocol === "http:" || parsedOrigin.protocol === "https:") &&
        acceptableHosts.includes(parsedOrigin.host);
    } catch { sameOrigin = false; }
  }
  if (!sameOrigin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (request.headers.get("content-type")?.split(";")[0].trim() !== "application/json") {
    return NextResponse.json({ error: "JSON required" }, { status: 415 });
  }
  const raw = await request.text();
  if (raw.length > 1024) return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  let payload: unknown;
  try { payload = JSON.parse(raw); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  try {
    const state = decodeDemoState(request.cookies.get(DEMO_COOKIE)?.value);
    const updated = applyDemoAction(state, payload);
    const token = encodeDemoState(updated.state);
    const response = NextResponse.json({
      mode: "synthetic", persisted: "signed-cookie-only", formal: false,
      state: updated.state, feedback: updated.feedback, ...updated.result,
    }, { headers: { "Cache-Control": "no-store, private", "X-Dena-Data-Mode": "synthetic" } });
    response.cookies.set(DEMO_COOKIE, token, {
      path: "/", httpOnly: true, secure: request.nextUrl.protocol === "https:",
      sameSite: "strict", maxAge: 60 * 60 * 24 * 7,
    });
    return response;
  } catch (error) {
    if (error instanceof DemoInputError) return NextResponse.json({ error: error.message }, { status: 400 });
    throw error;
  }
}
