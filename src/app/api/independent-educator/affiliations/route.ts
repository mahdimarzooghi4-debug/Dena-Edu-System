import { NextResponse, type NextRequest } from "next/server";
import { getServerAccessContext } from "../../../../server/access/actor";
import { validSameOrigin } from "../../../../server/access/role-application-contracts";
import {
  createEducatorAffiliationInput,
} from "../../../../server/independent-educators/contracts";
import {
  createEducatorAffiliation, EducatorAffiliationError,
  getIndependentEducatorWorkspace,
} from "../../../../server/independent-educators/affiliations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "private, no-store, max-age=0" };

export async function GET() {
  const actor = await getServerAccessContext();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, {
    status: 401, headers: noStore,
  });
  return NextResponse.json(await getIndependentEducatorWorkspace(actor.userId), {
    headers: noStore,
  });
}

export async function POST(request: NextRequest) {
  if (!validSameOrigin(request.headers.get("origin"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: noStore });
  }
  const actor = await getServerAccessContext();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, {
    status: 401, headers: noStore,
  });
  const parsed = createEducatorAffiliationInput.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, {
    status: 400, headers: noStore,
  });
  try {
    const result = await createEducatorAffiliation(actor.userId, parsed.data);
    return NextResponse.json(result, {
      status: result.replayed ? 200 : 201, headers: noStore,
    });
  } catch (error) {
    if (!(error instanceof EducatorAffiliationError)) throw error;
    const status = error.kind === "account_unavailable" ? 403
      : error.kind === "institute_unavailable" || error.kind === "not_found" ? 404 : 409;
    return NextResponse.json({ error: error.kind }, { status, headers: noStore });
  }
}
