import { and, eq, gte, inArray, sql } from "drizzle-orm";
import { getDb } from "../../db";
import { organizationStudents, user } from "../../db/schema";

export type OrganizationPanelScope = { id: string; name: string };
export type OrganizationPanelSnapshot = {
  generatedAt: string;
  totals: { students: number; phoneVerified: number; activationPending: number };
  organizations: Array<{
    id: string; name: string; students: number;
    phoneVerified: number; activationPending: number;
  }>;
  months: Array<{ month: string; registrations: number }>;
};

function tehranYearMonth(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tehran", year: "numeric", month: "2-digit",
  }).formatToParts(date);
  return {
    year: Number(parts.find((part) => part.type === "year")?.value),
    month: Number(parts.find((part) => part.type === "month")?.value),
  };
}

/** Aggregate only tenant-owned roster rows; return no student PII. */
export async function getOrganizationPanelSnapshot(
  scopes: OrganizationPanelScope[],
  now = new Date(),
): Promise<OrganizationPanelSnapshot> {
  const ids = scopes.map((scope) => scope.id);
  if (!ids.length) return {
    generatedAt: now.toISOString(),
    totals: { students: 0, phoneVerified: 0, activationPending: 0 },
    organizations: [], months: [],
  };

  const perOrganization = await getDb().select({
    organizationId: organizationStudents.organizationId,
    students: sql<number>`count(*)::int`,
    phoneVerified: sql<number>`count(*) FILTER (WHERE ${user.phoneNumberVerified})::int`,
    activationPending: sql<number>`count(*) FILTER (WHERE NOT ${user.phoneNumberVerified})::int`,
  }).from(organizationStudents)
    .innerJoin(user, eq(user.id, organizationStudents.userId))
    .where(inArray(organizationStudents.organizationId, ids))
    .groupBy(organizationStudents.organizationId);

  const counts = new Map(perOrganization.map((row) => [row.organizationId, row]));
  const organizations = scopes.map((scope) => {
    const row = counts.get(scope.id);
    return {
      id: scope.id, name: scope.name,
      students: Number(row?.students ?? 0),
      phoneVerified: Number(row?.phoneVerified ?? 0),
      activationPending: Number(row?.activationPending ?? 0),
    };
  });
  const totals = organizations.reduce((sum, row) => ({
    students: sum.students + row.students,
    phoneVerified: sum.phoneVerified + row.phoneVerified,
    activationPending: sum.activationPending + row.activationPending,
  }), { students: 0, phoneVerified: 0, activationPending: 0 });

  const { year, month } = tehranYearMonth(now);
  const cutoff = new Date(Date.UTC(year, month - 1 - 5, 1, -3, -30));
  const monthExpression = sql<string>`to_char(
    date_trunc('month', ${organizationStudents.createdAt} AT TIME ZONE 'Asia/Tehran'),
    'YYYY-MM'
  )`;
  const monthRows = await getDb().select({
    month: monthExpression,
    registrations: sql<number>`count(*)::int`,
  }).from(organizationStudents)
    .where(and(
      inArray(organizationStudents.organizationId, ids),
      gte(organizationStudents.createdAt, cutoff),
    ))
    .groupBy(monthExpression)
    .orderBy(monthExpression);
  const monthCounts = new Map(monthRows.map((row) => [row.month, Number(row.registrations)]));
  const months = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(Date.UTC(year, month - 1 - 5 + index, 1));
    const key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
    return { month: key, registrations: monthCounts.get(key) ?? 0 };
  });
  return { generatedAt: now.toISOString(), totals, organizations, months };
}
