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
export const coursePublicationStatus = pgEnum("dena_course_publication_status", [
  "draft", "published", "archived",
]);
export const courses = pgTable("dena_courses", {
  id: uuid("id").primaryKey().defaultRandom(),
  providerId: uuid("provider_id").notNull(),
  responsibleInstituteId: uuid("responsible_institute_id").notNull(),
  title: text("title").notNull(),
  // Explicit free-only launch; paid enrollment is deliberately NOT available.
  publicationStatus: coursePublicationStatus("publication_status").notNull().default("draft"),
  publishedAt: timestamp("published_at", { withTimezone: true }),
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

/** Free student access only. Never infer a paid entitlement from these rows. */
export const enrollmentStatus = pgEnum("dena_enrollment_status", ["active", "cancelled"]);
export const studentEnrollments = pgTable("dena_student_enrollments", {
  id: uuid("id").primaryKey().defaultRandom(),
  courseId: uuid("course_id").notNull().references(() => courses.id, {
    onDelete: "restrict",
  }),
  studentUserId: uuid("student_user_id").notNull().references(() => user.id, {
    onDelete: "restrict",
  }),
  status: enrollmentStatus("status").notNull().default("active"),
  enrolledAt: timestamp("enrolled_at", { withTimezone: true }).notNull().defaultNow(),
  cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
}, (table) => [
  uniqueIndex("dena_student_course_enrollment_uidx").on(
    table.studentUserId, table.courseId,
  ),
  index("dena_enrollment_course_idx").on(table.courseId, table.status),
  check("dena_enrollment_cancel_ck", sql`
    (status = 'active' AND cancelled_at IS NULL)
    OR (status = 'cancelled' AND cancelled_at IS NOT NULL)
  `),
]);

/** Private media records are created only by a future trusted ingest workflow,
 * never by user-provided file URLs or an exposed provider create-asset endpoint.
 */
export const mediaAssetStatus = pgEnum("dena_media_asset_status", [
  "ready", "withdrawn",
]);
export const privateMediaAssets = pgTable("dena_private_media_assets", {
  id: uuid("id").primaryKey().defaultRandom(),
  courseId: uuid("course_id").notNull().references(() => courses.id, {
    onDelete: "restrict",
  }),
  title: text("title").notNull(),
  objectKey: text("object_key").notNull().unique(),
  status: mediaAssetStatus("status").notNull().default("ready"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("dena_private_media_course_idx").on(table.courseId, table.status),
  check("dena_private_media_key_ck", sql`
    object_key = course_id::text || '/' || id::text || '.mp4'
  `),
]);

/** Uploads are quarantined first; ONLY a separately authenticated processing
 * callback, followed by server-side origin verification, can create a ready asset.
 */
export const ingestStatus = pgEnum("dena_media_ingest_status", [
  "reserved", "uploading", "quarantined", "ready", "rejected",
]);
export const mediaIngests = pgTable("dena_media_ingests", {
  id: uuid("id").primaryKey().defaultRandom(),
  assetId: uuid("asset_id").notNull().unique().defaultRandom(),
  courseId: uuid("course_id").notNull().references(() => courses.id, {
    onDelete: "restrict",
  }),
  providerId: uuid("provider_id").notNull(),
  createdByUserId: uuid("created_by_user_id").notNull().references(() => user.id, {
    onDelete: "restrict",
  }),
  requestId: uuid("request_id").notNull(),
  title: text("title").notNull(),
  expectedBytes: integer("expected_bytes").notNull(),
  expectedSha256: text("expected_sha256").notNull(),
  status: ingestStatus("status").notNull().default("reserved"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  uploadedAt: timestamp("uploaded_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  rejectionReason: text("rejection_reason"),
}, (table) => [
  uniqueIndex("dena_ingest_course_request_uidx").on(table.courseId, table.requestId),
  index("dena_ingest_status_idx").on(table.status, table.createdAt),
  check("dena_ingest_bytes_ck", sql`
    expected_bytes >= 16 AND expected_bytes <= 8388608
  `),
  check("dena_ingest_sha_ck", sql`
    expected_sha256 ~ '^[0-9a-f]{64}$'
  `),
  check("dena_ingest_state_ck", sql`
    (status IN ('reserved', 'uploading') AND uploaded_at IS NULL
      AND completed_at IS NULL AND rejection_reason IS NULL)
    OR (status = 'quarantined' AND uploaded_at IS NOT NULL
      AND completed_at IS NULL AND rejection_reason IS NULL)
    OR (status = 'ready' AND uploaded_at IS NOT NULL
      AND completed_at IS NOT NULL AND rejection_reason IS NULL)
    OR (status = 'rejected' AND completed_at IS NOT NULL
      AND rejection_reason IS NOT NULL)
  `),
]);

/** Durable, vendor-neutral scan/transcode dispatch; no public asset or
 * storage grants are ever derived from queue rows.
 */
export const processingJobStatus = pgEnum("dena_processing_job_status", [
  "queued", "leased", "done", "dead",
]);
export const mediaProcessingJobs = pgTable("dena_media_processing_jobs", {
  uploadId: uuid("upload_id").primaryKey().references(() => mediaIngests.id, {
    onDelete: "restrict",
  }),
  status: processingJobStatus("status").notNull().default("queued"),
  attempts: integer("attempts").notNull().default(0),
  leaseToken: uuid("lease_token"),
  leaseUntil: timestamp("lease_until", { withTimezone: true }),
  nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true }).notNull().defaultNow(),
  lastError: text("last_error"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("dena_processing_claim_idx").on(table.status, table.nextAttemptAt),
  check("dena_processing_attempts_ck", sql`attempts >= 0 AND attempts <= 5`),
  check("dena_processing_lease_ck", sql`
    (status = 'leased' AND lease_token IS NOT NULL AND lease_until IS NOT NULL)
    OR (status <> 'leased' AND lease_token IS NULL AND lease_until IS NULL)
  `),
]);


/** No cleanup operation can delete a ready/private asset. This ledger is
 * durable and records retries; only server-built quarantine/<upload UUID>
 * may be deleted by a separately authenticated private-store adapter.
 */
export const mediaCleanupJobs = pgTable("dena_media_cleanup_jobs", {
  uploadId: uuid("upload_id").primaryKey().references(() => mediaIngests.id, {
    onDelete: "restrict",
  }),
  status: text("status").notNull().default("pending"),
  attempts: integer("attempts").notNull().default(0),
  leaseToken: uuid("lease_token"),
  leaseUntil: timestamp("lease_until", { withTimezone: true }),
  nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  lastError: text("last_error"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("dena_cleanup_claim_idx").on(table.status, table.nextAttemptAt),
  check("dena_cleanup_attempts_ck", sql`attempts >= 0 AND attempts <= 5`),
  check("dena_cleanup_state_ck", sql`
    (status = 'leased' AND lease_token IS NOT NULL
      AND lease_until IS NOT NULL AND completed_at IS NULL)
    OR (status IN ('pending', 'dead') AND lease_token IS NULL
      AND lease_until IS NULL AND completed_at IS NULL)
    OR (status = 'done' AND lease_token IS NULL
      AND lease_until IS NULL AND completed_at IS NOT NULL)
  `),
]);

/** Durable DRY-RUN multipart plans. No storage session/part grant exists yet.
 * Separate from the intentionally memory-bounded 8-MiB pilot ingest table.
 */
export const mediaMultipartPlans = pgTable("dena_media_multipart_plans", {
  id: uuid("id").primaryKey().defaultRandom(),
  courseId: uuid("course_id").notNull().references(() => courses.id, {
    onDelete: "restrict",
  }),
  providerId: uuid("provider_id").notNull(),
  createdByUserId: uuid("created_by_user_id").notNull().references(() => user.id, {
    onDelete: "restrict",
  }),
  requestId: uuid("request_id").notNull(),
  title: text("title").notNull(),
  expectedBytes: bigint("expected_bytes", { mode: "number" }).notNull(),
  expectedSha256: text("expected_sha256").notNull(),
  status: text("status").notNull().default("planned"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
}, (table) => [
  uniqueIndex("dena_multipart_course_request_uidx").on(table.courseId, table.requestId),
  index("dena_multipart_status_expiry_idx").on(table.status, table.expiresAt),
  check("dena_multipart_bytes_ck", sql`
    expected_bytes > 16777216 AND expected_bytes <= 5368709120
  `),
  check("dena_multipart_sha_ck", sql`
    expected_sha256 ~ '^[0-9a-f]{64}$'
  `),
  check("dena_multipart_status_ck", sql`
    status IN ('planned', 'expired', 'cancelled')
  `),
  check("dena_multipart_cancel_ck", sql`
    (status = 'cancelled' AND cancelled_at IS NOT NULL)
    OR (status <> 'cancelled' AND cancelled_at IS NULL)
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
