import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { getDb } from "../../db";
import { memberships } from "../../db/schema";
import { getAuth } from "../../lib/auth";
import { toAccessContext } from "./membership";

/**
 * Authenticated identity is intentionally separate from global Dena roles.
 * Course-team assignments are course-scoped capabilities and must not require
 * inventing a global teacher/supporter/counselor membership.
 */
export async function getServerIdentity() {
  const activeSession = await getAuth().api.getSession({
    headers: await headers(),
    query: { disableCookieCache: true },
  });
  if (!activeSession?.user.id) return null;
  return { userId: activeSession.user.id };
}

/**
 * Only trusted request headers + server-side Better Auth session can supply the
 * actor. Never accept role, userId or membership claims from params/body/cookies.
 *
 * This context is for GLOBAL Dena roles. Call getServerIdentity() for
 * course-scoped capabilities whose authorization comes from another table.
 */
export async function getServerAccessContext() {
  const identity = await getServerIdentity();
  if (!identity) return null;

  const rows = await getDb().select().from(memberships)
    .where(eq(memberships.userId, identity.userId));
  return toAccessContext(identity.userId, rows);
}
