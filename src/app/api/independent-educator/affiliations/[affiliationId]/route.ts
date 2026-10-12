import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getServerAccessContext } from "../../../../../server/access/actor";
import { validSameOrigin } from "../../../../../server/access/role-application-contracts";
import {
  EducatorAffiliationError, withdrawEducatorAffiliation,
} from "../../../../../server/independent-educators/affiliations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "private, no-store, max-age=0" };

export async function DELETE(request: NextRequest,
  { params }: { params: Promise<{ affiliationId: string }> }) {
  if (!validSameOrigin(request.headers.get("origin"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: noStore });
  }
  const actor = await getServerAccessContext();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, {
    status: 401, headers: noStore,
  });
  const { affiliationId } = await params;
  if (!z.uuid().safeParse(affiliationId).success) {
    return NextResponse.json({ error: "Not found" }, { status: 404, headers: noStore });
  }
  try {
    return NextResponse.json(await withdrawEducatorAffiliation(actor.userId, affiliationId), {
      headers: noStore,
    });
  } catch (error) {
    if (!(error instanceof EducatorAffiliationError)) throw error;
    const status = error.kind === "not_found" ? 404
      : error.kind === "reviewer_unavailable" ? 403 : 409;
    return NextResponse.json({ error: error.kind }, { status, headers: noStore });
  }
}
