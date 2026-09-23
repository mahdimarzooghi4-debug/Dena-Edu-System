import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { getDb } from "../../db";
import { memberships } from "../../db/schema";
import { getAuth } from "../../lib/auth";
import { toAccessContext } from "./membership";

/**
 * Only trusted request headers + server-side Better Auth session can supply the
 * actor. Never accept role, userId or membership claims from params/body/cookies.
 */
export async function getServerAccessContext() {
  const activeSession = await getAuth().api.getSession({
    headers: await headers(),
    query: { disableCookieCache: true },
  });
  if (!activeSession?.user.id) return null;

  const rows = await getDb().select().from(memberships)
    .where(eq(memberships.userId, activeSession.user.id));
  return toAccessContext(activeSession.user.id, rows);
}
