"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { DemoState, ServiceKind } from "../../server/student/demo-engine";

type Course = { id: string; title: string; provider: string; subject: string; lessonCount: number; completedLessons: number; accent: string };
type Assessment = { id: string; title: string; courseId: string; question: string; choices: string[] };
type EvaluationQuestion = { id: string; question: string; choices: string[] };
type Snapshot = {
  mode: "synthetic";
  formal: false;
  persisted: "signed-cookie-only";
  courses: Course[];
  assessments: Assessment[];
  evaluationQuestions: EvaluationQuestion[];
  growth: { label: string; completed: number }[];
  state: DemoState;
};
type Action = { type: string; [key: string]: string | number | undefined };
type StudentWorkspaceProps = { route: string };

const base = "/student/demo";
const primary = "inline-flex min-h-11 items-center justify-center rounded-xl bg-dena-brand px-5 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50";
const secondary = "inline-flex min-h-11 items-center justify-center rounded-xl border border-dena-brand bg-white px-4 py-3 text-sm font-bold text-dena-brand";
const input = "mt-2 w-full min-h-11 rounded-xl border border-dena-border bg-white px-4 py-3 text-sm outline-none focus:border-dena-brand focus:ring-2 focus:ring-dena-lavender";
const card = "rounded-[20px] border border-dena-border bg-white p-5 shadow-sm md:p-6";
const fa = (n: number) => n.toLocaleString("fa-IR");

function Heading({ eyebrow, title, description }: { eyebrow?: string; title: string; description?: string }) {
  return <div className="space-y-2">
    {eyebrow && <p className="text-xs font-bold text-dena-brand">{eyebrow}</p>}
    <h2 className="text-[22px] font-extrabold leading-9 text-dena-deep md:text-[27px]">{title}</h2>
    {description && <p className="text-sm leading-7 text-dena-muted">{description}</p>}
  </div>;
}
function Go({ href, children, outline = false }: { href: string; children: React.ReactNode; outline?: boolean }) {
  return <Link href={base + "/" + href} className={outline ? secondary : primary}>{children}</Link>;
}
function Progress({ label, completed, total }: { label: string; completed: number; total: number }) {
  const pct = total > 0 ? Math.min(100, Math.round(completed / total * 100)) : 0;
  return <div>
    <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs">
      <span className="text-dena-muted">{label}</span><strong className="text-dena-brand">{fa(pct)}٪</strong>
    </div>
    <div className="h-2.5 overflow-hidden rounded-full bg-dena-lavender" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
      <div className="h-full rounded-full bg-dena-brand transition-all" style={{ width: pct + "%" }} />
    </div>
  </div>;
}
function Notice({ children }: { children: React.ReactNode }) {
  return <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-7 text-amber-900">{children}</p>;
}
function Empty({ title, description, href, cta }: { title: string; description: string; href?: string; cta?: string }) {
  return <div className={card + " space-y-4 text-center"}>
    <div aria-hidden="true" className="mx-auto grid size-14 place-items-center rounded-full bg-dena-lavender text-2xl">◌</div>
    <h3 className="font-extrabold">{title}</h3><p className="text-sm leading-7 text-dena-muted">{description}</p>
    {href && cta && <Go href={href}>{cta}</Go>}
  </div>;
}
function LessonTitle({ number, subject }: { number: number; subject: string }) {
  const variants: Record<string, string[]> = {
    "ریاضی": ["آشنایی با تابع", "دامنه و برد", "نمایش تابع", "تابع خطی", "حل مسئله با نمودار"],
    "فیزیک": ["مفهوم حرکت", "مسافت و جابه‌جایی", "سرعت متوسط", "سرعت ثابت", "حل نمونه مسئله"],
    "شیمی": ["ساختار اتم", "ذرات زیراتمی", "عدد اتمی", "جدول تناوبی", "مرور مفاهیم"],
  };
  return <>درس {fa(number)}: {(variants[subject] ?? variants["ریاضی"])[(number - 1) % 5]}</>;
}

