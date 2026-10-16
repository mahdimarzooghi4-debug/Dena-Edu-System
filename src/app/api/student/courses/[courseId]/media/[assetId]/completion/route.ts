import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getServerAccessContext } from "../../../../../../../../server/access/actor";
import { validSameOrigin } from "../../../../../../../../server/access/role-application-contracts";
import { hasStudentEntitlement } from "../../../../../../../../server/student/entitlement";
import {
  isReadyVideoOfCourse, setStudentVideoCompletion,
} from "../../../../../../../../server/student/video-progress";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "no-store" };
type Params = { params: Promise<{ courseId: string; assetId: string }> };

async function authorized(request: NextRequest, params: Params) {
  if (!validSameOrigin(request.headers.get("origin"))) {
    return { error: NextResponse.json({ error: "Forbidden" }, {
      status: 403, headers: noStore,
    }) };
  }
  const actor = await getServerAccessContext();
  if (!actor) return { error: NextResponse.json({ error: "Unauthorized" }, {
    status: 401, headers: noStore,
  }) };
  if (!actor.memberships.some((entry) => entry.role === "student")) {
    return { error: NextResponse.json({ error: "Forbidden" }, {
      status: 403, headers: noStore,
    }) };
  }
  const { courseId, assetId } = await params.params;
  if (!z.uuid().safeParse(courseId).success ||
      !z.uuid().safeParse(assetId).success ||
      !await hasStudentEntitlement(actor.userId, courseId) ||
      !await isReadyVideoOfCourse(courseId, assetId)) {
    return { error: NextResponse.json({ error: "Not found" }, {
      status: 404, headers: noStore,
    }) };
  }
  return { actor, courseId, assetId };
}

/** Self-reported completion; not generated from video GET/Range requests. */
export async function POST(request: NextRequest, params: Params) {
  const checked = await authorized(request, params);
  if (checked.error) return checked.error;
  const body: unknown = await request.json().catch(() => null);
  if (!z.object({}).strict().safeParse(body).success) {
    return NextResponse.json({ error: "Invalid request" }, {
      status: 400, headers: noStore,
    });
  }
  const { actor, courseId, assetId } = checked;
  const result = await setStudentVideoCompletion(
    actor!.userId, courseId!, assetId!, true,
  );
  if (!result) return NextResponse.json({ error: "Not found" }, {
    status: 404, headers: noStore,
  });
  return NextResponse.json({ courseId, assetId, completed: true,
    replayed: !result.created }, {
    status: result.created ? 201 : 200, headers: noStore,
  });
}

/** Removing a personal marker never alters another student's state. */
export async function DELETE(request: NextRequest, params: Params) {
  const checked = await authorized(request, params);
  if (checked.error) return checked.error;
  const { actor, courseId, assetId } = checked;
  if (!await setStudentVideoCompletion(actor!.userId, courseId!, assetId!, false)) {
    return NextResponse.json({ error: "Not found" }, { status: 404, headers: noStore });
  }
  return NextResponse.json({ courseId, assetId, completed: false }, {
    headers: noStore,
  });
}
