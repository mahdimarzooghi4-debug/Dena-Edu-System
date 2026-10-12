/** Small, reviewed Dena-owned starter corpus. This is retrieval over authored
 * examples, not a trained model. Unsupported questions must remain unanswered.
 */
export const SEED_CORPUS_VERSION = "2026-10-12.2";
export type SeedTopicId =
  | "math.linear-equation.v1"
  | "math.fractions.add.v1"
  | "math.percent.v1"
  | "science.light.v1"
  | "geography.climate.v1";
const seedTopicIds: readonly string[] = [
  "math.linear-equation.v1",
  "math.fractions.add.v1",
  "math.percent.v1",
  "science.light.v1",
  "geography.climate.v1",
];
export function isSeedTopicId(value: string): value is SeedTopicId {
  return seedTopicIds.includes(value);
}

const lessons = [
  {
    id: "math.linear-equation.v1",
    title: "معادلهٔ یک‌مجهولی",
    keywords: ["معادله", "مجهولی", "x", "ایکس", "حل معادله", "طرفین"],
    answer: "برای حل معادله، مجهول را تنها بگذار و هر عملی را که روی یک طرف انجام می‌دهی، روی طرف دیگر هم انجام بده.\n\nمثال: در ۳x + ۵ = ۱۷، ابتدا ۵ را از هر دو طرف کم می‌کنیم: ۳x = ۱۲. بعد هر دو طرف را بر ۳ تقسیم می‌کنیم: x = ۴.\n\nبرای بررسی، ۴ را جای x بگذار: ۳×۴ + ۵ = ۱۷.",
    practice: {
      id: "practice.linear-equation.v1",
      prompt: "اگر ۲x + ۳ = ۱۱ باشد، x چند است؟",
      options: ["۳", "۴", "۵", "۷"],
      correctOption: 1,
      explanation: "۳ را از دو طرف کم کن: ۲x = ۸. سپس دو طرف را بر ۲ تقسیم کن: x = ۴.",
      guidedHint: "اول عددی را که تنهاست از هر دو طرف کم کن؛ بعد ضریب کنار x را حذف کن.",
    },
  },
  {
    id: "math.fractions.add.v1",
    title: "جمع کسرها",
    keywords: ["کسر", "کسرها", "جمع کسر", "مخرج", "صورت"],
    answer: "برای جمع دو کسر، اول مخرج مشترک پیدا کن. سپس هر کسر را به کسری هم‌ارز با آن مخرج تبدیل کن و صورت‌ها را جمع بزن.\n\nمثال: ۱/۲ + ۱/۳ = ۳/۶ + ۲/۶ = ۵/۶. مخرج‌ها را مستقیم با هم جمع نمی‌کنیم.",
    practice: {
      id: "practice.fractions.add.v1",
      prompt: "حاصل ۱/۴ + ۱/۲ کدام است؟",
      options: ["۱/۴", "۲/۴", "۳/۴", "۳/۶"],
      correctOption: 2,
      explanation: "۱/۲ را به ۲/۴ تبدیل کن؛ سپس ۱/۴ + ۲/۴ = ۳/۴.",
      guidedHint: "مخرج مشترک ۴ است؛ کسر دوم را هم‌ارزِ چهارم بنویس و بعد صورت‌ها را جمع کن.",
    },
  },
  {
    id: "math.percent.v1",
    title: "درصد",
    keywords: ["درصد", "درصدی", "٪", "بهره", "تخفیف"],
    answer: "درصد یعنی «از هر صد». برای پیدا کردن p درصدِ یک عدد، عدد را در p ضرب کن و بر ۱۰۰ تقسیم کن.\n\nمثال: ۲۰٪ از ۱۵۰ می‌شود (۱۵۰ × ۲۰) ÷ ۱۰۰ = ۳۰. اگر قیمت ۱۵۰ هزار تومان ۲۰٪ تخفیف بخورد، قیمت نهایی ۱۲۰ هزار تومان است.",
    practice: {
      id: "practice.percent.v1",
      prompt: "۱۵٪ از ۲۰۰ چند است؟",
      options: ["۲۰", "۳۰", "۳۵", "۴۰"],
      correctOption: 1,
      explanation: "(۲۰۰ × ۱۵) ÷ ۱۰۰ = ۳۰.",
      guidedHint: "عدد را در درصد ضرب کن و حاصل را بر ۱۰۰ تقسیم کن.",
    },
  },
  {
    id: "science.light.v1",
    title: "نور و عدسی",
    keywords: ["نور", "عدسی", "محدب", "مقعر", "فاصله کانونی", "کانونی"],
    answer: "نور در یک محیط یکنواخت معمولاً در مسیر مستقیم منتشر می‌شود. عدسی محدب در شرایط مناسب پرتوهای موازی را به هم نزدیک می‌کند و عدسی مقعر آن‌ها را از هم دور می‌کند.\n\nنقطه‌ای که پرتوهای موازی پس از عبور از عدسی محدب به هم می‌رسند، کانون عدسی نام دارد؛ فاصلهٔ عدسی تا این نقطه را فاصلهٔ کانونی می‌گویند. جای تصویر به فاصلهٔ جسم از عدسی هم بستگی دارد.",
    practice: {
      id: "practice.science.light.v1",
      prompt: "عدسی محدب با پرتوهای موازی نور چه می‌کند؟",
      options: ["پرتوها را به هم نزدیک می‌کند", "پرتوها را از هم دور می‌کند", "نور را کاملاً متوقف می‌کند", "مسیر نور را همیشه خمیده می‌کند"],
      correctOption: 0,
      explanation: "عدسی محدب پرتوهای موازی را پس از عبور به هم نزدیک می‌کند؛ در حالت آرمانی آن‌ها نزدیک کانون به هم می‌رسند.",
      guidedHint: "شکل عدسی محدب در وسط ضخیم‌تر است و پرتوهای موازی را همگرا می‌کند.",
    },
  },
  {
    id: "geography.climate.v1",
    title: "اقلیم و رطوبت",
    keywords: ["اقلیم", "آب و هوا", "آب‌وهوا", "رطوبت", "بخار آب", "بارش", "هواشناسی"],
    answer: "وضع هوا شرایط کوتاه‌مدت جو، مثل دما و بارش امروز است؛ اقلیم الگوی معمول این شرایط در یک منطقه طی سال‌های طولانی است.\n\nرطوبت هوا به مقدار بخار آب موجود در هوا گفته می‌شود. هوای گرم می‌تواند بخار آب بیشتری در خود نگه دارد، اما وجود رطوبت به‌تنهایی به معنی بارش نیست؛ برای بارش، بخار آب باید سرد و متراکم شود و قطره‌ها یا بلورهای یخ تشکیل دهند.",
    practice: {
      id: "practice.geography.climate.v1",
      prompt: "کدام گزینه تفاوت وضع هوا و اقلیم را درست بیان می‌کند؟",
      options: ["وضع هوا کوتاه‌مدت است و اقلیم الگوی بلندمدت یک منطقه است", "اقلیم فقط دمای امروز است", "وضع هوا فقط دریاها را توصیف می‌کند", "این دو واژه همیشه معنی یکسان دارند"],
      correctOption: 0,
      explanation: "وضع هوا تغییرهای کوتاه‌مدت جو را توصیف می‌کند؛ اقلیم از الگوی معمول این شرایط در دوره‌ای طولانی به دست می‌آید.",
      guidedHint: "به بازهٔ زمانی توجه کن: امروز در برابر الگوی چندسالهٔ یک منطقه.",
    },
  },
] as const;

