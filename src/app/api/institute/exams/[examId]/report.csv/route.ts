import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getServerAccessContext } from "../../../../../../server/access/actor";
import { examReportQuery, getExamReport } from "../../../../../../server/assessments/exam-management";
import { examAttemptsCsv } from "../../../../../../server/assessments/report-csv";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "private, no-store, max-age=0" };
type Params = { params: Promise<{ examId: string }> };

export async function GET(request: NextRequest, context: Params) {
  const actor = await getServerAccessContext();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: noStore });
  if (!actor.memberships.some((item) => item.role === "institute")) return NextResponse.json({ error: "Not found" }, { status: 404, headers: noStore });
  const { examId } = await context.params;
  if (!z.uuid().safeParse(examId).success) return NextResponse.json({ error: "Not found" }, { status: 404, headers: noStore });
  const parsed = examReportQuery.safeParse({
    status: request.nextUrl.searchParams.get("status") || undefined,
    search: request.nextUrl.searchParams.get("search") || undefined,
  });
  if (!parsed.success) return NextResponse.json({ error: "Invalid filters" }, { status: 400, headers: noStore });
  const report = await getExamReport(actor.userId, "institute", examId, parsed.data, { pageSize: 10000 });
  if (!report) return NextResponse.json({ error: "Not found" }, { status: 404, headers: noStore });
  if (report.nextCursor) return NextResponse.json({ error: "Narrow filters to export at most 10,000 attempts" }, { status: 413, headers: noStore });
  return new NextResponse(examAttemptsCsv(report), {
    headers: { ...noStore, "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="exam-${examId}-attempts.csv"` },
  });
}
