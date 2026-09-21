import {
  bigint, boolean, check, foreignKey, index, integer, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { roles } from "../domain/access/contracts";

// Better Auth core tables. Keep aligned with the installed Better Auth 1.7.x
// schema generator before generating an initial Drizzle migration.
export const user = pgTable("user", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("emailVerified").notNull().default(false),
  image: text("image"),
  phoneNumber: text("phoneNumber").unique(),
  phoneNumberVerified: boolean("phoneNumberVerified").notNull().default(false),
  createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).notNull().defaultNow(),
});

export const session = pgTable("session", {
  id: uuid("id").primaryKey().defaultRandom(),
  expiresAt: timestamp("expiresAt", { withTimezone: true }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).notNull().defaultNow(),
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
  userId: uuid("userId").notNull().references(() => user.id, { onDelete: "cascade" }),
}, (table) => [index("session_user_idx").on(table.userId)]);

export const account = pgTable("account", {
  id: uuid("id").primaryKey().defaultRandom(),
  accountId: text("accountId").notNull(),
  providerId: text("providerId").notNull(),
  userId: uuid("userId").notNull().references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  idToken: text("idToken"),
  accessTokenExpiresAt: timestamp("accessTokenExpiresAt", { withTimezone: true }),
  refreshTokenExpiresAt: timestamp("refreshTokenExpiresAt", { withTimezone: true }),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("account_user_idx").on(table.userId),
  uniqueIndex("account_provider_account_uidx").on(table.providerId, table.accountId),
]);

export const verification = pgTable("verification", {
  id: uuid("id").primaryKey().defaultRandom(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expiresAt", { withTimezone: true }).notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("verification_identifier_idx").on(table.identifier)]);

// Shared DB-backed Better Auth limiter; never per-process memory for OTP.
export const rateLimit = pgTable("rateLimit", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: text("key").notNull().unique(),
  count: integer("count").notNull(),
  lastRequest: bigint("lastRequest", { mode: "number" }).notNull(),
});

export const otpDispatchLimits = pgTable("dena_otp_dispatch_limits", {
  phoneHash: text("phone_hash").primaryKey(), // HMAC, never the phone number
  lastSentAt: timestamp("last_sent_at", { withTimezone: true }).notNull(),
  windowStartedAt: timestamp("window_started_at", { withTimezone: true }).notNull(),
  count: integer("count").notNull(),
});

export const denaRole = pgEnum("dena_role", roles);
export const membershipStatus = pgEnum("dena_membership_status", ["active", "suspended", "revoked"]);
export const memberships = pgTable("dena_memberships", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  role: denaRole("role").notNull(),
  instituteId: uuid("institute_id"),
  providerId: uuid("provider_id"),
  organizationId: uuid("organization_id"),
  benefactorId: uuid("benefactor_id"),
  canHandleTechnicalSupport: boolean("can_handle_technical_support").notNull().default(false),
  status: membershipStatus("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("dena_memberships_active_user_idx").on(table.userId, table.status),
  uniqueIndex("dena_one_student_membership_per_user").on(table.userId).where(sql`role = 'student'`),
  // Enforce one and only one scope matching the role; prevent tech support flag
  // from being used by any non-admin role.
  check("dena_membership_role_scope_ck", sql`
    (
      role = 'student'
      AND institute_id IS NULL AND provider_id IS NULL
      AND organization_id IS NULL AND benefactor_id IS NULL
      AND can_handle_technical_support = false
    ) OR (
      role = 'institute' AND institute_id IS NOT NULL
      AND provider_id IS NULL AND organization_id IS NULL AND benefactor_id IS NULL
      AND can_handle_technical_support = false
    ) OR (
      role = 'provider' AND provider_id IS NOT NULL
      AND institute_id IS NULL AND organization_id IS NULL AND benefactor_id IS NULL
      AND can_handle_technical_support = false
    ) OR (
      role = 'admin' AND institute_id IS NULL AND provider_id IS NULL
      AND organization_id IS NULL AND benefactor_id IS NULL
    ) OR (
      role = 'organization' AND organization_id IS NOT NULL
      AND institute_id IS NULL AND provider_id IS NULL AND benefactor_id IS NULL
      AND can_handle_technical_support = false
    ) OR (
      role = 'benefactor' AND benefactor_id IS NOT NULL
      AND institute_id IS NULL AND provider_id IS NULL AND organization_id IS NULL
      AND can_handle_technical_support = false
    )
  `),
]);

export const supervisionStatus = pgEnum("dena_supervision_status", [
  "requested", "approved", "revoked",
]);
export const courses = pgTable("dena_courses", {
  id: uuid("id").primaryKey().defaultRandom(),
  providerId: uuid("provider_id").notNull(),
  responsibleInstituteId: uuid("responsible_institute_id").notNull(),
  title: text("title").notNull(),
  // Nullable only for legacy, data-free foundation fixtures; all API-created
  // courses set both fields and validate the provider's active membership.
  createdByProviderUserId: uuid("created_by_provider_user_id")
    .references(() => user.id, { onDelete: "restrict" }),
  clientRequestId: uuid("client_request_id"),
}, (table) => [
  uniqueIndex("dena_courses_provider_request_uidx").on(table.providerId, table.clientRequestId),
  uniqueIndex("dena_courses_scope_fk_uidx").on(
    table.id, table.providerId, table.responsibleInstituteId,
  ),
  index("dena_courses_provider_idx").on(table.providerId),
  index("dena_courses_institute_idx").on(table.responsibleInstituteId),
]);

export const supervisionGrants = pgTable("dena_supervision_grants", {
  // One current approval state per course. Audit/history belongs in an append-only
  // event table in the follow-up write-flow; no self-approval API is exposed.
  courseId: uuid("course_id").primaryKey().references(() => courses.id, { onDelete: "cascade" }),
  providerId: uuid("provider_id").notNull(),
  instituteId: uuid("institute_id").notNull(),
  status: supervisionStatus("status").notNull().default("requested"),
  requestedByProviderUserId: uuid("requested_by_provider_user_id")
    .references(() => user.id, { onDelete: "restrict" }),
  requestedAt: timestamp("requested_at", { withTimezone: true }).notNull().defaultNow(),
  approvedByInstituteUserId: uuid("approved_by_institute_user_id").references(() => user.id),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
}, (table) => [
  check("dena_supervision_approved_ck", sql`
    status <> 'approved' OR
    (approved_by_institute_user_id IS NOT NULL AND approved_at IS NOT NULL)
  `),
  index("dena_supervision_institute_idx").on(table.instituteId, table.status),
  foreignKey({
    columns: [table.courseId, table.providerId, table.instituteId],
    foreignColumns: [courses.id, courses.providerId, courses.responsibleInstituteId],
    name: "dena_supervision_matching_course_fk",
  }).onDelete("cascade"),
]);

/** Audit events are insert-only in app routes. Production DB identity must
 * separately deny UPDATE/DELETE on this table before live launch.
 */
export const supervisionEventKind = pgEnum("dena_supervision_event_kind", [
  "requested", "approved", "rejected", "revoked",
]);
export const supervisionEvents = pgTable("dena_supervision_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  courseId: uuid("course_id").notNull().references(() => courses.id, {
    onDelete: "restrict",
  }),
  providerId: uuid("provider_id").notNull(),
  instituteId: uuid("institute_id").notNull(),
  actorUserId: uuid("actor_user_id").notNull().references(() => user.id, {
    onDelete: "restrict",
  }),
  kind: supervisionEventKind("kind").notNull(),
  reason: text("reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("dena_supervision_events_course_idx").on(table.courseId, table.createdAt),
  check("dena_supervision_event_reason_ck", sql`
    (kind = 'requested' AND reason IS NULL)
    OR (kind <> 'requested' AND reason IS NOT NULL)
  `),
]);

