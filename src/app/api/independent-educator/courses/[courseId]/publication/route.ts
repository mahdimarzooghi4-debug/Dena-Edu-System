import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getServerAccessContext } from "../../../../../../server/access/actor";
import { validSameOrigin } from "../../../../../../server/access/role-application-contracts";
import { configuredPrivateMediaOrigin } from "../../../../../../server/student/private-media";
import {
  IndependentEducatorPublicationError, publishIndependentEducatorCourse,
} from "../../../../../../server/independent-educators/course-publication";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "private, no-store, max-age=0" };
const input = z.object({ action: z.literal("publish") }).strict();

export async function POST(request: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }) {
  if (!validSameOrigin(request.headers.get("origin"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: noStore });
  }
  const actor = await getServerAccessContext();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, {
    status: 401, headers: noStore,
  });
  if (!actor.memberships.some((entry) => entry.role === "student")) {
    return NextResponse.json({ error: "Not found" }, { status: 404, headers: noStore });
  }
  const { courseId } = await params;
  if (!z.uuid().safeParse(courseId).success) return NextResponse.json({ error: "Not found" }, {
    status: 404, headers: noStore,
  });
  const parsed = input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, {
    status: 400, headers: noStore,
  });
  if (!configuredPrivateMediaOrigin()) return NextResponse.json({
    error: "private_media_unavailable",
  }, { status: 503, headers: noStore });
  try {
    return NextResponse.json(
      await publishIndependentEducatorCourse(actor.userId, courseId),
      { headers: noStore },
    );
  } catch (error) {
    if (!(error instanceof IndependentEducatorPublicationError)) throw error;
    return NextResponse.json({ error: error.kind }, {
      status: error.kind === "not_available" ? 404 : 409, headers: noStore,
    });
  }
}
