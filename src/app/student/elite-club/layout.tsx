import type { ReactNode } from "react";
import { notFound, redirect } from "next/navigation";
import { getServerAccessContext } from "@/server/access/actor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function StudentEliteClubLayout({ children }: { children: ReactNode }) {
  if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET || !process.env.BETTER_AUTH_URL) {
    redirect("/login");
  }
  const actor = await getServerAccessContext();
  if (!actor) redirect("/login");
  if (!actor.memberships.some((membership) => membership.role === "student")) notFound();
  return children;
}
