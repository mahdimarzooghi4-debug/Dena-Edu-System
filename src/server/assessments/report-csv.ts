const formulaLead = /^[\u0000-\u0020]*[=+\-@]/;

export function csvCell(value: string | number | null) {
  let text = value === null ? "" : String(value);
  if (formulaLead.test(text)) text = "'" + text;
  return `"${text.replaceAll('"', '""')}"`;
}

export function examAttemptsCsv(report: {
  attempts: Array<{
    studentName: string; attemptNumber: number; status: string; startedAt: Date;
    submittedAt: Date | null; correctCount: number | null; earnedPoints: number | null;
    totalPoints: number | null; scorePercent: number | null;
  }>;
}) {
  const headings = ["نام دانش‌آموز", "شماره تلاش", "وضعیت", "زمان شروع", "زمان ثبت", "پاسخ درست", "امتیاز کسب‌شده", "کل امتیاز", "درصد"];
  const rows = report.attempts.map((attempt) => [
    attempt.studentName,
    attempt.attemptNumber,
    attempt.status === "in_progress" ? "در حال انجام" : attempt.status === "submitted" ? "ثبت‌شده" : "اتمام زمان",
    attempt.startedAt.toISOString(),
    attempt.submittedAt?.toISOString() ?? null,
    attempt.correctCount,
    attempt.earnedPoints,
    attempt.totalPoints,
    attempt.scorePercent,
  ]);
  return "\uFEFF" + [headings, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
}
