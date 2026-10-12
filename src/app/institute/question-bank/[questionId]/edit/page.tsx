import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { InstituteQuestionForm } from "../../../../../components/institute/question-form";
import { SectionHeading } from "../../../../../components/ui/section-heading";
import { getServerAccessContext } from "../../../../../server/access/actor";
import {
  getInstituteQuestionBank, getInstituteQuestionById,
} from "../../../../../server/institute/question-bank";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "ویرایش سؤال | دنا", robots: { index: false, follow: false } };

export default async function EditInstituteQuestionPage({
  params,
}: { params: Promise<{ questionId: string }> }) {
  if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET ||
      !process.env.BETTER_AUTH_URL) redirect("/login");
  const actor = await getServerAccessContext();
  if (!actor) redirect("/login");
  if (!actor.memberships.some((member) => member.role === "institute")) notFound();
  const { questionId } = await params;
  if (!z.uuid().safeParse(questionId).success) notFound();
  const [question, result] = await Promise.all([
    getInstituteQuestionById(actor.userId, questionId),
    getInstituteQuestionBank(actor.userId),
  ]);
  if (!question) notFound();
  return (
    <main id="main-content" className="mx-auto min-h-screen max-w-5xl space-y-6 px-5 py-8 md:px-8 lg:px-10">
      <SectionHeading id="edit-question-heading" note="بانک سؤال همین مؤسسه">ویرایش سؤال</SectionHeading>
      <InstituteQuestionForm courses={result.courses} question={question} />
    </main>
  );
}
