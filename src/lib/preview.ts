import type { Role } from "./navigation";

export const roleLabels: Record<Role, string> = {
  student: "دانش‌آموز",
  institute: "مؤسسه",
  provider: "ارائه‌دهندهٔ تحت نظارت",
  admin: "ادمین",
  organization: "سازمان",
  benefactor: "خیر",
};

export const roleDescriptions: Record<Role, string> = {
  student: "دوره‌های ضبط‌شده، تمرین، آزمون و مسیر یادگیری در یک فضای شخصی.",
  institute: "مدیریت دوره‌ها و پیگیری آموزشی در حوزهٔ مسئولیت مؤسسه.",
  provider: "دوره‌های ارائه‌دهنده با نظارت تأییدشدهٔ مؤسسه برای هر دوره.",
  admin: "رسیدگی به عملیات فنی و مدیریت دسترسی در هستهٔ مشترک دنا.",
  organization: "مدیریت دسترسی سازمان و گزارش‌های صرفاً مجاز و تجمیعی.",
  benefactor: "پیگیری حمایت‌های خود و گزارش تجمیعی مجاز صندوق‌ها.",
};

/** Public, data-free prototype URLs; never an authorization decision or live panel URL. */
export function previewHref(role: Role, href: string): string {
  const prefix = "/" + role;
  if (href !== prefix && !href.startsWith(prefix + "/")) {
    throw new Error("Route does not belong to the selected preview role");
  }
  return "/preview" + href;
}
