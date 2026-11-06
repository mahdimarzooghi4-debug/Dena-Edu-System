import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { demoStudentWorkspace, gradeDemoPractice } from "./demo-app";

export const DEMO_COOKIE = "dena_student_synthetic_v1";
export type EliteStatus = "not_registered" | "registered" | "in_progress" | "pending";
export type ServiceKind = "educational" | "welfare" | "business";
export type DemoTicket = { id: number; subject: string; message: string; reply: string };
export type DemoState = {
  version: 1;
  name: string;
  grade: string;
  completed: string[];
  notes: Record<string, string>;
  attempts: Record<string, { choice: number; correct: boolean }>;
  elite: { status: EliteStatus; answers: Record<string, number> };
  services: Partial<Record<ServiceKind, "requested">>;
  tickets: DemoTicket[];
  readNotifications: string[];
};

const allowedGrades = ["دهم تجربی", "دهم ریاضی", "یازدهم تجربی", "یازدهم ریاضی", "دوازدهم تجربی", "دوازدهم ریاضی"] as const;
const evaluationQuestions = [
  { id: "motivation", question: "وقتی با مسئله دشواری روبه‌رو می‌شوی معمولاً چه می‌کنی؟", choices: ["آن را به بخش‌های کوچک‌تر تقسیم می‌کنم", "از معلم یا هم‌کلاسی می‌پرسم", "با روشی دیگر دوباره تلاش می‌کنم"] },
  { id: "learning", question: "کدام روش یادگیری را بیشتر دوست داری؟", choices: ["تماشای آموزش", "تمرین عملی", "گفت‌وگو و پرسش"] },
  { id: "interests", question: "کدام حوزه برایت جذاب‌تر است؟", choices: ["علوم و فناوری", "هنر و خلاقیت", "کسب‌وکار و حل مسئله"] },
] as const;
export const demoEvaluationQuestions = evaluationQuestions;

export function freshDemoState(): DemoState {
  return { version: 1, name: "دانش‌آموز نمونه", grade: "دهم تجربی", completed: [],
    notes: {}, attempts: {}, elite: { status: "not_registered", answers: {} },
    services: {}, tickets: [], readNotifications: [] };
}

export class DemoInputError extends Error {
  constructor(message: string) { super(message); this.name = "DemoInputError"; }
}
function record(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new DemoInputError("درخواست نامعتبر است.");
  return input as Record<string, unknown>;
}
function safeText(value: unknown, min: number, max: number): string {
  if (typeof value !== "string") throw new DemoInputError("متن نامعتبر است.");
  const text = value.trim();
  if (text.length < min || text.length > max || /[\u0000-\u001f\u007f]/u.test(text)) {
    throw new DemoInputError("طول یا محتوای متن نامعتبر است.");
  }
  return text;
}
function lessonKey(raw: unknown) {
  if (typeof raw !== "string") throw new DemoInputError("شناسه درس نامعتبر است.");
  const [id, number, extra] = raw.split(":");
  const course = demoStudentWorkspace.courses.find(item => item.id === id);
  if (!course || extra || !/^[1-9][0-9]*$/u.test(number ?? "") ||
    Number(number) > course.lessonCount) throw new DemoInputError("درس یافت نشد.");
  return raw;
}
function serviceKind(kind: unknown): ServiceKind {
  if (kind === "educational" || kind === "welfare" || kind === "business") return kind;
  throw new DemoInputError("نوع خدمت نامعتبر است.");
}
export type DemoAction =
  | { type: "completeLesson"; lesson: string }
  | { type: "saveNote"; lesson: string; text: string }
  | { type: "attempt"; assessmentId: string; choice: number }
  | { type: "updateProfile"; name: string; grade: string }
  | { type: "applyElite" }
  | { type: "startEvaluation" }
  | { type: "answerEvaluation"; questionId: string; choice: number }
  | { type: "submitEvaluation" }
  | { type: "requestService"; kind: ServiceKind }
  | { type: "createTicket"; subject: string; message: string }
  | { type: "replyTicket"; id: number; reply: string }
  | { type: "markNotificationRead"; id: string }
  | { type: "reset" };

