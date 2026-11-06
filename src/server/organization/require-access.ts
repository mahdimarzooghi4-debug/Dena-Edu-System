import { notFound, redirect } from "next/navigation";
import { getServerAccessContext } from "../access/actor";
import { getOrganizationScopes } from "./scopes";

export async function requireOrganizationAccess() {
  if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET || !process.env.BETTER_AUTH_URL) redirect("/login");
  const actor = await getServerAccessContext();
  if (!actor) redirect("/login");
  const scopes = await getOrganizationScopes(actor.userId);
  if (!scopes.length) notFound();
  return { actor, scopes };
}
