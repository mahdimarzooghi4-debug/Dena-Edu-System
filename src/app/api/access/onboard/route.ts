import { eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { getDb } from "../../../../db";
import { memberships, user } from "../../../../db/schema";
import { getAuth } from "../../../../lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "no-store" };

/** The only self-service assignment is student. Elevated role assignment,
 * approval and suspension are exclusively trusted server/admin workflows.
 */
export async function POST(request: NextRequest) {
  const baseURL = process.env.BETTER_AUTH_URL;
  const origin = request.headers.get("origin");
  if (!baseURL || !origin || origin !== new URL(baseURL).origin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: noStore });
  }
  const body: unknown = await request.json().catch(() => null);
  if (!z.object({}).strict().safeParse(body).success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400, headers: noStore });
  }
  const authSession = await getAuth().api.getSession({
    headers: await headers(), query: { disableCookieCache: true },
  });
  if (!authSession) return NextResponse.json({ error: "Unauthorized" }, {
    status: 401, headers: noStore,
  });
  const db = getDb();
  const [principal] = await db.select({
    phoneNumberVerified: user.phoneNumberVerified,
    phoneNumber: user.phoneNumber,
  }).from(user).where(eq(user.id, authSession.user.id)).limit(1);
  if (!principal?.phoneNumber || !principal.phoneNumberVerified) {
    return NextResponse.json({ error: "Verified mobile required" }, {
      status: 403, headers: noStore,
    });
  }
  await db.insert(memberships).values({
    userId: authSession.user.id, role: "student",
  }).onConflictDoNothing({ target: memberships.userId,
    targetWhere: undefined,
  });
  // Intentionally does NOT reactivate a suspended/revoked student membership.
  const rows = await db.select({ status: memberships.status })
    .from(memberships).where(eq(memberships.userId, authSession.user.id));
  const activeStudent = rows.some((row) => row.status === "active");
  return NextResponse.json(activeStudent
    ? { role: "student", onboarded: true }
    : { error: "Student membership unavailable" },
  { status: activeStudent ? 200 : 403, headers: noStore });
}
