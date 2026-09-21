import type {
  AccessContext,
  BenefactorFundGrant,
  BenefactorReceiptOwnership,
  FundReport,
  OrganizationAggregate,
  ProviderCourse,
  SupervisionGrant,
  TechnicalTicketOwnership,
} from "./contracts";

/**
 * Side-effect-free authorization predicates. Deny by default; roles alone
 * cannot grant tenant/resource access. Only course-supervision checks are
 * currently used by a real route; other policies remain domain contracts.
 */
export function hasApprovedCourseSupervision(
  course: ProviderCourse,
  grant: SupervisionGrant | null | undefined,
): boolean {
  return Boolean(
    grant &&
    grant.status === "approved" &&
    grant.approvedByInstituteUserId &&
    grant.approvedAt &&
    grant.courseId === course.id &&
    grant.providerId === course.providerId &&
    grant.instituteId === course.responsibleInstituteId,
  );
}

export function canManageSupervisedCourse(
  actor: AccessContext,
  course: ProviderCourse,
  grant: SupervisionGrant | null | undefined,
): boolean {
  return hasApprovedCourseSupervision(course, grant) &&
    actor.memberships.some(
      (membership) =>
        membership.role === "provider" &&
        membership.providerId === course.providerId,
    );
}

export function canOverseeProviderCourse(
  actor: AccessContext,
  course: ProviderCourse,
  grant: SupervisionGrant | null | undefined,
): boolean {
  return hasApprovedCourseSupervision(course, grant) &&
    actor.memberships.some(
      (membership) =>
        membership.role === "institute" &&
        membership.instituteId === course.responsibleInstituteId,
    );
}

export function canReadOrganizationAggregate(
  actor: AccessContext,
  report: OrganizationAggregate,
): boolean {
  return report.kind === "aggregate" &&
    report.privacyApproved &&
    actor.memberships.some(
      (membership) =>
        membership.role === "organization" &&
        membership.organizationId === report.organizationId,
    );
}

export function canReadBenefactorReceipt(
  actor: AccessContext,
  receipt: BenefactorReceiptOwnership,
): boolean {
  return receipt.payerUserId === actor.userId &&
    actor.memberships.some(
      (membership) =>
        membership.role === "benefactor" &&
        membership.benefactorId === receipt.benefactorId,
    );
}

export function canReadBenefactorFundReport(
  actor: AccessContext,
  report: FundReport,
  grant: BenefactorFundGrant | null | undefined,
): boolean {
  return Boolean(
    report.kind === "aggregate" &&
    report.privacyApproved &&
    grant &&
    grant.permission === "aggregate" &&
    grant.fundId === report.fundId &&
    actor.memberships.some(
      (membership) =>
        membership.role === "benefactor" &&
        membership.benefactorId === grant.benefactorId,
    ),
  );
}

export function canReadTechnicalTicket(
  actor: AccessContext,
  ticket: TechnicalTicketOwnership,
): boolean {
  return actor.memberships.length > 0 &&
    (ticket.requesterUserId === actor.userId ||
    actor.memberships.some(
      (membership) =>
        membership.role === "admin" && membership.canHandleTechnicalSupport,
    ));
}
