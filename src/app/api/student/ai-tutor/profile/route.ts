import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getServerAccessContext } from "@/server/access/actor";
import { validSameOrigin } from "@/server/access/role-application-contracts";
import {
  clearStudentTutorTopics, listStudentTutorTopics,
  listStudentTutorVideoGuidanceConceptIds,
  listStudentTutorVideoHelpfulConceptIds, recordStudentTutorLessonFeedback,
} from "@/server/student/ai-tutor-profile";
import { learningConceptIdSchema } from "@/server/ai-tutor/learning-concepts";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "private, no-store, max-age=0" };

export async function GET() {
  const actor = await getServerAccessContext();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, {
    status: 401, headers: noStore,
  });
  if (!actor.memberships.some((entry) => entry.role === "student")) {
    return NextResponse.json({ error: "Not found" }, { status: 404, headers: noStore });
  }
  const topics = await listStudentTutorTopics(actor.userId);
  const [guidanceConceptIds, helpfulConceptIds] = await Promise.all([
    listStudentTutorVideoGuidanceConceptIds(actor.userId),
    listStudentTutorVideoHelpfulConceptIds(actor.userId),
  ]);
  return NextResponse.json({ topics, guidanceConceptIds, helpfulConceptIds }, { headers: noStore });
}

export async function POST(request: NextRequest) {
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
  const parsed = z.object({
    topicId: learningConceptIdSchema,
    lessonFeedback: z.enum(["understood", "needs_help"]),
    consent: z.literal(true),
  }).strict().safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid feedback" }, {
    status: 400, headers: noStore,
  });
  const saved = await recordStudentTutorLessonFeedback(
    actor.userId, parsed.data.topicId, parsed.data.lessonFeedback,
  );
  if (!saved) return NextResponse.json({ error: "Not found" }, {
    status: 404, headers: noStore,
  });
  return NextResponse.json({ saved: true }, { headers: noStore });
}

export async function DELETE(request: NextRequest) {
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
  const deleted = await clearStudentTutorTopics(actor.userId);
  return NextResponse.json({ deleted }, { headers: noStore });
}
