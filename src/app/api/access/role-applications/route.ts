import { asc, eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { headers } from "next/headers";
import { getDb } from "../../../../db";
import { roleApplicationEvents, roleApplications, user } from "../../../../db/schema";
import { getAuth } from "../../../../lib/auth";
import { newRoleApplication, validSameOrigin } from "../../../../server/access/role-application-contracts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const cache = { "Cache-Control": "no-store" };

async function verifiedApplicant() {
  const session = await getAuth().api.getSession({
    headers: await headers(), query: { disableCookieCache: true },
  });
  if (!session?.user.id) return null;
  const [person] = await getDb().select({
    id: user.id,
  }).from(user).where(eq(user.id, session.user.id)).limit(1);
  return person ? session.user.id : null;
}

export async function GET() {
  const id = await verifiedApplicant();
  if (!id) return NextResponse.json({ error: "Unauthorized" }, {
    status: 401, headers: cache,
  });
  const rows = await getDb().select({
    id: roleApplications.id,
    role: roleApplications.requestedRole,
    proposedName: roleApplications.proposedName,
    status: roleApplications.status,
    createdAt: roleApplications.createdAt,
    reviewedAt: roleApplications.reviewedAt,
    reason: roleApplications.decisionReason,
  }).from(roleApplications).where(eq(roleApplications.userId, id))
    .orderBy(asc(roleApplications.createdAt)).limit(4);
  return NextResponse.json({ applications: rows }, { headers: cache });
}

export async function POST(request: NextRequest) {
  if (!validSameOrigin(request.headers.get("origin"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: cache });
  }
  const id = await verifiedApplicant();
  if (!id) return NextResponse.json({ error: "Unauthorized" }, {
    status: 401, headers: cache,
  });
  const [person] = await getDb().select({
    verified: user.phoneNumberVerified, phone: user.phoneNumber,
  }).from(user).where(eq(user.id, id)).limit(1);
  if (!person?.verified || !person.phone) {
    return NextResponse.json({ error: "Verified mobile required" }, {
      status: 403, headers: cache,
    });
  }
  const parsed = newRoleApplication.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, {
    status: 400, headers: cache,
  });
  const result = await getDb().transaction(async (tx) => {
    const [row] = await tx.insert(roleApplications).values({
      userId: id,
      requestedRole: parsed.data.role,
      proposedName: parsed.data.proposedName,
      statement: parsed.data.statement,
    }).onConflictDoNothing().returning({ id: roleApplications.id });
    if (!row) return null; // one request ever per user+role; appeals require review
    await tx.insert(roleApplicationEvents).values({
      applicationId: row.id, actorUserId: id, kind: "submitted",
    });
    return row;
  });
  return result
    ? NextResponse.json({ id: result.id, status: "pending" }, {
      status: 201, headers: cache,
    })
    : NextResponse.json({ error: "Application already exists for this role" }, {
      status: 409, headers: cache,
    });
}
