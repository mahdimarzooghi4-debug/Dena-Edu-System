import { sql, type SQL } from "drizzle-orm";
import { getDb } from "../../db";

export const adminDirectories = {
  accounts: { title: "حساب‌ها و عضویت‌ها", group: "حساب‌ها و نقش‌ها", description: "حساب‌ها با نام ماسک‌شده و خلاصهٔ عضویت؛ تأیید نقش از صف مستقل انجام می‌شود." },
  institutes: { title: "مؤسسه‌ها و آموزشگاه‌ها", group: "حساب‌ها و نقش‌ها", description: "فهرست هویت‌های تأییدشده؛ تأیید هویت به معنی مجوز آموزشی نیست." },
  providers: { title: "ارائه‌دهندگان", group: "حساب‌ها و نقش‌ها", description: "هویت ارائه‌دهندگان و وضعیت عضویت نمایندگان آن‌ها." },
  organizations: { title: "سازمان‌ها", group: "حساب‌ها و نقش‌ها", description: "سازمان‌های تأییدشده و عضویت‌های فعال آن‌ها." },
  benefactors: { title: "خیرین و حامیان", group: "حساب‌ها و نقش‌ها", description: "حامیان تأییدشده؛ دسترسی به گزارش آموزشی تابع حمایت ثبت‌شده است." },
  courses: { title: "دوره‌ها", group: "آموزش و محتوا", description: "فهرست دوره‌ها و وضعیت انتشار ثبت‌شده در سامانه." },
  supervision: { title: "نظارت دوره‌ها", group: "آموزش و محتوا", description: "وضعیت نظارت مؤسسهٔ مسئول بر هر دوره؛ تصمیم نظارتی در پنل مؤسسه ثبت می‌شود." },
  practices: { title: "تمرین‌ها", group: "آموزش و محتوا", description: "وضعیت بازبینی تمرین‌های دوره؛ پاسخ‌ها و عملکرد فردی دانش‌آموزان نمایش داده نمی‌شود." },
  "learning-assessments": { title: "ارزیابی‌های یادگیری", group: "آموزش و محتوا", description: "ارزیابی‌های تألیف‌شده و وضعیت بازبینی مؤسسه." },
  "organization-statistics": { title: "آمار ثبت دانش‌آموزان سازمانی", group: "ثبت‌نام و حریم خصوصی", description: "آمار تجمیعی سازمان‌ها بدون نام، کد ملی یا اطلاعات آموزشی فردی." },
  "privacy-events": { title: "رویدادهای ثبت، حذف و API", group: "ثبت‌نام و حریم خصوصی", description: "رویدادهای ثبت‌شدهٔ سازمانی؛ مقادیر کلید و اطلاعات حساس در این فهرست نیستند." },
  reports: { title: "گزارش‌های مدیریتی", group: "گزارش‌ها و امنیت", description: "تعداد واقعی موجودیت‌ها به تفکیک وضعیت؛ آمار از پایگاه داده محاسبه می‌شود." },
} as const;
export type AdminDirectory = keyof typeof adminDirectories;
export type DirectoryRow = { id: string; name: string; status: string; detail: string; created_at: string | Date | null };

