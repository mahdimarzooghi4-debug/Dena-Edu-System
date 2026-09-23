import { describe, expect, it } from "vitest";
import {
  accessContextSchema,
  benefactorFundGrantSchema,
  benefactorReceiptOwnershipSchema,
  fundReportSchema,
  organizationAggregateSchema,
  providerCourseSchema,
  supervisionGrantSchema,
  technicalTicketOwnershipSchema,
} from "./contracts";
import {
  canManageSupervisedCourse,
  canOverseeProviderCourse,
  canReadBenefactorFundReport,
  canReadBenefactorReceipt,
  canReadOrganizationAggregate,
  canReadTechnicalTicket,
  hasApprovedCourseSupervision,
} from "./policy";

const ids = {
  user: "00000000-0000-4000-8000-000000000001",
  other: "00000000-0000-4000-8000-000000000002",
  provider: "00000000-0000-4000-8000-000000000003",
  otherProvider: "00000000-0000-4000-8000-000000000004",
  institute: "00000000-0000-4000-8000-000000000005",
  otherInstitute: "00000000-0000-4000-8000-000000000006",
  course: "00000000-0000-4000-8000-000000000007",
  otherCourse: "00000000-0000-4000-8000-000000000008",
  org: "00000000-0000-4000-8000-000000000009",
  otherOrg: "00000000-0000-4000-8000-00000000000a",
  fund: "00000000-0000-4000-8000-00000000000b",
  otherFund: "00000000-0000-4000-8000-00000000000c",
  benefactor: "00000000-0000-4000-8000-00000000000d",
  payment: "00000000-0000-4000-8000-00000000000e",
  ticket: "00000000-0000-4000-8000-00000000000f",
} as const;

const actor = (memberships: unknown[], userId: string = ids.user) =>
  accessContextSchema.parse({ userId, memberships });

const course = providerCourseSchema.parse({
  id: ids.course,
  providerId: ids.provider,
  responsibleInstituteId: ids.institute,
});
const grant = supervisionGrantSchema.parse({
  courseId: ids.course,
  providerId: ids.provider,
  instituteId: ids.institute,
  status: "approved",
  approvedByInstituteUserId: ids.other,
  approvedAt: "2026-09-20T12:00:00Z",
});

