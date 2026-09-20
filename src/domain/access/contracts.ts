import { z } from "zod";

/**
 * Domain contracts, NOT a runtime authorization layer.
 * A trusted server session + persisted membership lookup must populate
 * AccessContext. Never parse an untrusted client-supplied context and then
 * consider its contents authenticated.
 */
export const roles = [
  "student",
  "institute",
  "provider",
  "admin",
  "organization",
  "benefactor",
] as const;

export type Role = (typeof roles)[number];

const id = z.uuid();
export const roleSchema = z.enum(roles);

export const membershipSchema = z.discriminatedUnion("role", [
  z.object({ role: z.literal("student") }).strict(),
  z.object({ role: z.literal("institute"), instituteId: id }).strict(),
  z.object({ role: z.literal("provider"), providerId: id }).strict(),
  z.object({
    role: z.literal("admin"),
    canHandleTechnicalSupport: z.boolean(),
  }).strict(),
  z.object({ role: z.literal("organization"), organizationId: id }).strict(),
  z.object({ role: z.literal("benefactor"), benefactorId: id }).strict(),
]);

export const accessContextSchema = z.object({
  userId: id,
  memberships: z.array(membershipSchema),
}).strict();
export type AccessContext = z.infer<typeof accessContextSchema>;

export const providerCourseSchema = z.object({
  id,
  providerId: id,
  responsibleInstituteId: id,
}).strict();
export type ProviderCourse = z.infer<typeof providerCourseSchema>;

export const supervisionGrantSchema = z.object({
  courseId: id,
  providerId: id,
  instituteId: id,
  status: z.enum(["requested", "approved", "revoked"]),
  approvedByInstituteUserId: id.nullable(),
  approvedAt: z.iso.datetime({ offset: true }).nullable(),
}).strict().superRefine((grant, ctx) => {
  if (grant.status === "approved" &&
      (!grant.approvedByInstituteUserId || !grant.approvedAt)) {
    ctx.addIssue({
      code: "custom",
      message: "Approved course supervision requires institute approver and timestamp",
    });
  }
});
export type SupervisionGrant = z.infer<typeof supervisionGrantSchema>;

export const organizationAggregateSchema = z.object({
  organizationId: id,
  kind: z.literal("aggregate"),
  privacyApproved: z.boolean(),
}).strict();
export type OrganizationAggregate = z.infer<typeof organizationAggregateSchema>;

export const benefactorReceiptOwnershipSchema = z.object({
  paymentId: id,
  benefactorId: id,
  payerUserId: id,
}).strict();
export type BenefactorReceiptOwnership = z.infer<typeof benefactorReceiptOwnershipSchema>;

export const fundReportSchema = z.object({
  fundId: id,
  kind: z.literal("aggregate"),
  privacyApproved: z.boolean(),
}).strict();
export type FundReport = z.infer<typeof fundReportSchema>;

export const benefactorFundGrantSchema = z.object({
  fundId: id,
  benefactorId: id,
  permission: z.literal("aggregate"),
}).strict();
export type BenefactorFundGrant = z.infer<typeof benefactorFundGrantSchema>;

export const technicalTicketOwnershipSchema = z.object({
  ticketId: id,
  requesterUserId: id,
}).strict();
export type TechnicalTicketOwnership = z.infer<typeof technicalTicketOwnershipSchema>;
