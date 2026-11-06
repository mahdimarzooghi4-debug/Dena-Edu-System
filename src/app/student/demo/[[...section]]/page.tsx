import { notFound } from "next/navigation";
import { StudentShell } from "../../../../components/student/student-shell";
import { DemoWorkspace } from "../../../../components/student/demo-workspace";
import { isStudentDemoEnabled } from "../../../../server/student/demo-app";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata = { title: "اپ دانش‌آموز آزمایشی | دنا", robots: { index: false, follow: false } };

type Active = "home" | "courses" | "assessments" | "growth" | "elite" | "account" | "services" | "notifications" | "aiTutor";
function current(route: string): { title: string; active: Active } {
  const top = route.split("/")[0];
  const nav: Record<string, {title:string;active:Active}> = {
    home:{title:"خانه من",active:"home"}, courses:{title:"دوره‌های من",active:"courses"},
    course:{title:"جزئیات دوره",active:"courses"}, learn:{title:"آموزش ضبط‌شده",active:"courses"},
    assessments:{title:"تمرین‌ها و آزمون‌ها",active:"assessments"},
    assessment:{title:"جزئیات تمرین",active:"assessments"},
    attempt:{title:"پاسخ به تمرین",active:"assessments"}, results:{title:"نتایج آزمون",active:"assessments"},
    growth:{title:"مسیر رشد",active:"growth"}, "elite-club":{title:"باشگاه نخبگان",active:"elite"},
    services:{title:"مرکز خدمات",active:"services"}, profile:{title:"پروفایل کاربری",active:"account"},
    notifications:{title:"اعلان‌ها",active:"notifications"}, support:{title:"پشتیبانی",active:"services"},
    privacy:{title:"حریم خصوصی",active:"account"}, "ai-tutor":{title:"معلم هوشمند",active:"aiTutor"},
  };
  return nav[top] ?? nav.home;
}
export default async function DemoStudentApp({params}: {params:Promise<{section?:string[]}>}) {
  if (!isStudentDemoEnabled()) notFound();
  const {section}=await params;
  const route=(section?.join("/") || "home");
  if (route.length>90 || (section?.length ?? 0)>3 || section?.some(x=>!(/^[a-z0-9-]+$/u.test(x)))) notFound();
  const {title,active}=current(route);
  return <StudentShell demo active={active} title={title}><DemoWorkspace route={route}/></StudentShell>;
}