export function applyDemoAction(previous: DemoState, actionInput: unknown) {
  const action = record(actionInput);
  const next: DemoState = structuredClone(previous);
  let feedback = "تغییر آزمایشی ثبت شد.";
  let result: Record<string, unknown> = {};
  switch (action.type) {
    case "completeLesson": {
      const key = lessonKey(action.lesson);
      if (!next.completed.includes(key)) next.completed.push(key);
      feedback = "این درس در پیشرفت آزمایشی تکمیل شد.";
      break;
    }
    case "saveNote": {
      const key = lessonKey(action.lesson);
      const note = safeText(action.text, 1, 200);
      if (!next.notes[key] && Object.keys(next.notes).length >= 6) throw new DemoInputError("حداکثر شش یادداشت نمونه مجاز است.");
      next.notes[key] = note;
      feedback = "یادداشت آزمایشی ذخیره شد.";
      break;
    }
    case "attempt": {
      if (typeof action.assessmentId !== "string" || typeof action.choice !== "number") {
        throw new DemoInputError("پاسخ نامعتبر است.");
      }
      const graded = gradeDemoPractice(action.assessmentId, action.choice);
      if (!graded) throw new DemoInputError("تمرین یافت نشد.");
      next.attempts[action.assessmentId] = { choice: action.choice, correct: graded.correct };
      result = { correct: graded.correct, explanation: graded.explanation };
      feedback = "نتیجه فقط در کارنامه آزمایشی به‌روزرسانی شد.";
      break;
    }
    case "updateProfile": {
      next.name = safeText(action.name, 2, 40);
      const grade = safeText(action.grade, 2, 40);
      if (!allowedGrades.some(item => item === grade)) throw new DemoInputError("پایه تحصیلی معتبر نیست.");
      next.grade = grade;
      feedback = "پروفایل نمونه به‌روزرسانی شد.";
      break;
    }
    case "applyElite":
      if (next.elite.status !== "not_registered") throw new DemoInputError("ثبت‌نام نمونه قبلاً انجام شده است.");
      next.elite.status = "registered";
      feedback = "ثبت‌نام آزمایشی انجام شد؛ هیچ عضویت واقعی ایجاد نشد.";
      break;
    case "startEvaluation":
      if (next.elite.status !== "registered" && next.elite.status !== "in_progress") {
        throw new DemoInputError("ابتدا ثبت‌نام آزمایشی را انجام بده.");
      }
      next.elite.status = "in_progress";
      feedback = "پرسش‌نامه آزمایشی آغاز شد.";
      break;
    case "answerEvaluation": {
      if (next.elite.status !== "in_progress") throw new DemoInputError("ارزیابی فعال نیست.");
      const question = evaluationQuestions.find(q => q.id === action.questionId);
      if (!question || typeof action.choice !== "number" || !Number.isInteger(action.choice) ||
        action.choice < 0 || action.choice >= question.choices.length) throw new DemoInputError("پاسخ نامعتبر است.");
      next.elite.answers[question.id] = action.choice;
      feedback = "پاسخ آزمایشی ثبت شد.";
      break;
    }
    case "submitEvaluation":
      if (next.elite.status !== "in_progress" ||
        evaluationQuestions.some(q => next.elite.answers[q.id] === undefined)) {
        throw new DemoInputError("همه پرسش‌ها باید تکمیل شده باشند.");
      }
      next.elite.status = "pending";
      feedback = "ارزیابی آزمایشی ارسال شد؛ وضعیت در انتظار بررسی است و عضویتی اعطا نمی‌شود.";
      break;
    case "requestService": {
      const kind = serviceKind(action.kind);
      if (next.services[kind]) throw new DemoInputError("این درخواست نمونه قبلاً ثبت شده است.");
      next.services[kind] = "requested";
      feedback = "درخواست نمونه ثبت شد؛ تخصیص خدمت یا هزینه‌ای انجام نشده است.";
      break;
    }
    case "createTicket": {
      if (next.tickets.length >= 3) throw new DemoInputError("حداکثر سه تیکت نمونه مجاز است.");
      const subject = safeText(action.subject, 3, 70);
      const message = safeText(action.message, 10, 250);
      next.tickets.push({ id: next.tickets.length + 1, subject, message, reply: "" });
      feedback = "تیکت نمونه ثبت شد؛ برای کارشناس واقعی ارسال نشده است.";
      break;
    }
    case "replyTicket": {
      const ticket = next.tickets.find(t => t.id === action.id);
      if (!ticket) throw new DemoInputError("تیکت یافت نشد.");
      ticket.reply = safeText(action.reply, 2, 200);
      feedback = "پیام نمونه ثبت شد؛ برای کارشناس واقعی ارسال نشده است.";
      break;
    }
    case "markNotificationRead": {
      const id = safeText(action.id, 1, 32);
      if (!["welcome", "lesson", "practice", "elite", "service", "ticket"].includes(id)) {
        throw new DemoInputError("اعلان یافت نشد.");
      }
      if (!next.readNotifications.includes(id)) next.readNotifications.push(id);
      feedback = "اعلان نمونه خوانده شد.";
      break;
    }
    case "reset":
      return { state: freshDemoState(), feedback: "همه وضعیت‌های آزمایشی بازنشانی شدند.", result: {} };
    default: throw new DemoInputError("عملیات پشتیبانی نمی‌شود.");
  }
  if (JSON.stringify(next).length > 2700) throw new DemoInputError("فضای آزمایشی پر شده است؛ ابتدا بازنشانی کن.");
  return { state: next, feedback, result };
}