export type SeedAnswer = {
  answer: string;
  source: { id: SeedTopicId; title: string; corpusVersion: string };
  guidedHint?: string;
};
export type SeedPractice = {
  id: string;
  topicId: SeedTopicId;
  topicTitle: string;
  prompt: string;
  options: readonly string[];
  guidedHint: string;
};
export type SeedPracticeResult = {
  correct: boolean;
  explanation: string;
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

export function getSeedPractice(topicId: SeedTopicId): SeedPractice {
  const lesson = lessons.find((candidate) => candidate.id === topicId);
  if (!lesson) throw new Error("unknown tutor topic");
  return {
    id: lesson.practice.id,
    topicId: lesson.id,
    topicTitle: lesson.title,
    prompt: lesson.practice.prompt,
    options: lesson.practice.options,
    guidedHint: lesson.practice.guidedHint,
  };
}

export function gradeSeedPractice(
  questionId: string,
  selectedOption: number,
): SeedPracticeResult | null {
  const practice = lessons.find((lesson) => lesson.practice.id === questionId)?.practice;
  if (!practice) return null;
  return {
    correct: practice.correctOption === selectedOption,
    explanation: practice.explanation,
  };
}


/** Adds only Dena-authored guidance for a student's own explicitly saved
 * practice outcome. This is deterministic adaptation, not model training.
 */
export function applySeedPracticeGuidance(
  answer: SeedAnswer,
  needsGuidance: boolean,
): SeedAnswer {
  if (!needsGuidance) return answer;
  return {
    ...answer,
    guidedHint: getSeedPractice(answer.source.id).guidedHint,
  };
}