describe("trusted-server access contracts, not route middleware", () => {
  it("rejects unknown roles and extra assertion fields", () => {
    expect(() => actor([{ role: "superadmin" }])).toThrow();
    expect(() => actor([{ role: "student", instituteId: ids.institute }])).toThrow();
    expect(() => accessContextSchema.parse({ userId: ids.user, memberships: [], isRoot: true })).toThrow();
  });

  it("denies a provider with no approved institute grant", () => {
    const provider = actor([{ role: "provider", providerId: ids.provider }]);
    const requested = supervisionGrantSchema.parse({
      ...grant,
      status: "requested",
      approvedAt: null,
      approvedByInstituteUserId: null,
    });
    expect(canManageSupervisedCourse(provider, course, requested)).toBe(false);
    expect(canManageSupervisedCourse(provider, course, null)).toBe(false);
    expect(canManageSupervisedCourse(provider, course, grant)).toBe(true);
    expect(canManageSupervisedCourse(actor([{ role: "provider", providerId: ids.otherProvider }]), course, grant)).toBe(false);
  });

  it("requires a matching course, institution, provider and approved state", () => {
    expect(hasApprovedCourseSupervision(course, grant)).toBe(true);
    expect(hasApprovedCourseSupervision({ ...course, id: ids.otherCourse }, grant)).toBe(false);
    expect(hasApprovedCourseSupervision({ ...course, providerId: ids.otherProvider }, grant)).toBe(false);
    expect(hasApprovedCourseSupervision({ ...course, responsibleInstituteId: ids.otherInstitute }, grant)).toBe(false);
    expect(hasApprovedCourseSupervision(course, { ...grant, status: "revoked" })).toBe(false);
    expect(() => supervisionGrantSchema.parse({ ...grant, approvedAt: null })).toThrow();
    expect(() => supervisionGrantSchema.parse({ ...grant, approvedByInstituteUserId: null })).toThrow();
  });

  it("limits institution oversight to its own approved course grants", () => {
    expect(canOverseeProviderCourse(actor([{ role: "institute", instituteId: ids.institute }]), course, grant)).toBe(true);
    expect(canOverseeProviderCourse(actor([{ role: "institute", instituteId: ids.otherInstitute }]), course, grant)).toBe(false);
    expect(canOverseeProviderCourse(actor([{ role: "admin", canHandleTechnicalSupport: true }]), course, grant)).toBe(false);
  });

  it("allows only privacy-approved, organization-scoped aggregate reports", () => {
    const orgActor = actor([{ role: "organization", organizationId: ids.org }]);
    const report = organizationAggregateSchema.parse({
      organizationId: ids.org, kind: "aggregate", privacyApproved: true,
    });
    expect(canReadOrganizationAggregate(orgActor, report)).toBe(true);
    expect(canReadOrganizationAggregate(orgActor, { ...report, privacyApproved: false })).toBe(false);
    expect(canReadOrganizationAggregate(orgActor, { ...report, organizationId: ids.otherOrg })).toBe(false);
    expect(() => organizationAggregateSchema.parse({ ...report, studentUserId: ids.other })).toThrow();
    expect(() => organizationAggregateSchema.parse({ ...report, kind: "individual" })).toThrow();
  });

  it("limits benefactor receipts to both own payment and own benefactor profile", () => {
    const benefactor = actor([{ role: "benefactor", benefactorId: ids.benefactor }]);
    const receipt = benefactorReceiptOwnershipSchema.parse({
      paymentId: ids.payment, benefactorId: ids.benefactor, payerUserId: ids.user,
    });
    expect(canReadBenefactorReceipt(benefactor, receipt)).toBe(true);
    expect(canReadBenefactorReceipt(benefactor, { ...receipt, payerUserId: ids.other })).toBe(false);
    expect(canReadBenefactorReceipt(actor([{ role: "student" }]), receipt)).toBe(false);
    expect(() => benefactorReceiptOwnershipSchema.parse({ ...receipt, studentUserId: ids.other })).toThrow();
  });

  it("requires a matching beneficiary-specific fund grant and privacy release", () => {
    const benefactor = actor([{ role: "benefactor", benefactorId: ids.benefactor }]);
    const report = fundReportSchema.parse({ fundId: ids.fund, kind: "aggregate", privacyApproved: true });
    const permission = benefactorFundGrantSchema.parse({
      fundId: ids.fund, benefactorId: ids.benefactor, permission: "aggregate",
    });
    expect(canReadBenefactorFundReport(benefactor, report, permission)).toBe(true);
    expect(canReadBenefactorFundReport(benefactor, report, null)).toBe(false);
    expect(canReadBenefactorFundReport(benefactor, { ...report, privacyApproved: false }, permission)).toBe(false);
    expect(canReadBenefactorFundReport(benefactor, { ...report, fundId: ids.otherFund }, permission)).toBe(false);
    expect(canReadBenefactorFundReport(actor([{ role: "student" }]), report, permission)).toBe(false);
  });

  it("shares technical support while requiring an explicitly authorized operator", () => {
    const ticket = technicalTicketOwnershipSchema.parse({
      ticketId: ids.ticket, requesterUserId: ids.user,
    });
    expect(canReadTechnicalTicket(actor([{ role: "student" }]), ticket)).toBe(true);
    expect(canReadTechnicalTicket(actor([]), ticket)).toBe(false);
    expect(canReadTechnicalTicket(actor([{ role: "student" }], ids.other), ticket)).toBe(false);
    expect(canReadTechnicalTicket(actor([{ role: "admin", canHandleTechnicalSupport: false }], ids.other), ticket)).toBe(false);
    expect(canReadTechnicalTicket(actor([{ role: "admin", canHandleTechnicalSupport: true }], ids.other), ticket)).toBe(true);
  });

  it("denies all resource checks for a principal with no memberships", () => {
    const stranger = actor([]);
    expect(canManageSupervisedCourse(stranger, course, grant)).toBe(false);
    expect(canOverseeProviderCourse(stranger, course, grant)).toBe(false);
    expect(canReadOrganizationAggregate(stranger, { organizationId: ids.org, kind: "aggregate", privacyApproved: true })).toBe(false);
    expect(canReadBenefactorReceipt(stranger, { paymentId: ids.payment, benefactorId: ids.benefactor, payerUserId: ids.user })).toBe(false);
  });
});