const temporaryLocalKey = randomBytes(32).toString("hex");
function signingKey() {
  if (process.env.NODE_ENV === "production" && !process.env.DENA_DEMO_SIGNING_KEY) return null;
  return process.env.DENA_DEMO_SIGNING_KEY || process.env.BETTER_AUTH_SECRET || temporaryLocalKey;
}
export function encodeDemoState(state: DemoState): string {
  const key = signingKey();
  if (!key) throw new DemoInputError("کلید امضای داده آزمایشی تنظیم نشده است.");
  const body = Buffer.from(JSON.stringify(state), "utf8").toString("base64url");
  const signature = createHmac("sha256", key).update(body).digest("hex");
  return body + "." + signature;
}
export function decodeDemoState(input: string | undefined): DemoState {
  if (!input || input.length > 3800) return freshDemoState();
  const key = signingKey();
  if (!key) return freshDemoState();
  const [body, sig, extra] = input.split(".");
  if (extra || !body || !sig || !/^[0-9a-f]{64}$/u.test(sig)) return freshDemoState();
  const expected = createHmac("sha256", key).update(body).digest();
  if (!timingSafeEqual(expected, Buffer.from(sig, "hex"))) return freshDemoState();
  try {
    const parsed: unknown = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    const obj = record(parsed);
    if (obj.version !== 1 || typeof obj.name !== "string" || typeof obj.grade !== "string" ||
      !Array.isArray(obj.completed) || !obj.completed.every(x => typeof x === "string") ||
      !obj.notes || typeof obj.notes !== "object" || !obj.attempts || typeof obj.attempts !== "object" ||
      !obj.elite || typeof obj.elite !== "object" || !obj.services || typeof obj.services !== "object" ||
      !Array.isArray(obj.tickets) || !Array.isArray(obj.readNotifications)) return freshDemoState();
    return parsed as DemoState;
  } catch { return freshDemoState(); }
}
