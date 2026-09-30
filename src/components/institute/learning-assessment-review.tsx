"use client";

import { useState } from "react";
import { Button } from "../ui/button";

type Assessment = {
  id: string;
  title: string;
  instructions: string;
  questionCount: number;
  requiredCorrectCount: number;
  reviewStatus: "pending" | "approved" | "rejected";
  reviewReason: string | null;
  questions: Array<{
    prompt: string; option0: string; option1: string; option2: string;
    option3: string; correctOption: number; lessonAssetId: string;
  }>;
};

export function LearningAssessmentReview({ courseId, assessments, canReview }: {
  courseId: string;
  assessments: Assessment[];
  canReview: boolean;
}) {
  return <div className="space-y-5">
    {assessments.length === 0 && <p className="rounded-xl bg-dena-bg p-5 text-sm leading-8">
      ارائه‌دهنده هنوز ارزیابی یادگیری برای این دوره ثبت نکرده است.
    </p>}
    {assessments.map((assessment) => <ReviewItem key={assessment.id}
      courseId={courseId} assessment={assessment} canReview={canReview} />)}
  </div>;
}

function ReviewItem({ courseId, assessment, canReview }: {
  courseId: string; assessment: Assessment; canReview: boolean;
}) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [decided, setDecided] = useState(false);
  const status = { pending: "در انتظار تصمیم", approved: "تأییدشده",
    rejected: "ردشده" } as const;

  async function decide(action: "approve" | "reject") {
    if (busy || reason.trim().length < 15) return;
    setBusy(true); setMessage("");
    try {
      const response = await fetch(`/api/institute/courses/${courseId}/assessments/${assessment.id}`, {
        method: "POST", credentials: "same-origin", cache: "no-store",
        headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, reason }),
      });
      if (!response.ok) {
        setMessage(response.status === 409
          ? "برای این ارزیابی تصمیم نهایی قبلاً ثبت شده است."
          : "ثبت تصمیم ممکن نشد؛ وضعیت دوره و استقلال نقش خود را بررسی کنید.");
        return;
      }
      setMessage(action === "approve" ? "ارزیابی تأیید شد." : "ارزیابی رد شد.");
      setDecided(true);
      window.location.reload();
    } catch {
      setMessage("ارتباط با سرور برقرار نشد؛ دوباره تلاش کنید.");
    } finally { setBusy(false); }
  }

  return <article className="space-y-5 rounded-xl border border-dena-line bg-white p-5">
    <div>
      <p className="text-xs font-bold text-dena-brand">{status[assessment.reviewStatus]}</p>
      <h2 className="mt-2 text-lg font-extrabold">{assessment.title}</h2>
      <p className="mt-2 text-sm leading-7 text-dena-muted">{assessment.instructions}</p>
      <p className="mt-2 text-xs font-bold text-dena-muted">
        {assessment.questionCount} پرسش در هر تلاش · حدنصاب: {assessment.requiredCorrectCount}
      </p>
      {assessment.reviewReason && <p className="mt-2 text-sm leading-7">دلیل ثبت‌شده: {assessment.reviewReason}</p>}
    </div>
    <ol className="list-inside list-decimal space-y-4 rounded-xl bg-dena-bg p-4">
      {assessment.questions.map((question, index) => {
        const options = [question.option0, question.option1, question.option2, question.option3];
        return <li key={`${assessment.id}-${index}`} className="font-bold">
          {question.prompt}
          <ol className="ms-5 mt-2 list-inside list-[upper-alpha] space-y-1 font-normal">
            {options.map((option, optionIndex) => <li key={optionIndex}>
              {option}{optionIndex === question.correctOption ? " — پاسخ درست اعلام‌شده" : ""}
            </li>)}
          </ol>
        </li>;
      })}
    </ol>
    {canReview && assessment.reviewStatus === "pending" && !decided && <div className="space-y-4">
      <label htmlFor={`assessment-reason-${assessment.id}`} className="block text-sm font-bold">
        دلیل تصمیم مستقل مؤسسه (حداقل ۱۵ نویسه)
      </label>
      <textarea id={`assessment-reason-${assessment.id}`} value={reason} rows={3} maxLength={500}
        disabled={busy} onChange={(event) => setReason(event.target.value)}
        className="w-full rounded-xl border border-dena-border p-3 text-sm leading-7" />
      <div className="flex flex-wrap gap-3">
        <Button type="button" disabled={busy || reason.trim().length < 15}
          onClick={() => void decide("approve")}>تأیید ارزیابی</Button>
        <Button type="button" variant="outline" disabled={busy || reason.trim().length < 15}
          onClick={() => void decide("reject")}>رد ارزیابی</Button>
      </div>
      {message && <p role="status" className="text-sm">{message}</p>}
    </div>}
    {!canReview && assessment.reviewStatus === "pending" && <p role="status" className="text-sm leading-7 text-dena-muted">
      تصمیم تازه فقط برای دورهٔ پیش‌نویس و با حساب مؤسسه‌ای مستقل از ارائه‌دهندهٔ همین دوره ثبت می‌شود.
    </p>}
  </article>;
}
