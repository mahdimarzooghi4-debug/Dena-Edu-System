import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getServerAccessContext } from "../../../../../server/access/actor";
import { validSameOrigin } from "../../../../../server/access/role-application-contracts";
import {
  InstituteServiceError, instituteServiceUpdateInput, updateInstituteService,
} from "../../../../../server/institute/services";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "private, no-store, max-age=0" };
type Params = { params: Promise<{ serviceId: string }> };

export async function PATCH(request: NextRequest, context: Params) {
  if (!validSameOrigin(request.headers.get("origin"))) return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: noStore });
  const actor = await getServerAccessContext();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: noStore });
  if (!actor.memberships.some((item) => item.role === "institute")) return NextResponse.json({ error: "Not found" }, { status: 404, headers: noStore });
  const { serviceId } = await context.params;
  if (!z.uuid().safeParse(serviceId).success) return NextResponse.json({ error: "Not found" }, { status: 404, headers: noStore });
  const parsed = instituteServiceUpdateInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid service" }, { status: 400, headers: noStore });
  try {
    const service = await updateInstituteService(actor.userId, serviceId, parsed.data);
    return NextResponse.json({ service }, { headers: noStore });
  } catch (error) {
    if (error instanceof InstituteServiceError) return NextResponse.json({ error: error.kind }, {
      status: 404, headers: noStore,
    });
    throw error;
  }
}
