import type { SeedTopicId } from "./seed-corpus";

const prompts: Record<SeedTopicId, string> = {
  "math.linear-equation.v1": "معادلهٔ یک‌مجهولی را مرحله‌به‌مرحله مرور کن.",
  "math.fractions.add.v1": "جمع کسرها را با مثال مرور کن.",
  "math.percent.v1": "درصد را با یک مثال ساده مرور کن.",
  "science.light.v1": "نور و عدسی را با مثال مرور کن.",
  "geography.climate.v1": "اقلیم و رطوبت را با مثال مرور کن.",
};

export function getStudyPrompt(topicId: string): string | null {
  return Object.prototype.hasOwnProperty.call(prompts, topicId)
    ? prompts[topicId as SeedTopicId]
    : null;
}

export function recommendNextStudyStep(
  topics: readonly { topicId: string; practiceAttemptCount: number; practiceNeedsGuidance: boolean }[],
) {
  const topic = topics.find((item) => item.practiceNeedsGuidance && getStudyPrompt(item.topicId));
  if (!topic) return null;
  return { topicId: topic.topicId, prompt: getStudyPrompt(topic.topicId)! };
}
