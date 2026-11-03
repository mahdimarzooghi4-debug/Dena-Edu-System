import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { StudentPhoneChangeWizard } from "@/components/student/phone-change-wizard";
import { StudentShell } from "@/components/student/student-shell";
import { getServerAccessContext } from "@/server/access/actor";
import { getStudentProfile } from "@/server/student/profile";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "تغییر شماره موبایل | دنا",
  robots: { index: false, follow: false },
};

export default async function StudentPhoneChangePage() {
  if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET || !process.env.BETTER_AUTH_URL) redirect("/login");
  const actor = await getServerAccessContext();
  if (!actor) redirect("/login");
  if (!actor.memberships.some((membership) => membership.role === "student")) notFound();
  const profile = await getStudentProfile(actor.userId);
  if (!profile?.phoneNumber || !profile.phoneNumberVerified) redirect("/student/profile");

  return (
    <StudentShell active="account" title="تغییر شماره موبایل">
      <StudentPhoneChangeWizard currentPhone={profile.phoneNumber} />
    </StudentShell>
  );
}
