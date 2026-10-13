import type { SeedTopicId } from "./seed-corpus";

type StudyCard = { prompt: string; explanation: string };

const studyCards: Record<SeedTopicId, StudyCard> = {
  "math.linear-equation.v1": {
    prompt: "معادلهٔ یک‌مجهولی را مرحله‌به‌مرحله مرور کن.",
    explanation: "برای تنهاکردن مجهول، یک عمل را روی هر دو طرف تساوی انجام بده. در ۳x + ۵ = ۱۷، ابتدا ۵ را کم می‌کنیم و به ۳x = ۱۲ می‌رسیم؛ سپس بر ۳ تقسیم می‌کنیم: x = ۴.",
  },
  "math.fractions.add.v1": {
    prompt: "جمع کسرها را با مثال مرور کن.",
    explanation: "برای جمع کسرها مخرج مشترک بگیر و بعد صورت‌ها را جمع کن. مثلاً ۱/۲ + ۱/۳ برابر ۳/۶ + ۲/۶، یعنی ۵/۶ است؛ مخرج‌ها را مستقیم جمع نمی‌کنیم.",
  },
  "math.percent.v1": {
    prompt: "درصد را با یک مثال ساده مرور کن.",
    explanation: "درصد یعنی از هر صد. برای محاسبهٔ p درصدِ یک عدد، عدد را در p ضرب و بر ۱۰۰ تقسیم کن؛ مثلاً ۲۰٪ از ۱۵۰ برابر ۳۰ است.",
  },
  "science.light.v1": {
    prompt: "نور و عدسی را با مثال مرور کن.",
    explanation: "نور در محیط یکنواخت معمولاً مستقیم حرکت می‌کند. عدسی محدب پرتوهای موازی را به هم نزدیک می‌کند و عدسی مقعر آن‌ها را از هم دور می‌کند؛ نقطهٔ همگراییِ عدسی محدب کانون نام دارد.",
  },
  "geography.climate.v1": {
    prompt: "اقلیم و رطوبت را با مثال مرور کن.",
    explanation: "وضع هوا شرایط کوتاه‌مدت جو مثل بارش امروز است؛ اقلیم الگوی معمول یک منطقه در سال‌های طولانی است. رطوبت مقدار بخار آب هواست و به‌تنهایی به معنی بارش نیست.",
  },
};

export function getStudyPrompt(topicId: string): string | null {
  return Object.prototype.hasOwnProperty.call(studyCards, topicId)
    ? studyCards[topicId as SeedTopicId].prompt
    : null;
}

export function recommendNextStudyStep(
  topics: readonly { topicId: string; practiceAttemptCount: number; practiceNeedsGuidance: boolean; lessonFeedback?: "understood" | "needs_help" | null }[],
) {
  const topic = topics.find((item) => item.practiceNeedsGuidance && item.lessonFeedback !== "understood" && getStudyPrompt(item.topicId));
  if (!topic) return null;
  const card = studyCards[topic.topicId as SeedTopicId];
  return { topicId: topic.topicId, prompt: card.prompt, explanation: card.explanation };
}

export function getReviewPracticeTopic(
  topics: readonly { topicId: string; lessonFeedback?: "understood" | "needs_help" | null }[],
): string | null {
  const topic = topics.find((item) =>
    item.lessonFeedback === "needs_help" && getStudyPrompt(item.topicId),
  );
  return topic?.topicId ?? null;
}

export function applyFocusedReviewOutcome<
  T extends {
    topicId: string;
    practiceAttemptCount: number;
    practiceCorrectCount: number;
    practiceNeedsGuidance: boolean;
  },
>(topics: readonly T[], topicId: string, correct: boolean): T[] {
  return topics.map((topic) => topic.topicId === topicId
    ? {
        ...topic,
        practiceAttemptCount: Math.min(topic.practiceAttemptCount + 1, 10000),
        practiceCorrectCount: Math.min(topic.practiceCorrectCount + (correct ? 1 : 0), 10000),
        practiceNeedsGuidance: !correct,
      }
    : topic);
}
