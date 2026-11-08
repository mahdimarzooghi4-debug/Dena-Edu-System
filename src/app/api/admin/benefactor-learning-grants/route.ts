import { sql } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getDb } from "../../../../db";
import { memberships } from "../../../../db/schema";
import { getServerAccessContext } from "../../../../server/access/actor";
import { validSameOrigin } from "../../../../server/access/role-application-contracts";

export const runtime = "nodejs";
const headers = { "Cache-Control": "no-store" };
const input = z.discriminatedUnion("action", [
  z.object({ action: z.literal("grant"), benefactorId: z.uuid(), enrollmentId: z.uuid(),
    paymentReference: z.string().trim().min(3).max(200), paymentVerified: z.literal(true) }),
  z.object({ action: z.literal("revoke"), grantId: z.uuid() }),
]);

export async function POST(request: NextRequest) {
  if (!validSameOrigin(request.headers.get("origin"))) return NextResponse.json({ error: "Forbidden" }, { status: 403, headers });
  const actor = await getServerAccessContext();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers });
  if (!actor.memberships.some(({ role }) => role === "admin")) return NextResponse.json({ error: "Forbidden" }, { status: 403, headers });
  const parsed = input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400, headers });
  const data = parsed.data;
  const result = await getDb().transaction(async (tx) => {
    const admin = await tx.execute(sql`SELECT id FROM ${memberships}
      WHERE user_id = ${actor.userId} AND role = 'admin' AND status = 'active' FOR SHARE`);
    if (!admin.length) return null;
    if (data.action === "revoke") {
      const rows = await tx.execute(sql`UPDATE dena_benefactor_learning_grants
        SET revoked_at = coalesce(revoked_at, now()), revoked_by = coalesce(revoked_by, ${actor.userId}::uuid)
        WHERE id = ${data.grantId} RETURNING id`);
      return rows[0] ?? null;
    }
    const [scope] = await tx.execute<{ student_user_id: string }>(sql`
      SELECT e.student_user_id FROM dena_student_enrollments e
      JOIN dena_verified_entities b ON b.id = ${data.benefactorId} AND b.role = 'benefactor'
      WHERE e.id = ${data.enrollmentId} AND e.status = 'active' FOR SHARE OF e, b
    `);
    if (!scope) return null;
    await tx.execute(sql`INSERT INTO dena_benefactor_recipients (benefactor_id, student_user_id)
      VALUES (${data.benefactorId}, ${scope.student_user_id})
      ON CONFLICT (benefactor_id, student_user_id) DO NOTHING`);
    const [recipient] = await tx.execute<{ id: string }>(sql`SELECT id FROM dena_benefactor_recipients
      WHERE benefactor_id = ${data.benefactorId} AND student_user_id = ${scope.student_user_id} FOR UPDATE`);
    const rows = await tx.execute(sql`INSERT INTO dena_benefactor_learning_grants
      (recipient_id, enrollment_id, payment_reference, confirmed_by)
      VALUES (${recipient.id}, ${data.enrollmentId}, ${data.paymentReference}, ${actor.userId})
      ON CONFLICT (recipient_id, enrollment_id) DO NOTHING RETURNING id`);
    if (rows[0]) return rows[0];
    const [existing] = await tx.execute(sql`SELECT id FROM dena_benefactor_learning_grants
      WHERE recipient_id = ${recipient.id} AND enrollment_id = ${data.enrollmentId}
        AND payment_reference = ${data.paymentReference} AND revoked_at IS NULL`);
    return existing ?? null;
  });
  if (!result) return NextResponse.json({ error: "Scope unavailable or grant conflict" }, { status: 409, headers });
  return NextResponse.json(result, { headers });
}
