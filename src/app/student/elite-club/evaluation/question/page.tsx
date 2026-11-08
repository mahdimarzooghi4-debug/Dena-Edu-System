import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { StudentShell } from "@/components/student/student-shell";
import { ClubEvaluationPreview } from "@/components/student/club-evaluation-preview";
import { getServerAccessContext } from "@/server/access/actor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "پرسش‌های ارزیابی باشگاه | دنا",
  robots: { index: false, follow: false },
};

export default async function StudentEliteClubEvaluationQuestionPage() {
  if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET || !process.env.BETTER_AUTH_URL) redirect("/login");
  const actor = await getServerAccessContext();
  if (!actor) redirect("/login");
  if (!actor.memberships.some((entry) => entry.role === "student")) notFound();

  return (
    <StudentShell active="elite" title="باشگاه نخبگان">
      <div className="mx-auto max-w-2xl">
        <ClubEvaluationPreview />
      </div>
    </StudentShell>
  );
}
