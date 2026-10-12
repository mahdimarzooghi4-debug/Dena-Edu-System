import { roles, type Role } from "../domain/access/contracts";

export { roles };
export type { Role };

/** Approved Figma route reference; page existence and authorization are checked separately. */
type RouteReference = {
  readonly href: string;
  readonly title: string;
  readonly figmaNode?: string;
};

export const navigation = {
  student: [
    { href: "/student", title: "خانه من", figmaNode: "153:2" },
    { href: "/student/courses", title: "دوره‌های من", figmaNode: "154:16" },
    { href: "/student/assessments", title: "تمرین‌ها و آزمون‌ها", figmaNode: "155:44" },
    { href: "/student/growth", title: "مسیر رشد", figmaNode: "157:87" },
    { href: "/student/elite-club", title: "باشگاه نخبگان", figmaNode: "159:103" },
    { href: "/student/profile", title: "پروفایل", figmaNode: "160:118" },
  ],
  institute: [
    { href: "/institute", title: "خانه مؤسسه", figmaNode: "164:145" },
    { href: "/institute/courses", title: "دوره‌های مؤسسه", figmaNode: "166:16" },
    { href: "/institute/assessments", title: "تمرین‌ها و آزمون‌ها", figmaNode: "167:44" },
    { href: "/institute/question-bank", title: "بانک سؤال مؤسسه", figmaNode: "415:2236" },
    { href: "/institute/exams", title: "آزمون‌های مؤسسه", figmaNode: "415:2585" },
    { href: "/institute/learning", title: "پیگیری یادگیری", figmaNode: "169:72" },
    { href: "/institute/providers", title: "ارائه‌دهندگان تحت نظارت", figmaNode: "171:100" },
    { href: "/institute/profile", title: "پروفایل مؤسسه", figmaNode: "172:127" },
  ],
  provider: [
    { href: "/provider", title: "خانه ارائه‌دهنده", figmaNode: "173:3" },
    { href: "/provider/courses", title: "دوره‌های من", figmaNode: "173:768" },
    { href: "/provider/assessments", title: "تمرین‌ها و آزمون‌ها", figmaNode: "177:44" },
    { href: "/provider/learning", title: "پیگیری یادگیری", figmaNode: "181:72" },
    { href: "/provider/supervision", title: "مؤسسه ناظر", figmaNode: "182:97" },
    { href: "/provider/profile", title: "پروفایل ارائه‌دهنده", figmaNode: "183:111" },
  ],
  admin: [
    { href: "/admin", title: "خانه ادمین", figmaNode: "544:3" },
    { href: "/admin/role-applications", title: "درخواست‌های نقش", figmaNode: "544:3" },
    { href: "/admin/audit", title: "رویدادهای سیستم", figmaNode: "544:3" },
    { href: "/admin/support", title: "پشتیبانی فنی", figmaNode: "544:3" },
    { href: "/admin/question-bank", title: "بانک سؤال دنا", figmaNode: "551:36901" },
    { href: "/admin/exams", title: "آزمون‌های هماهنگ دنا", figmaNode: undefined },
  ],
  organization: [
    { href: "/organization", title: "داشبورد", figmaNode: "478:2130" },
    { href: "/organization/students", title: "دانش‌آموزان", figmaNode: "478:2271" },
    { href: "/organization/growth", title: "رشد و پیشرفت", figmaNode: "479:3045" },
    { href: "/organization/reports", title: "گزارش‌ها", figmaNode: "479:3189" },
    { href: "/organization/notifications", title: "اعلان‌ها", figmaNode: "482:2428" },
  ],
  benefactor: [
    { href: "/benefactor", title: "داشبورد", figmaNode: "500:2" },
    { href: "/benefactor/students", title: "دانش‌آموزان", figmaNode: "500:2" },
    { href: "/benefactor/growth", title: "رشد و پیشرفت", figmaNode: "500:2" },
    { href: "/benefactor/reports", title: "گزارش‌ها", figmaNode: "500:2" },
    { href: "/benefactor/notifications", title: "اعلان‌ها", figmaNode: "500:2" },
  ],
} as const satisfies Record<Role, readonly RouteReference[]>;

export const sharedTechnicalSupport = {
  href: "/support", title: "پشتیبانی فنی مشترک", figmaNode: "206:54",
} as const satisfies RouteReference;

export const FIGMA_FILE_URL =
  "https://www.figma.com/design/8Bo8BNS5LVQfTJhxwCYQmo/Dena-Ecosystem";

export function figmaUrl(nodeId: string): string {
  return `${FIGMA_FILE_URL}?node-id=${nodeId.replace(":", "-")}`;
}
