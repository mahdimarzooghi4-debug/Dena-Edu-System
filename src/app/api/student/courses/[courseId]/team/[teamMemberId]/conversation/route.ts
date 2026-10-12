import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getServerAccessContext } from "@/server/access/actor";
import { validSameOrigin } from "@/server/access/role-application-contracts";
import {
  getStudentCourseConversation,
  sendStudentCourseMessage,
  studentCourseMessageInput,
} from "@/server/student/course-conversation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "private, no-store, max-age=0" };

type Params = {
  params: Promise<{ courseId: string; teamMemberId: string }>;
};

async function scoped({ params }: Params) {
  const actor = await getServerAccessContext();
  if (!actor) return {
    error: NextResponse.json({ error: "Unauthorized" }, {
      status: 401, headers: noStore,
    }),
  };
  if (!actor.memberships.some((entry) => entry.role === "student")) {
    return {
      error: NextResponse.json({ error: "Forbidden" }, {
        status: 403, headers: noStore,
      }),
    };
  }

  const { courseId, teamMemberId } = await params;
  if (!z.uuid().safeParse(courseId).success ||
      !z.uuid().safeParse(teamMemberId).success) {
    return {
      error: NextResponse.json({ error: "Not found" }, {
        status: 404, headers: noStore,
      }),
    };
  }

  return { userId: actor.userId, courseId, teamMemberId };
}

export async function GET(_request: NextRequest, params: Params) {
  const checked = await scoped(params);
  if (checked.error) return checked.error;

  const conversation = await getStudentCourseConversation(
    checked.userId!, checked.courseId!, checked.teamMemberId!,
  );
  if (!conversation) {
    return NextResponse.json({ error: "Not found" }, {
      status: 404, headers: noStore,
    });
  }

  return NextResponse.json({ conversation }, { headers: noStore });
}

export async function POST(request: NextRequest, params: Params) {
  if (!validSameOrigin(request.headers.get("origin"))) {
    return NextResponse.json({ error: "Forbidden" }, {
      status: 403, headers: noStore,
    });
  }

  const checked = await scoped(params);
  if (checked.error) return checked.error;

  const parsed = studentCourseMessageInput.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid message" }, {
      status: 400, headers: noStore,
    });
  }

  const result = await sendStudentCourseMessage(
    checked.userId!, checked.courseId!, checked.teamMemberId!,
    parsed.data.body,
  );
  if (!result) {
    return NextResponse.json({ error: "Not found" }, {
      status: 404, headers: noStore,
    });
  }

  return NextResponse.json(result, { status: 201, headers: noStore });
}
