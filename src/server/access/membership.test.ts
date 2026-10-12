import { describe, expect, it } from "vitest";
import { toAccessContext } from "./membership";

type Row = Parameters<typeof toAccessContext>[1][number];
const ids = {
  user: "00000000-0000-4000-8000-000000000001",
  institute: "00000000-0000-4000-8000-000000000002",
  provider: "00000000-0000-4000-8000-000000000003",
  organization: "00000000-0000-4000-8000-000000000004",
  benefactor: "00000000-0000-4000-8000-000000000005",
} as const;

function row(fields: Partial<Row> = {}): Row {
  return {
    id: ids.institute,
    userId: ids.user,
    role: "student",
    instituteId: null,
    providerId: null,
    organizationId: null,
    benefactorId: null,
    canHandleTechnicalSupport: false,
    status: "active",
    createdAt: new Date("2026-09-21T00:00:00Z"),
    updatedAt: new Date("2026-09-21T00:00:00Z"),
    ...fields,
  };
}

describe("server-side membership projection (DB rows only)", () => {
  it("denies missing, suspended and revoked membership", () => {
    expect(toAccessContext(ids.user, [])).toBeNull();
    expect(toAccessContext(ids.user, [row({ status: "suspended" })])).toBeNull();
    expect(toAccessContext(ids.user, [row({ status: "revoked" })])).toBeNull();
  });

  it("maps all six roles to exact allowed scopes", () => {
    const rows: Row[] = [
      row({ role: "student" }),
      row({ role: "institute", instituteId: ids.institute }),
      row({ role: "provider", providerId: ids.provider }),
      row({ role: "admin", canHandleTechnicalSupport: true }),
      row({ role: "organization", organizationId: ids.organization }),
      row({ role: "benefactor", benefactorId: ids.benefactor }),
    ];
    expect(toAccessContext(ids.user, rows)).toEqual({
      userId: ids.user,
      memberships: [
        { role: "student" },
        { role: "institute", instituteId: ids.institute },
        { role: "provider", providerId: ids.provider },
        { role: "admin", canHandleTechnicalSupport: true },
        { role: "organization", organizationId: ids.organization },
        { role: "benefactor", benefactorId: ids.benefactor },
      ],
    });
  });

  it("fails closed if an active row has an invalid required scope", () => {
    expect(toAccessContext(ids.user, [
      row({ role: "institute", instituteId: null }),
    ])).toBeNull();
    expect(toAccessContext(ids.user, [
      row({ role: "student" }),
      row({ role: "provider", providerId: null }),
    ])).toBeNull();
    expect(toAccessContext("not-a-uuid", [row()])).toBeNull();
  });

  it("does not surface server support flag on student role", () => {
    expect(toAccessContext(ids.user, [
      row({ role: "student", canHandleTechnicalSupport: true }),
    ])?.memberships).toEqual([{ role: "student" }]);
  });
});