export function DemoWorkspace({ route }: StudentWorkspaceProps) {
  const [data, setData] = useState<Snapshot | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [choice, setChoice] = useState<number | null>(null);
  const [quizResult, setQuizResult] = useState<{correct: boolean; explanation: string} | null>(null);
  const [draftName, setDraftName] = useState("");
  const [draftGrade, setDraftGrade] = useState("دهم تجربی");
  const [draftNote, setDraftNote] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [reply, setReply] = useState("");
  const [evaluationIndex, setEvaluationIndex] = useState(0);
  const [reviewMode, setReviewMode] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [teamMessage, setTeamMessage] = useState("");
  const [clubAgreement, setClubAgreement] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/student/demo", { cache: "no-store" });
      if (!response.ok) throw new Error("Unavailable");
      const json = await response.json() as Snapshot;
      if (json.mode !== "synthetic" || json.formal !== false) throw new Error("Invalid mode");
      setData(json);
      setDraftName(json.state.name);
      setDraftGrade(json.state.grade);
    } catch {
      setError("اتصال به بک‌اند آزمایشی برقرار نشد. دوباره تلاش کن.");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/student/demo", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Unavailable");
        return await response.json() as Snapshot;
      })
      .then((json) => {
        if (cancelled) return;
        if (json.mode !== "synthetic" || json.formal !== false) throw new Error("Invalid mode");
        setData(json); setDraftName(json.state.name); setDraftGrade(json.state.grade);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) { setError("اتصال به بک‌اند آزمایشی برقرار نشد."); setLoading(false); }
      });
    return () => { cancelled = true; };
  }, []);

  const act = useCallback(async (action: Action) => {
    setBusy(true); setError(""); setFeedback("");
    try {
      const response = await fetch("/api/student/demo/actions", {
        method: "POST", cache: "no-store",
        headers: { "Content-Type": "application/json" }, body: JSON.stringify(action),
      });
      const json = await response.json() as {
        state?: DemoState; feedback?: string; error?: string; mode?: string;
        correct?: boolean; explanation?: string;
      };
      if (!response.ok || json.mode !== "synthetic" || !json.state) {
        throw new Error(json.error || "ثبت تغییر انجام نشد.");
      }
      setData(current => current ? { ...current, state: json.state! } : current);
      setFeedback(json.feedback || "تغییر ثبت شد.");
      if (action.type === "attempt" && typeof json.correct === "boolean") {
        setQuizResult({ correct: json.correct, explanation: json.explanation || "" });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا در ارتباط با سرور.");
    } finally { setBusy(false); }
  }, []);

  const parts = route.split("/");
  const section = parts[0];
  const state = data?.state;
  const courses = data?.courses ?? [];
  const assessments = data?.assessments ?? [];
  const lessonsDone = (course: Course) => {
    if (!state) return course.completedLessons;
    const doneExtra = state.completed.filter(key => key.startsWith(course.id + ":") &&
      Number(key.split(":")[1]) > course.completedLessons).length;
    return Math.min(course.lessonCount, course.completedLessons + doneExtra);
  };
  const completedAll = courses.reduce((total, course) => total + lessonsDone(course), 0);
  const notifications = [
    { id:"welcome", title:"به فضای دانش‌آموز دنا خوش آمدی", body:"نمونهٔ برنامه؛ اطلاعات آموزشی واقعی نیست." },
    ...(state?.completed.length ? [{id:"lesson", title:"درس تازه تکمیل شد", body:"پیشرفت نمونه به‌روزرسانی شد."}] : []),
    ...(Object.keys(state?.attempts ?? {}).length ? [{id:"practice", title:"نتیجه تمرین آماده است", body:"پاسخ نمونه در سرور بررسی شده است."}] : []),
    ...(state?.elite.status === "pending" ? [{id:"elite", title:"ارزیابی باشگاه دریافت شد", body:"وضعیت نمونه فقط در انتظار بررسی است."}] : []),
    ...(Object.keys(state?.services ?? {}).length ? [{id:"service", title:"درخواست خدمات ثبت شد", body:"هیچ خدمت واقعی تخصیص داده نشده است."}] : []),
    ...(state?.tickets.length ? [{id:"ticket", title:"درخواست پشتیبانی ثبت شد", body:"درخواست فقط در همین نمونه ذخیره شده است."}] : []),
  ];
  const courseCards = (items: Course[]) => (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {items.map(course => <article key={course.id} className={card + " flex flex-col gap-4"}>
        <div className="flex items-center justify-between gap-2">
          <span className="rounded-full bg-dena-lavender px-3 py-1.5 text-xs font-bold text-dena-brand">{course.subject}</span>
          <span className="text-xs text-dena-muted">{fa(lessonsDone(course))} از {fa(course.lessonCount)} جلسه</span>
        </div>
        <div><h3 className="text-lg font-extrabold text-dena-deep">{course.title}</h3><p className="mt-2 text-xs text-dena-muted">{course.provider} (نمونه)</p></div>
        <Progress label="پیشرفت آموزشی آزمایشی" completed={lessonsDone(course)} total={course.lessonCount}/>
        <Go href={"course/" + course.id}>مشاهده جزئیات دوره</Go>
      </article>)}
    </div>
  );

  if (loading && !data) return <div className={card} role="status">در حال بارگذاری اطلاعات آزمایشی…</div>;
  if (!data || !state) return <div className={card + " space-y-4"} role="alert">
    <p>{error || "دادهٔ آزمایشی در دسترس نیست."}</p><button onClick={() => void refresh()} className={primary}>تلاش دوباره</button>
  </div>;

  let content: React.ReactNode;
  if (section === "home") {
    const firstCourse = courses.find(c => lessonsDone(c) < c.lessonCount) ?? courses[0];
    content = <div className="space-y-6">
      <div className="space-y-1"><h2 className="text-2xl font-extrabold">سلام، {state.name} 👋</h2>
        <p className="text-sm text-dena-muted">آماده‌ای مسیر امروزت رو ادامه بدی؟</p></div>
      <div className={card + " space-y-4"}>
        <div className="flex flex-wrap justify-between gap-3"><div><h3 className="text-xl font-extrabold">معلم هوشمند</h3>
          <p className="mt-2 text-sm leading-7 text-dena-muted">آشنایی با تجربهٔ آموزشی و تمرین‌های دنا</p></div>
          <span className="h-fit rounded-full bg-dena-lavender px-3 py-2 text-xs font-bold text-dena-brand">در حال آماده‌سازی</span></div>
        <Go href="ai-tutor">آشنایی با معلم هوشمند</Go>
      </div>
      {firstCourse && <div className={card + " space-y-4"}>
        <Heading eyebrow="ادامه یادگیری" title={firstCourse.title} description={firstCourse.provider}/>
        <Progress label="پیشرفت دوره" completed={lessonsDone(firstCourse)} total={firstCourse.lessonCount}/>
        <Go href={"learn/" + firstCourse.id + "/" + Math.min(firstCourse.lessonCount, lessonsDone(firstCourse) + 1)}>ادامه درس‌ها</Go>
      </div>}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {[["دوره‌ها", courses.length],["جلسه‌های تکمیل‌شده", completedAll],["تمرین‌های حل‌شده", Object.keys(state.attempts).length]].map(([label,n]) =>
        <div key={label} className={card}><p className="text-xs text-dena-muted">{label}</p><strong className="mt-2 block text-2xl text-dena-brand">{fa(Number(n))}</strong></div>)}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-xl font-extrabold">دوره‌های من</h3><Link href={base + "/courses"} className="text-sm font-bold text-dena-brand">مشاهده همه دوره‌ها</Link></div>
      {courseCards(courses)}
      <div className="grid gap-4 md:grid-cols-2">
        <div className={card + " space-y-3"}><h3 className="text-lg font-extrabold">تمرین بعدی</h3><p className="text-sm text-dena-muted">{assessments[0]?.title ?? "تمرین"}</p>
          <Go href="assessments">مشاهده تمرین‌ها</Go></div>
        <div className={card + " space-y-3"}><h3 className="text-lg font-extrabold">مسیر رشد</h3><p className="text-sm text-dena-muted">روند نمونه یادگیری و تمرین‌های تو</p>
          <Go href="growth">مشاهده مسیر رشد</Go></div>
      </div>
      <div className="flex flex-wrap gap-2"><Go outline href="elite-club">باشگاه نخبگان</Go><Go outline href="services">مرکز خدمات</Go><Go outline href="support">پشتیبانی</Go></div>
    </div>;
  } else if (section === "courses" && parts.length === 1) {
    const filtered = courses.filter(course => [course.title,course.subject,course.provider].some(x => x.includes(query.trim())));
    content = <div className="space-y-5">
      <Heading eyebrow="یادگیری" title="دوره‌های من" description="دوره‌های نمونه برای تمرین تجربهٔ واقعی اپ؛ هیچ ثبت‌نام یا پرداختی انجام نشده است."/>
      <label className="block text-sm font-bold">جست‌وجوی دوره<input className={input} value={query} onChange={e=>setQuery(e.target.value)} maxLength={60} placeholder="عنوان، درس یا ارائه‌دهنده"/></label>
      {filtered.length ? courseCards(filtered) : <Empty title="دوره‌ای پیدا نشد" description="عبارت جست‌وجو را تغییر بده."/>}
    </div>;
  } else if (section === "course" && parts.length === 2) {
    const course = courses.find(x=>x.id===parts[1]);
    content = !course ? <Empty title="دوره پیدا نشد" description="از فهرست دوره‌ها یک مورد انتخاب کن." href="courses" cta="دوره‌ها"/> : <div className="space-y-5">
      <Link href={base + "/courses"} className="text-sm font-bold text-dena-brand">بازگشت به دوره‌ها</Link>
      <div className={card + " space-y-4"}><Heading eyebrow={course.subject + " · آموزش نمونه"} title={course.title} description={course.provider}/>
        <p className="text-sm leading-7 text-dena-muted">مرور جلسه‌ها، یادداشت‌برداری و ثبت پیشرفت نمونه. رسانه و محتوای آموزشی واقعی به این نسخه متصل نیست.</p>
        <Progress label="پیشرفت دوره" completed={lessonsDone(course)} total={course.lessonCount}/>
        <Go href={"learn/" + course.id + "/" + Math.min(course.lessonCount, lessonsDone(course) + 1)}>ادامه یادگیری</Go>
      </div>
      <Heading title="فهرست جلسه‌ها"/>
      <div className={card + " divide-y divide-dena-border p-0"}>
        {Array.from({length:course.lessonCount},(_,i)=>i+1).map(i=>{
          const completed = i <= course.completedLessons || state.completed.includes(course.id+":"+i);
          return <Link key={i} href={base + "/learn/" + course.id + "/" + i} className="flex min-h-16 items-center justify-between gap-3 p-4 hover:bg-dena-lavender/30">
            <span className="text-sm font-semibold"><LessonTitle subject={course.subject} number={i}/></span>
            <span className={"shrink-0 text-xs " + (completed?"text-emerald-700":"text-dena-muted")}>{completed?"تکمیل‌شده":"مشاهده"}</span>
          </Link>;
        })}
      </div>
      <div className="flex flex-wrap gap-2"><Go outline href="assessments">تمرین‌های این دوره</Go><Go outline href={"team/"+course.id}>تیم آموزشی و ارتباط</Go><Go outline href="problem-solving">جلسه رفع اشکال</Go></div>
    </div>;
  } else if (section === "learn" && parts.length === 3) {
    const course = courses.find(x=>x.id===parts[1]);
    const index = Number(parts[2]);
    if (!course || !Number.isInteger(index) || index < 1 || index > course.lessonCount) {
      content = <Empty title="جلسه یافت نشد" description="برای ادامه به فهرست دوره‌ها برو." href="courses" cta="دوره‌ها"/>;
    } else {
      const key = course.id+":"+index;
      const done = index <= course.completedLessons || state.completed.includes(key);
      content = <div className="space-y-5">
        <Link href={base + "/course/" + course.id} className="text-sm font-bold text-dena-brand">بازگشت به جلسه‌های دوره</Link>
        <Heading eyebrow={course.title} title={"جلسه " + fa(index) + " از " + fa(course.lessonCount)} description="تجربهٔ یادگیری و یادداشت‌برداری آزمایشی"/>
        <div className={card + " space-y-4"}>
          <div className="grid min-h-52 place-items-center rounded-2xl bg-[#292342] px-5 py-8 text-center text-white">
            <div><span className="text-3xl">▶</span><h3 className="mt-4 font-extrabold"><LessonTitle number={index} subject={course.subject}/></h3>
              <p className="mt-2 text-xs leading-7 text-[#d7d1f0]">ویدئوی واقعی به این صفحه وصل نیست؛ عنوان و درس نمونه‌اند.</p></div>
          </div>
          <h3 className="text-lg font-extrabold">خلاصهٔ جلسه</h3>
          <p className="text-sm leading-8 text-dena-muted">در این جلسه نمونه، ابتدا مفهوم اصلی درس معرفی می‌شود، سپس با مثال و تمرین مرور می‌کنی. برای دریافت محتوای کامل، دوره باید از سامانهٔ آموزشی دارای مجوز منتشر شود.</p>
          <button type="button" disabled={busy || done} className={primary} onClick={() => void act({type:"completeLesson",lesson:key})}>
            {done?"جلسه در پیشرفت نمونه ثبت شده":"علامت‌گذاری جلسه به‌عنوان تکمیل‌شده"}
          </button>
        </div>
        <div className={card + " space-y-3"}>
          <h3 className="font-extrabold">یادداشت شخصی جلسه</h3>
          <p className="text-xs text-dena-muted">حداکثر ۲۰۰ نویسه؛ فقط در وضعیت امضاشدهٔ آزمایشی نگهداری می‌شود.</p>
          <textarea className={input} rows={3} maxLength={200} value={draftNote} onChange={e=>setDraftNote(e.target.value)} placeholder={state.notes[key] || "نکته‌ای برای مرور بنویس…"} />
          {state.notes[key] && <p className="text-xs leading-7 text-dena-muted">یادداشت پیشین: {state.notes[key]}</p>}
          <button type="button" disabled={busy || !draftNote.trim()} className={primary} onClick={()=>void act({type:"saveNote",lesson:key,text:draftNote})}>ذخیره یادداشت</button>
        </div>
        <div className="flex flex-wrap gap-2">
          {index>1 && <Go outline href={"learn/"+course.id+"/"+(index-1)}>جلسه قبل</Go>}
          {index<course.lessonCount && <Go href={"learn/"+course.id+"/"+(index+1)}>جلسه بعد</Go>}
          <Go outline href="assessments">تمرین‌ها</Go>
        </div>
      </div>;
    }
  } else if (section === "assessments" && parts.length === 1) {
    content = <div className="space-y-5">
      <Heading eyebrow="ارزیابی یادگیری" title="تمرین‌ها و آزمون‌ها" description="تمرین‌ها در بک‌اند آزمایشی بررسی می‌شوند و کارنامه رسمی نمی‌سازند."/>
      {assessments.map(item=><div key={item.id} className={card + " flex flex-wrap items-center justify-between gap-4"}>
        <div><h3 className="font-extrabold">{item.title}</h3><p className="mt-2 text-xs text-dena-muted">نمونه · {state.attempts[item.id] ? "حل‌شده" : "آماده انجام"}</p></div>
        <Go href={"assessment/"+item.id}>جزئیات و شروع</Go>
      </div>)}
    </div>;
  } else if ((section === "assessment" || section === "attempt") && parts.length === 2) {
    const item = assessments.find(x=>x.id===parts[1]);
    const submitted = item ? state.attempts[item.id] : undefined;
    content = !item ? <Empty title="تمرین پیدا نشد" description="از فهرست تمرین‌ها انتخاب کن." href="assessments" cta="بازگشت"/> :
    section === "assessment" ? <div className="space-y-5">
      <Link href={base+"/assessments"} className="text-sm font-bold text-dena-brand">بازگشت به تمرین‌ها</Link>
      <Heading eyebrow="تمرین آموزشی نمونه" title={item.title} description="یک پرسش چهارگزینه‌ای برای آشنایی با روند آزمون دنا"/>
      <div className={card + " space-y-4"}>
        <p className="text-sm leading-7">زمان پیشنهادی: بدون محدودیت · امتیاز: صرفاً آزمایشی</p>
        <Notice>این آزمون رسمی نیست. پاسخ فقط در فضای نمونه ذخیره می‌شود.</Notice>
        <Go href={"attempt/"+item.id}>شروع تمرین</Go>
        {submitted && <Go outline href={"results/"+item.id}>مشاهده نتیجه قبلی</Go>}
      </div>
    </div> : <div className="space-y-5">
      <Link href={base+"/assessment/"+item.id} className="text-sm font-bold text-dena-brand">جزئیات تمرین</Link>
      <Heading eyebrow="سؤال ۱ از ۱" title={item.title}/>
      <div className={card + " space-y-5"}>
        <p className="text-base font-bold leading-8">{item.question}</p>
        <fieldset className="space-y-2" disabled={busy || !!quizResult}>
          <legend className="sr-only">پاسخ تمرین</legend>
          {item.choices.map((option,i)=><label key={i} className="flex min-h-12 cursor-pointer gap-3 rounded-xl border border-dena-border px-4 py-3 text-sm has-[:checked]:border-dena-brand has-[:checked]:bg-dena-lavender">
            <input name="student-demo-answer" type="radio" checked={choice===i} onChange={()=>setChoice(i)}/><span>{option}</span>
          </label>)}
        </fieldset>
        {reviewMode && choice!==null && !quizResult && <Notice>گزینه {fa(choice+1)} را انتخاب کردی. پاسخ را برای بررسی آزمایشی ارسال می‌کنی؟</Notice>}
        {quizResult && <div role="status" className="space-y-2 rounded-xl bg-dena-lavender p-4 text-sm leading-7">
          <strong>{quizResult.correct?"پاسخ درست است":"این پاسخ صحیح نیست"}</strong><p>{quizResult.explanation}</p>
          <span className="text-xs text-dena-muted">این نتیجه رسمی نیست.</span>
        </div>}
        {!quizResult ? <div className="flex flex-wrap gap-2">
          {reviewMode ? <button className={primary} disabled={busy || choice===null} onClick={()=>void act({type:"attempt",assessmentId:item.id,choice:choice!})}>ارسال پاسخ و دیدن نتیجه</button> :
            <button className={primary} disabled={busy || choice===null} onClick={()=>setReviewMode(true)}>مرور و ثبت پاسخ</button>}
          <button className={secondary} onClick={()=>setReviewMode(false)}>اصلاح پاسخ</button>
        </div> : <Go href={"results/"+item.id}>کارنامه آزمایشی</Go>}
      </div>
    </div>;
  } else if (section === "results" && parts.length === 2) {
    const item=assessments.find(x=>x.id===parts[1]);
    const attempt=item && state.attempts[item.id];
    content = <div className="space-y-5">
      <Heading eyebrow="نتایج تمرین" title="کارنامهٔ آزمایشی" description="این صفحه جایگزین نتیجه رسمی آزمون نیست."/>
      {item && attempt ? <div className={card + " space-y-4"}>
        <h3 className="font-extrabold">{item.title}</h3><strong className="text-2xl text-dena-brand">{attempt.correct?"پاسخ درست":"نیاز به مرور"}</strong>
        <p className="text-sm text-dena-muted">پاسخ تو: {item.choices[attempt.choice]}</p>
        <Go href={"attempt/"+item.id}>تمرین دوباره</Go>
      </div> : <Empty title="نتیجه‌ای وجود ندارد" description="ابتدا تمرین نمونه را حل کن." href="assessments" cta="تمرین‌ها"/>}
    </div>;
  } else if (section === "growth") {
    const answered=Object.keys(state.attempts).length;
    content=<div className="space-y-5">
      <Heading eyebrow="رشد آموزشی" title="مسیر رشد" description="نمایشی از پیشرفت ثبت‌شده در نسخهٔ نمونه. این اعداد معیار رسمی موفقیت نیستند."/>
      <div className="grid grid-cols-2 gap-3"><div className={card}><p className="text-xs text-dena-muted">جلسات تکمیل‌شده</p><strong className="mt-2 block text-2xl text-dena-brand">{fa(completedAll)}</strong></div>
        <div className={card}><p className="text-xs text-dena-muted">تمرین‌های پاسخ‌داده‌شده</p><strong className="mt-2 block text-2xl text-dena-brand">{fa(answered)}</strong></div></div>
      <div className={card + " space-y-5"}>
        <h3 className="font-extrabold">پیشرفت در دوره‌ها</h3>
        {courses.map(course=><div key={course.id}><p className="mb-2 text-sm">{course.title}</p>
          <Progress label={course.title} completed={lessonsDone(course)} total={course.lessonCount}/></div>)}
      </div>
      <div className={card + " space-y-4"}><h3 className="font-extrabold">روند چهار هفتهٔ نمونه</h3>
        <div className="flex h-40 items-end gap-3" role="img" aria-label="نمودار رشد نمونه چهار هفته">
          {data.growth.map(point=><div key={point.label} className="flex min-w-0 flex-1 flex-col items-center gap-2">
            <div className="w-full max-w-14 rounded-t-lg bg-dena-brand" style={{height:Math.round(point.completed*10)+"px"}}/>
            <span className="text-center text-[10px] text-dena-muted">{point.label}</span></div>)}
        </div></div>
      <Go href="courses">ادامه یادگیری</Go>
    </div>;
  } else if (section === "elite-club") {
    const elite = state.elite.status;
    const q = data.evaluationQuestions;
    if (parts[1] === "evaluation" && parts[2] === "result") {
      content = <div className="space-y-5"><Heading eyebrow="باشگاه نخبگان" title="نتیجه ارزیابی"/>
        <Empty title={elite==="pending"?"در انتظار بررسی":"نتیجه‌ای ثبت نشده است"}
          description="این نمونه هیچ ارزیابی واقعی، تعیین سطح یا عضویتی انجام نمی‌دهد. نتیجه نهایی فقط پس از بررسی مجاز انسانی امکان‌پذیر است."
          href="elite-club" cta="بازگشت به باشگاه"/></div>;
    } else if (parts[1] === "evaluation" && (parts[2] === "review" || reviewMode)) {
      content=<div className="space-y-5">
        <Heading eyebrow="باشگاه نخبگان" title="مرور پاسخ‌های ارزیابی" description="پاسخ‌های تو صرفاً برای تجربهٔ نمونه ثبت شده‌اند."/>
        <div className={card + " space-y-4"}>{q.map(item=><div key={item.id} className="border-b border-dena-border pb-3">
          <p className="text-sm font-bold">{item.question}</p><p className="mt-2 text-xs text-dena-muted">{item.choices[state.elite.answers[item.id]]??"بدون پاسخ"}</p>
        </div>)}</div>
        <button disabled={busy || elite!=="in_progress"} className={primary} onClick={()=>void act({type:"submitEvaluation"})}>ارسال ارزیابی نمونه</button>
        <Go outline href="elite-club/evaluation">ویرایش پاسخ‌ها</Go>
        {elite==="pending" && <Go href="elite-club/evaluation/result">وضعیت بررسی</Go>}
      </div>;
    } else if (parts[1] === "evaluation") {
      const question=q[evaluationIndex];
      content=<div className="space-y-5">
        <Heading eyebrow="فرایند ارزیابی باشگاه" title={"پرسش "+fa(evaluationIndex+1)+" از "+fa(q.length)} description="ارزیابی نمونه و بدون تصمیم خودکار درباره عضویت"/>
        {elite==="registered" ? <button className={primary} disabled={busy} onClick={()=>void act({type:"startEvaluation"})}>آغاز ارزیابی</button> :
        elite==="in_progress" && question ? <div className={card + " space-y-5"}>
          <Progress label="تکمیل پرسش‌نامه" completed={Object.keys(state.elite.answers).length} total={q.length}/>
          <h3 className="text-base font-extrabold leading-8">{question.question}</h3>
          <fieldset className="space-y-2"><legend className="sr-only">گزینه انتخابی</legend>
            {question.choices.map((option,i)=><label key={i} className="flex min-h-12 cursor-pointer gap-3 rounded-xl border border-dena-border p-3 text-sm has-[:checked]:bg-dena-lavender">
              <input type="radio" name={"evaluation-"+question.id} checked={state.elite.answers[question.id]===i}
                onChange={()=>void act({type:"answerEvaluation",questionId:question.id,choice:i})}/>{option}</label>)}
          </fieldset>
          <div className="flex flex-wrap gap-2">
            {evaluationIndex>0 && <button className={secondary} onClick={()=>setEvaluationIndex(i=>i-1)}>سؤال قبل</button>}
            {evaluationIndex<q.length-1 && <button className={primary} onClick={()=>setEvaluationIndex(i=>i+1)}>سؤال بعد</button>}
            <Go href="elite-club/evaluation/review">مرور پاسخ‌ها</Go>
          </div>
        </div> : <Empty title="ارزیابی فعال نیست" description="از صفحه باشگاه فرایند را آغاز کن." href="elite-club" cta="باشگاه نخبگان"/>}
      </div>;
    } else {
      if (parts[1] === "register") {
        content=<div className="space-y-5">
          <Heading eyebrow="باشگاه نخبگان" title="ثبت‌نام آزمایشی" description="شروع مسیر بررسی و ارزیابی نمونه؛ هیچ عضویت واقعی اعطا نمی‌شود."/>
          <div className={card + " space-y-4"}>
            <p className="text-sm leading-8">نام نمایشی: {state.name} · پایه: {state.grade}</p>
            <label className="flex items-start gap-3 text-sm leading-7"><input type="checkbox" className="mt-2" checked={clubAgreement} onChange={e=>setClubAgreement(e.target.checked)}/>
              <span>می‌دانم این یک فرایند آزمایشی است و ثبت‌نام به معنی پذیرش، عضویت یا استفاده واقعی از خدمات نیست.</span>
            </label>
            <button type="button" disabled={busy || !clubAgreement || elite!=="not_registered"} className={primary}
              onClick={()=>void act({type:"applyElite"})}>تأیید و ثبت درخواست نمونه</button>
            {elite==="registered" && <Go href="elite-club/evaluation">آغاز ارزیابی</Go>}
          </div>
        </div>;
      } else content=<div className="space-y-5">
        <Heading eyebrow="فرصت‌های یادگیری بیشتر" title="باشگاه نخبگان" description="پشتیبانی آموزشی، رفاهی و مسیرهای کسب‌وکار برای اعضای واجد شرایط در نسخه عملیاتی."/>
        <Notice>ارزیابی این نسخه صرفاً تجربهٔ آزمایشی است؛ هیچ وضعیت عضویت یا استحقاق واقعی ایجاد نمی‌کند.</Notice>
        <div className={card + " space-y-4"}>
          <h3 className="text-lg font-extrabold">وضعیت باشگاه</h3>
          <p className="text-sm text-dena-muted">{({not_registered:"هنوز ثبت‌نام نکرده‌ای",registered:"ثبت‌نام آزمایشی انجام شده",in_progress:"ارزیابی آزمایشی در حال انجام",pending:"در انتظار بررسی آزمایشی"} as const)[elite]}</p>
          {elite==="not_registered" && <Go href="elite-club/register">ثبت‌نام آزمایشی در باشگاه</Go>}
          {elite==="registered" && <Go href="elite-club/evaluation">آغاز ارزیابی</Go>}
          {elite==="in_progress" && <Go href="elite-club/evaluation">ادامه ارزیابی</Go>}
          {elite==="pending" && <Go href="elite-club/evaluation/result">مشاهده وضعیت</Go>}
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {[["📘","پشتیبانی آموزشی","services/educational"],["♡","پشتیبانی رفاهی","services/welfare"],["◈","مسیر کسب‌وکار","services/business"]].map(([icon,title,href])=>
            <div key={href} className={card+" space-y-3"}><div className="text-3xl" aria-hidden="true">{icon}</div>
              <h3 className="font-extrabold">{title}</h3><Go outline href={href}>مشاهده</Go></div>)}
        </div>
      </div>;
    }
  } else if (section === "services") {
    const services = [
      { kind:"educational" as ServiceKind, title:"پشتیبانی آموزشی", desc:"راهنمایی برای ادامه مسیر یادگیری، رفع اشکال و برنامه آموزشی" },
      { kind:"welfare" as ServiceKind, title:"پشتیبانی رفاهی", desc:"آشنایی با خدمات رفاهی تعریف‌شده برای افراد واجد شرایط" },
      { kind:"business" as ServiceKind, title:"پشتیبانی کسب‌وکار", desc:"آشنایی با مسیر مهارت، کارآفرینی و حمایت تخصصی" },
    ];
    const item = services.find(x=>x.kind===parts[1]);
    content = item ? <div className="space-y-5">
      <Go outline href="services">همه خدمات</Go>
      <Heading eyebrow="مرکز خدمات دانش‌آموز" title={item.title} description={item.desc}/>
      <div className={card + " space-y-4"}>
        <h3 className="font-extrabold">وضعیت درخواست</h3>
        <p className="text-sm text-dena-muted">{state.services[item.kind]?"درخواست آزمایشی ثبت شده و در انتظار بررسی نمونه است.":"درخواستی ثبت نشده است."}</p>
        <Notice>این فرایند آزمایشی است و به معنی تأیید صلاحیت، ارائه خدمت، رزرو زمان، پرداخت یا تعهد مالی نیست.</Notice>
        <button disabled={busy || !!state.services[item.kind]} className={primary} onClick={()=>void act({type:"requestService",kind:item.kind})}>
          {state.services[item.kind]?"درخواست نمونه ثبت شده":"ثبت درخواست آزمایشی"}
        </button>
      </div>
    </div> : <div className="space-y-5">
      <Heading eyebrow="خدمات دنا" title="مرکز خدمات" description="سه مسیر آموزشی، رفاهی و کسب‌وکار؛ اطلاعات و درخواست‌ها آزمایشی هستند."/>
      <div className="grid gap-4 md:grid-cols-3">{services.map(x=><div key={x.kind} className={card + " flex flex-col gap-4"}>
        <h3 className="text-lg font-extrabold">{x.title}</h3><p className="flex-1 text-sm leading-7 text-dena-muted">{x.desc}</p>
        <p className="text-xs text-dena-brand">{state.services[x.kind]?"درخواست نمونه ثبت شده":"آماده بررسی شرایط"}</p>
        <Go href={"services/"+x.kind}>جزئیات و درخواست</Go>
      </div>)}</div>
    </div>;
  } else if (section === "profile") {
    if (parts[1] === "edit") content=<div className="space-y-5">
      <Heading eyebrow="حساب آزمایشی" title="ویرایش پروفایل" description="فقط مشخصات نمونه تغییر می‌کنند؛ اطلاعات حساب واقعی بدون تغییر می‌مانند."/>
      <form className={card + " space-y-4"} onSubmit={e=>{e.preventDefault();void act({type:"updateProfile",name:draftName,grade:draftGrade});}}>
        <label className="block text-sm font-semibold">نام نمایشی<input className={input} value={draftName} onChange={e=>setDraftName(e.target.value)} maxLength={40}/></label>
        <label className="block text-sm font-semibold">پایه و رشته<select className={input} value={draftGrade} onChange={e=>setDraftGrade(e.target.value)}>
          {["دهم تجربی","دهم ریاضی","یازدهم تجربی","یازدهم ریاضی","دوازدهم تجربی","دوازدهم ریاضی"].map(x=><option key={x}>{x}</option>)}</select></label>
        <div className="flex flex-wrap gap-2"><button disabled={busy} className={primary}>ذخیره تغییرات</button><Go outline href="profile">بازگشت</Go></div>
      </form>
    </div>;
    else content=<div className="space-y-5">
      <Heading eyebrow="حساب من" title="پروفایل کاربری"/>
      <div className={card + " space-y-4 text-center"}>
        <div className="mx-auto grid size-20 place-items-center rounded-full bg-dena-lavender text-2xl font-extrabold text-dena-brand">دن</div>
        <h3 className="text-xl font-extrabold">{state.name}</h3><p className="text-sm text-dena-muted">پایه {state.grade}</p>
        <Go href="profile/edit">ویرایش پروفایل</Go>
      </div>
      <div className={card + " space-y-3"}>
        <Go outline href="notifications">اعلان‌ها</Go><Go outline href="privacy">حریم خصوصی و داده‌ها</Go>
        <Go outline href="support">پشتیبانی آنلاین</Go>
      </div>
      <Notice>تغییر شماره تلفن بدون سرویس OTP ممکن نیست؛ در نسخه آزمایشی اطلاعات تماس واقعی دریافت نمی‌کنیم.</Notice>
    </div>;
  } else if (section === "notifications") {
    content=<div className="space-y-5">
      <Heading eyebrow="اعلان‌های برنامه" title="اعلان‌ها" description="فقط رویدادهای نمونه داخل همین اپ نمایش داده می‌شوند؛ پیامک یا اعلان بیرونی ارسال نمی‌شود."/>
      {notifications.map(item=><div key={item.id} className={card + " flex flex-wrap items-center justify-between gap-3"}>
        <div><h3 className="font-extrabold">{item.title}</h3><p className="mt-1 text-xs leading-7 text-dena-muted">{item.body}</p></div>
        <button disabled={busy || state.readNotifications.includes(item.id)} className={secondary} onClick={()=>void act({type:"markNotificationRead",id:item.id})}>
          {state.readNotifications.includes(item.id)?"خوانده‌شده":"علامت‌گذاری خوانده‌شده"}
        </button>
      </div>)}
    </div>;
  } else if (section === "support") {
    if (parts[1]==="new") content=<div className="space-y-5">
      <Heading eyebrow="پشتیبانی" title="درخواست جدید" description="درخواست فقط در فضای آزمایشی نگهداری می‌شود."/>
      <form className={card + " space-y-4"} onSubmit={e=>{e.preventDefault();void act({type:"createTicket",subject,message});}}>
        <label className="block text-sm font-semibold">موضوع<input className={input} minLength={3} maxLength={70} required value={subject} onChange={e=>setSubject(e.target.value)} placeholder="برای مثال، مشکل مشاهده درس"/></label>
        <label className="block text-sm font-semibold">شرح درخواست<textarea className={input} minLength={10} maxLength={250} rows={5} required value={message} onChange={e=>setMessage(e.target.value)} placeholder="مشکل را برای نسخه آزمایشی شرح بده…"/></label>
        <button disabled={busy || state.tickets.length>=3} className={primary}>ثبت درخواست نمونه</button>
        {state.tickets.length>=3 && <Notice>حداکثر سه درخواست نمونه ثبت شده است.</Notice>}
        <Go outline href="support">بازگشت</Go>
      </form>
    </div>;
    else if (parts[1] && /^\d+$/u.test(parts[1])) {
      const ticket=state.tickets.find(x=>x.id===Number(parts[1]));
      content=ticket ? <div className="space-y-5"><Go outline href="support">بازگشت به درخواست‌ها</Go>
        <Heading eyebrow={"درخواست شماره "+fa(ticket.id)} title={ticket.subject}/>
        <div className={card + " space-y-3"}><p className="text-sm leading-8">{ticket.message}</p><p className="text-xs text-dena-muted">وضعیت: تازه ثبت‌شده (آزمایشی)</p></div>
        {ticket.reply && <div className={card}><p className="text-sm">{ticket.reply}</p><p className="mt-2 text-xs text-dena-muted">پیام تکمیلی خودت</p></div>}
        <form className={card + " space-y-3"} onSubmit={e=>{e.preventDefault();void act({type:"replyTicket",id:ticket.id,reply});}}>
          <label className="block text-sm font-bold">افزودن پیام<textarea rows={3} className={input} minLength={2} maxLength={200} value={reply} onChange={e=>setReply(e.target.value)} required/></label>
          <button className={primary} disabled={busy}>ثبت پیام آزمایشی</button>
        </form></div> : <Empty title="درخواست یافت نشد" description="شناسه درخواست معتبر نیست." href="support" cta="درخواست‌ها"/>;
    } else content=<div className="space-y-5">
      <Heading eyebrow="مرکز ارتباط" title="پشتیبانی آنلاین" description="نمونهٔ صندوق پیام با نگهداری موقت وضعیت در مرورگر؛ ارسال واقعی انجام نمی‌شود."/>
      <Go href="support/new">ایجاد درخواست تازه</Go>
      {state.tickets.length ? <div className="space-y-3">{state.tickets.map(t=><Link key={t.id} href={base+"/support/"+t.id} className={card+" block hover:border-dena-brand"}>
        <h3 className="font-extrabold">{t.subject}</h3><p className="mt-2 text-xs text-dena-muted">درخواست شماره {fa(t.id)} · تازه ثبت‌شده</p></Link>)}</div> :
      <Empty title="درخواستی وجود ندارد" description="برای آزمودن فرم پشتیبانی یک درخواست نمونه ثبت کن." href="support/new" cta="درخواست جدید"/>}
    </div>;
  } else if (section === "team" && parts.length >= 2) {
    const course=courses.find(x=>x.id===parts[1]);
    const recipient=parts[2];
    const contacts=[
      {id:"supporter",name:"پشتیبان آموزشی (نمونه)",description:"مرور مسیر یادگیری، جلسه‌ها و پرسش‌های دوره"},
      {id:"counselor",name:"مشاور تحصیلی (نمونه)",description:"راهنمایی برای برنامه‌ریزی و پیگیری مسیر مطالعه"},
    ];
    content=!course?<Empty title="دوره یافت نشد" description="از دوره‌های من آغاز کن." href="courses" cta="دوره‌ها"/>:
    recipient && (recipient==="supporter"||recipient==="counselor")?<div className="space-y-5">
      <Go outline href={"team/"+course.id}>بازگشت به تیم دوره</Go>
      <Heading eyebrow={course.title} title={contacts.find(x=>x.id===recipient)?.name??"ارتباط با تیم"} description="نمونهٔ گفت‌وگوی آموزشی؛ پیام برای شخص واقعی ارسال نمی‌شود."/>
      <div className={card+" space-y-3"}>
        <h3 className="font-extrabold">آخرین پیام نمونه</h3>
        {state.conversations[recipient] ? <p className="text-sm leading-8">{state.conversations[recipient]}</p> :
          <p className="text-sm text-dena-muted">هنوز پیامی ثبت نشده است.</p>}
        <p className="text-xs text-dena-muted">پاسخ مربی یا مشاور واقعی در این حالت ارائه نمی‌شود.</p>
      </div>
      <form className={card+" space-y-3"} onSubmit={e=>{e.preventDefault();void act({type:"sendCourseMessage",recipient,message:teamMessage});}}>
        <label className="block text-sm font-bold">پیام آموزشی<textarea className={input} rows={3} minLength={10} maxLength={180} required
          value={teamMessage} onChange={e=>setTeamMessage(e.target.value)}/></label>
        <button className={primary} disabled={busy}>ثبت پیام نمونه</button>
      </form>
    </div>:<div className="space-y-5">
      <Go outline href={"course/"+course.id}>بازگشت به دوره</Go>
      <Heading eyebrow={course.title} title="تیم دوره و پشتیبانی آموزشی" description="هویت و نقش‌های این صفحه فقط نمونهٔ طراحی هستند."/>
      <div className="grid gap-4 md:grid-cols-2">{contacts.map(contact=><div key={contact.id} className={card+" space-y-4"}>
        <h3 className="font-extrabold">{contact.name}</h3><p className="text-sm leading-7 text-dena-muted">{contact.description}</p>
        <Go href={"team/"+course.id+"/"+contact.id}>گفت‌وگو</Go>
      </div>)}</div>
      <Go href="problem-solving">درخواست جلسه رفع اشکال</Go>
    </div>;
  } else if (section === "problem-solving") {
    content=<div className="space-y-5">
      <Heading eyebrow="پشتیبانی آموزشی" title="جلسه رفع اشکال" description="فرایند درخواست نمونه برای آشنایی با گردش‌کار؛ بدون تماس یا رزرو زمان واقعی."/>
      <div className={card+" space-y-4"}>
        <h3 className="font-extrabold">وضعیت درخواست نمونه</h3>
        <p className="text-sm text-dena-muted">{state.problemSessionRequested?"درخواست ثبت شده و در انتظار بررسی نمونه است.":"هنوز درخواستی ثبت نشده است."}</p>
        <Notice>ساعت، ارائه‌دهنده، تأیید سرپرست و تماس واقعی در این محیط ایجاد نمی‌شوند.</Notice>
        <button className={primary} disabled={busy || state.problemSessionRequested} onClick={()=>void act({type:"requestProblemSession"})}>
          {state.problemSessionRequested?"درخواست ثبت شده":"ثبت درخواست جلسهٔ نمونه"}
        </button>
      </div>
    </div>;
  } else if (section === "privacy") {
    content=<div className="space-y-5">
      <Heading eyebrow="حریم خصوصی" title="اطلاعات و تنظیمات داده‌ها" description="تفکیک دادهٔ ساختگی از رکوردهای عملیاتی"/>
      <div className={card+" space-y-4"}><h3 className="font-extrabold">وضعیت ذخیره‌سازی</h3>
        <p className="text-sm leading-8 text-dena-muted">پیشرفت درس، یادداشت‌ها و درخواست‌های نمونه در یک کوکی امضاشده و محدود نگهداری می‌شوند؛ این داده‌ها رکورد رسمی در PostgreSQL نیستند، به کاربران دیگر متصل نمی‌شوند و پس از یک هفته منقضی خواهند شد.</p>
        <button className={secondary} onClick={()=>setShowReset(v=>!v)}>بازنشانی همه داده‌های نمونه</button>
        {showReset && <div className="rounded-xl border border-red-200 bg-red-50 p-4"><p className="mb-3 text-sm text-red-900">تمام وضعیت‌های آزمایشی پاک می‌شوند. مطمئنی؟</p>
          <div className="flex gap-2"><button disabled={busy} className={primary} onClick={()=>{void act({type:"reset"});setShowReset(false);}}>تأیید بازنشانی</button>
            <button className={secondary} onClick={()=>setShowReset(false)}>انصراف</button></div></div>}
      </div>
      <Notice>هیچ شماره تلفن، OTP، رمز عبور، تراکنش یا نمره رسمی در این نسخه ثبت نمی‌شود.</Notice>
    </div>;
  } else if (section === "ai-tutor") {
    content=<div className="space-y-5">
      <Heading eyebrow="یادگیری شخصی" title="معلم هوشمند" description="نمای طراحی از معلم هوشمند دنا"/>
      <div className={card + " space-y-4"}>
        <span className="rounded-full bg-dena-lavender px-3 py-2 text-xs font-bold text-dena-brand">آماده‌سازی و ارزیابی</span>
        <h3 className="text-lg font-extrabold">با محتوای آموزشی دنا شروع می‌شود</h3>
        <p className="text-sm leading-8 text-dena-muted">مدل تولید پاسخ واقعی در این نسخه آزمایشی فعال نیست. به جای وانمودکردن به پاسخ هوش مصنوعی، می‌توانی از تمرین‌های مشخص با بررسی سمت سرور استفاده کنی.</p>
        <Go href="assessments">تمرین با بازخورد آزمایشی</Go>
      </div>
    </div>;
  } else {
    content=<Empty title="صفحه پیدا نشد" description="به خانهٔ اپ دانش‌آموز برگرد." href="home" cta="خانه"/>;
  }
  return <div className="space-y-5">
    {feedback && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-7 text-emerald-800">{feedback}</div>}
    {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">{error}<button className="mr-2 underline" onClick={()=>setError("")}>بستن</button></div>}
    {content}
    <div className="border-t border-dena-border pt-5 text-xs leading-7 text-dena-muted">
      نسخهٔ آزمایشی دنا · دادهٔ ساختگی و وضعیت ذخیره‌شده در کوکی امضاشده · بدون نمره، عضویت، ارسال پیام یا پرداخت واقعی
    </div>
  </div>;
}
