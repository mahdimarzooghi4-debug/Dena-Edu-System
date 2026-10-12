import { NextResponse, type NextRequest } from "next/server";
import { getServerAccessContext } from "../../../../server/access/actor";
import {
  InvalidCourseCatalogQuery, listStudentCatalog, readCatalogQuery,
} from "../../../../server/student/course-catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "no-store" };

export async function GET(request: NextRequest) {
  const actor = await getServerAccessContext();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, {
    status: 401, headers: noStore,
  });
  if (!actor.memberships.some((entry) => entry.role === "student")) {
    return NextResponse.json({ error: "Forbidden" }, {
      status: 403, headers: noStore,
    });
  }
  try {
    const query = readCatalogQuery(request.nextUrl.searchParams);
    return NextResponse.json(
      await listStudentCatalog(actor.userId, query), { headers: noStore },
    );
  } catch (error) {
    if (error instanceof InvalidCourseCatalogQuery) {
      return NextResponse.json({ error: "Invalid catalog query" }, {
        status: 400, headers: noStore,
      });
    }
    throw error;
  }
}
