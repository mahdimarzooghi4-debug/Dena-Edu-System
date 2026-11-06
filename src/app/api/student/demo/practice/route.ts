import { NextResponse } from "next/server";
import { gradeDemoPractice, isStudentDemoEnabled } from "../../../../../server/student/demo-app";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isStudentDemoEnabled()) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if ((request.headers.get("content-type") ?? "").split(";")[0].trim() !== "application/json") {
    return NextResponse.json({ error: "JSON required" }, { status: 415 });
  }
  const raw = await request.text();
  if (raw.length > 512) return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  let payload: unknown;
  try { payload = JSON.parse(raw); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  if (!payload || typeof payload !== "object") return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const { assessmentId, choice } = payload as Record<string, unknown>;
  if (typeof assessmentId !== "string" || typeof choice !== "number") {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const result = gradeDemoPractice(assessmentId, choice);
  if (!result) return NextResponse.json({ error: "Invalid practice" }, { status: 400 });
  return NextResponse.json(result, {
    headers: { "Cache-Control": "no-store, private", "X-Dena-Data-Mode": "synthetic" },
  });
}
