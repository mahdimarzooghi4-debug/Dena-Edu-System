import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { InstituteQuestionForm } from "../../../../components/institute/question-form";
import { SectionHeading } from "../../../../components/ui/section-heading";
import { getServerAccessContext } from "../../../../server/access/actor";
import { getInstituteQuestionBank } from "../../../../server/institute/question-bank";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "افزودن سؤال | دنا", robots: { index: false, follow: false } };

export default async function NewInstituteQuestionPage() {
  if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET ||
      !process.env.BETTER_AUTH_URL) redirect("/login");
  const actor = await getServerAccessContext();
  if (!actor) redirect("/login");
  if (!actor.memberships.some((member) => member.role === "institute")) notFound();
  const result = await getInstituteQuestionBank(actor.userId);
  return (
    <main id="main-content" className="mx-auto min-h-screen max-w-5xl space-y-6 px-5 py-8 md:px-8 lg:px-10">
      <SectionHeading id="new-question-heading" note="بانک سؤال همین مؤسسه">افزودن سؤال جدید</SectionHeading>
      <InstituteQuestionForm courses={result.courses} />
    </main>
  );
}