/**
 * Privileged identities are NOT created by signup. Each applicant may submit
 * one reviewed request per role; approval provisions a NEW verified entity
 * scoped to its own UUID, not an applicant-supplied tenant ID.
 */
export const elevatedRole = pgEnum("dena_elevated_role", [
  "institute", "provider", "organization", "benefactor",
]);
export const roleApplicationStatus = pgEnum("dena_role_application_status", [
  "pending", "approved", "rejected",
]);
export const roleApplicationEventKind = pgEnum("dena_role_application_event_kind", [
  "submitted", "approved", "rejected",
]);

export const verifiedEntities = pgTable("dena_verified_entities", {
  id: uuid("id").primaryKey().defaultRandom(),
  role: elevatedRole("role").notNull(),
  name: text("name").notNull(),
  evidenceReference: text("evidence_reference").notNull(),
  verifiedByUserId: uuid("verified_by_user_id").notNull()
    .references(() => user.id, { onDelete: "restrict" }),
  verifiedAt: timestamp("verified_at", { withTimezone: true }).notNull().defaultNow(),
});

export const roleApplications = pgTable("dena_role_applications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => user.id, { onDelete: "restrict" }),
  requestedRole: elevatedRole("requested_role").notNull(),
  proposedName: text("proposed_name").notNull(),
  statement: text("statement").notNull(),
  status: roleApplicationStatus("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  reviewerUserId: uuid("reviewer_user_id").references(() => user.id, { onDelete: "restrict" }),
  decisionReason: text("decision_reason"),
  assignedScopeId: uuid("assigned_scope_id").references(() => verifiedEntities.id, { onDelete: "restrict" }),
}, (table) => [
  uniqueIndex("dena_role_applicant_role_uidx").on(table.userId, table.requestedRole),
  index("dena_role_review_queue_idx").on(table.status, table.createdAt),
  check("dena_role_application_review_ck", sql`
    (status = 'pending' AND reviewed_at IS NULL AND reviewer_user_id IS NULL
      AND decision_reason IS NULL AND assigned_scope_id IS NULL)
    OR
    (status = 'rejected' AND reviewed_at IS NOT NULL AND reviewer_user_id IS NOT NULL
      AND decision_reason IS NOT NULL AND assigned_scope_id IS NULL)
    OR
    (status = 'approved' AND reviewed_at IS NOT NULL AND reviewer_user_id IS NOT NULL
      AND decision_reason IS NOT NULL AND assigned_scope_id IS NOT NULL)
  `),
]);

export const roleApplicationEvents = pgTable("dena_role_application_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  applicationId: uuid("application_id").notNull()
    .references(() => roleApplications.id, { onDelete: "restrict" }),
  actorUserId: uuid("actor_user_id").notNull()
    .references(() => user.id, { onDelete: "restrict" }),
  kind: roleApplicationEventKind("kind").notNull(),
  assignedScopeId: uuid("assigned_scope_id")
    .references(() => verifiedEntities.id, { onDelete: "restrict" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("dena_role_events_application_idx").on(table.applicationId, table.createdAt),
]);
