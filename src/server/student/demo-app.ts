/**
 * Publicly shareable synthetic student records for preview only.
 * Never use these as entitlements, payments or identities in operational queries.
 */
export type DemoCourse = {
  id: string;
  title: string;
  provider: string;
  lessonCount: number;
  completedLessons: number;
  subject: string;
  accent: string;
};
export type DemoAssessment = {
  id: string;
  title: string;
  courseId: string;
  question: string;
  choices: readonly string[];
  correctChoice: number;
  explanation: string;
};
export const demoStudentWorkspace = {
  studentName: "دانش‌آموز نمونه",
  courses: [
    { id: "math-10", title: "ریاضی دهم؛ توابع", provider: "مؤسسه آموزشی نمونه", subject: "ریاضی", lessonCount: 12, completedLessons: 8, accent: "violet" },
    { id: "physics-10", title: "فیزیک دهم؛ حرکت", provider: "مدرس آزمایشی تحت نظارت", subject: "فیزیک", lessonCount: 10, completedLessons: 3, accent: "blue" },
    { id: "chemistry-10", title: "شیمی دهم؛ ساختار اتم", provider: "مؤسسه آموزشی نمونه", subject: "شیمی", lessonCount: 8, completedLessons: 0, accent: "green" },
  ] satisfies DemoCourse[],
  assessments: [
    { id: "practice-functions", title: "تمرین مفهوم تابع", courseId: "math-10",
      question: "کدام رابطه به هر ورودی دقیقاً یک خروجی اختصاص می‌دهد؟",
      choices: ["تابع", "رابطه چندخروجی", "مجموعه نامرتب", "هیچ‌کدام"],
      correctChoice: 0, explanation: "در تعریف تابع، هر عضو دامنه دقیقاً یک تصویر دارد." },
    { id: "practice-motion", title: "تمرین حرکت یکنواخت", courseId: "physics-10",
      question: "در حرکت یکنواخت سرعت چه وضعیتی دارد؟",
      choices: ["همواره افزایش دارد", "ثابت است", "صفر است", "همواره کاهش دارد"],
      correctChoice: 1, explanation: "در حرکت یکنواخت، سرعت در طول زمان ثابت می‌ماند." },
  ] satisfies DemoAssessment[],
  growth: [
    { label: "هفته اول", completed: 2 },
    { label: "هفته دوم", completed: 5 },
    { label: "هفته سوم", completed: 8 },
    { label: "هفته چهارم", completed: 11 },
  ],
} as const;

export function isStudentDemoEnabled(env: {
  NODE_ENV?: string;
  DENA_DEMO_MODE?: string;
  DENA_DEMO_ALLOW_PRODUCTION?: string;
} = process.env): boolean {
  return env.DENA_DEMO_MODE === "enabled" &&
    (env.NODE_ENV !== "production" || env.DENA_DEMO_ALLOW_PRODUCTION === "enabled");
}

export function gradeDemoPractice(assessmentId: string, choice: number) {
  const assessment = demoStudentWorkspace.assessments.find((entry) => entry.id === assessmentId);
  if (!assessment || !Number.isInteger(choice) || choice < 0 || choice >= assessment.choices.length) return null;
  return {
    correct: assessment.correctChoice === choice,
    explanation: assessment.explanation,
    // Deliberately not persisted, not a real exam result.
    stored: false,
    mode: "synthetic" as const,
  };
}
