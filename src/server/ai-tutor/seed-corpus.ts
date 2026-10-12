/** Small, reviewed Dena-owned starter corpus. This is retrieval over authored
 * examples, not a trained model. Unsupported questions must remain unanswered.
 */
export const SEED_CORPUS_VERSION = "2026-10-12.1";
export type SeedTopicId = "math.linear-equation.v1" | "math.fractions.add.v1" | "math.percent.v1";

const lessons = [
  {
    id: "math.linear-equation.v1",
    title: "معادلهٔ یک‌مجهولی",
    keywords: ["معادله", "مجهولی", "x", "ایکس", "حل معادله", "طرفین"],
    answer: "برای حل معادله، مجهول را تنها بگذار و هر عملی را که روی یک طرف انجام می‌دهی، روی طرف دیگر هم انجام بده.\n\nمثال: در ۳x + ۵ = ۱۷، ابتدا ۵ را از هر دو طرف کم می‌کنیم: ۳x = ۱۲. بعد هر دو طرف را بر ۳ تقسیم می‌کنیم: x = ۴.\n\nبرای بررسی، ۴ را جای x بگذار: ۳×۴ + ۵ = ۱۷.",
  },
  {
    id: "math.fractions.add.v1",
    title: "جمع کسرها",
    keywords: ["کسر", "کسرها", "جمع کسر", "مخرج", "صورت"],
    answer: "برای جمع دو کسر، اول مخرج مشترک پیدا کن. سپس هر کسر را به کسری هم‌ارز با آن مخرج تبدیل کن و صورت‌ها را جمع بزن.\n\nمثال: ۱/۲ + ۱/۳ = ۳/۶ + ۲/۶ = ۵/۶. مخرج‌ها را مستقیم با هم جمع نمی‌کنیم.",
  },
  {
    id: "math.percent.v1",
    title: "درصد",
    keywords: ["درصد", "درصدی", "٪", "بهره", "تخفیف"],
    answer: "درصد یعنی «از هر صد». برای پیدا کردن p درصدِ یک عدد، عدد را در p ضرب کن و بر ۱۰۰ تقسیم کن.\n\nمثال: ۲۰٪ از ۱۵۰ می‌شود (۱۵۰ × ۲۰) ÷ ۱۰۰ = ۳۰. اگر قیمت ۱۵۰ هزار تومان ۲۰٪ تخفیف بخورد، قیمت نهایی ۱۲۰ هزار تومان است.",
  },
] as const;

export type SeedAnswer = {
  answer: string;
  source: { id: SeedTopicId; title: string; corpusVersion: string };
};

export function answerFromSeedCorpus(message: string): SeedAnswer | null {
  const normalized = message.toLocaleLowerCase("fa-IR").replace(/[يى]/gu, "ی").replace(/ك/gu, "ک");
  const match = lessons
    .map((lesson) => ({
      lesson,
      score: lesson.keywords.reduce((score, keyword) =>
        score + (normalized.includes(keyword.toLocaleLowerCase("fa-IR")) ? 1 : 0), 0),
    }))
    .filter((candidate) => candidate.score > 0)
    .sort((a, b) => b.score - a.score || a.lesson.id.localeCompare(b.lesson.id))[0];
  if (!match) return null;
  return {
    answer: match.lesson.answer,
    source: {
      id: match.lesson.id,
      title: match.lesson.title,
      corpusVersion: SEED_CORPUS_VERSION,
    },
  };
}