function entityQuery(role: "institute" | "provider" | "organization" | "benefactor"): SQL {
  return sql`SELECT e.id::text, e.name,
    CASE WHEN EXISTS (SELECT 1 FROM dena_memberships m WHERE m.status='active' AND
      (m.institute_id=e.id OR m.provider_id=e.id OR m.organization_id=e.id OR m.benefactor_id=e.id)) THEN 'active' ELSE 'inactive' END AS status,
    'هویت تأییدشده'::text AS detail, e.verified_at AS created_at
    FROM dena_verified_entities e WHERE e.role=${role}`;
}
function directoryQuery(section: AdminDirectory): SQL {
  switch (section) {
    case "institutes": return entityQuery("institute");
    case "providers": return entityQuery("provider");
    case "organizations": return entityQuery("organization");
    case "benefactors": return entityQuery("benefactor");
    case "accounts": return sql`SELECT u.id::text, left(u.name,1)||'•••' AS name,
      CASE WHEN EXISTS (SELECT 1 FROM dena_memberships m WHERE m.user_id=u.id AND m.status='active') THEN 'active' ELSE 'inactive' END AS status,
      COALESCE((SELECT string_agg(DISTINCT m.role::text, ', ') FROM dena_memberships m WHERE m.user_id=u.id), 'بدون عضویت') AS detail,
      u."createdAt" AS created_at FROM "user" u`;
    case "courses": return sql`SELECT c.id::text,c.title AS name,c.publication_status::text AS status,
      COALESCE(e.name,'مؤسسهٔ مسئول ثبت نشده') AS detail,c.published_at AS created_at
      FROM dena_courses c LEFT JOIN dena_verified_entities e ON e.id=c.responsible_institute_id`;
    case "supervision": return sql`SELECT s.course_id::text AS id,c.title AS name,s.status::text,
      COALESCE(e.name,'مؤسسهٔ مسئول ثبت نشده') AS detail,s.requested_at AS created_at
      FROM dena_supervision_grants s JOIN dena_courses c ON c.id=s.course_id LEFT JOIN dena_verified_entities e ON e.id=s.institute_id`;
    case "practices": return sql`SELECT p.course_id::text AS id,c.title AS name,p.review_status::text AS status,
      'تمرین دوره'::text AS detail,p.created_at FROM dena_course_practice_questions p JOIN dena_courses c ON c.id=p.course_id`;
    case "learning-assessments": return sql`SELECT a.id::text,a.title AS name,a.review_status::text AS status,
      c.title||' · '||a.question_count::text||' سؤال' AS detail,a.created_at
      FROM dena_course_learning_assessments a JOIN dena_courses c ON c.id=a.course_id`;
    case "organization-statistics": return sql`SELECT e.id::text,e.name,'aggregate'::text AS status,
      count(s.id)::text||' ثبت · '||(count(s.id) FILTER (WHERE s.guardian_consent_confirmed_at IS NOT NULL))::text||' رضایت سرپرست' AS detail,
      max(s.created_at) AS created_at FROM dena_verified_entities e LEFT JOIN dena_organization_students s ON s.organization_id=e.id
      WHERE e.role='organization' GROUP BY e.id`;
    case "privacy-events": return sql`SELECT a.id::text,a.action AS name,a.entity_type::text AS status,
      a.actor_role::text AS detail,a.created_at FROM dena_audit_logs a WHERE a.entity_type::text IN ('ORGANIZATION_STUDENT','ORGANIZATION_API_KEY')`;
    case "reports": return sql`SELECT 'memberships-'||role::text||'-'||status::text AS id,role::text AS name,status::text,
      count(*)::text AS detail,NULL::timestamptz AS created_at FROM dena_memberships GROUP BY role,status
      UNION ALL SELECT 'courses-'||publication_status::text,'دوره‌ها',publication_status::text,count(*)::text,NULL::timestamptz
      FROM dena_courses GROUP BY publication_status`;
  }
}

/** Every entry point rechecks active admin membership before reading a directory.
 * Projections exclude contact data, identity evidence, answers and secret keys. */
export async function getAdminDirectory(userId: string, section: AdminDirectory, input: { query?: string; page?: number } = {}) {
  const db = getDb();
  const admins = await db.execute(sql`SELECT id FROM dena_memberships WHERE user_id=${userId}::uuid AND role='admin' AND status='active' LIMIT 1`);
  if (!admins.length) return null;
  const query = (input.query ?? "").trim().slice(0, 120);
  const source = directoryQuery(section);
  const pattern = `%${query.replace(/[\\%_]/g, "\\$&")}%`;
  const where = query ? sql`(name ILIKE ${pattern} OR id ILIKE ${pattern} OR detail ILIKE ${pattern})` : sql`true`;
  const totals = await db.execute(sql`SELECT count(*)::int AS total FROM (${source}) directory WHERE ${where}`);
  const total = Number(totals[0]?.total ?? 0);
  const pageCount = Math.max(1, Math.ceil(total / 50));
  const page = Math.min(pageCount, Number.isSafeInteger(input.page) && input.page! > 0 ? input.page! : 1);
  const rows = await db.execute(sql`SELECT id,name,status,detail,created_at FROM (${source}) directory WHERE ${where}
    ORDER BY created_at DESC NULLS LAST,id LIMIT 50 OFFSET ${(page - 1) * 50}`);
  return { rows: Array.from(rows) as DirectoryRow[], total, page, pageCount, query };
}
