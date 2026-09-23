import { roles, type Role } from "../domain/access/contracts";

export { roles };
export type { Role };

/** Approved Figma URL map ONLY: not implemented routes or an authorization policy. */
type RouteReference = {
  readonly href: string;
  readonly title: string;
  readonly figmaNode: string;
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
    { href: "/admin", title: "خانه ادمین", figmaNode: "194:195" },
    { href: "/admin/institutes", title: "بررسی مؤسسات", figmaNode: "196:14" },
    { href: "/admin/users", title: "کاربران و نقش‌ها", figmaNode: "197:28" },
    { href: "/admin/supervision", title: "رابطه‌های نظارتی", figmaNode: "198:42" },
    { href: "/admin/support", title: "صندوق رسیدگی تیم فنی", figmaNode: "199:56" },
    { href: "/admin/finance", title: "عملیات مالی", figmaNode: "200:70" },
  ],
  organization: [
    { href: "/organization", title: "خانه سازمان", figmaNode: "201:84" },
    { href: "/organization/members-courses", title: "اعضا و تخصیص دوره", figmaNode: "203:14" },
    { href: "/organization/usage", title: "گزارش کلی استفاده", figmaNode: "204:28" },
    { href: "/organization/orders", title: "سفارش‌ها و صورتحساب‌ها", figmaNode: "205:40" },
  ],
  benefactor: [
    { href: "/benefactor", title: "خانه خیر", figmaNode: "207:68" },
    { href: "/benefactor/supports", title: "حمایت‌ها و پرداخت‌ها", figmaNode: "208:14" },
    { href: "/benefactor/funds", title: "صندوق‌ها و گزارش", figmaNode: "211:28" },
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
