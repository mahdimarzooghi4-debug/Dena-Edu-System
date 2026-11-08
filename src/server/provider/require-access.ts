import { notFound, redirect } from "next/navigation";
import { getServerAccessContext } from "../access/actor";
export async function requireProviderAccess() {
  if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET || !process.env.BETTER_AUTH_URL) redirect("/login");
  const actor = await getServerAccessContext();
  if (!actor) redirect("/login");
  const providerIds = [...new Set(actor.memberships.flatMap((member) => member.role === "provider" ? [member.providerId] : []))];
  if (!providerIds.length) notFound();
  return { actor, providerIds };
}
