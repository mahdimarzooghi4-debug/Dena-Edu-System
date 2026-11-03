Warning: truncated output (original token count: 27545)
Total output lines: 2331

import {
  bigint, boolean, check, date, foreignKey, index, integer, jsonb, pgEnum, pgTable,
  primaryKey, text, timestamp, uniqueIndex, uuid,
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

/** One short-lived, hashed verification challenge per authenticated user for
 * changing the account phone. The OTP itself is never stored. */
export const phoneChangeChallenges = pgTable("dena_phone_change_challenges", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().unique()
    .references(() => user.id, { onDelete: "cascade" }),
  phoneNumber: text("phone_number").notNull(),
  codeHash: text("code_hash").notNull(),
  attempts: integer("attempts").notNull().default(0),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("dena_phone_change_challenge_expiry_idx").on(table.expiresAt),
  check("dena_phone_change_challenge_code_hash_ck", sql`code_hash ~ '^[a-f0-9]{64}$'`),
  check("dena_phone_change_challenge_attempts_ck", sql`attempts BETWEEN 0 AND 3`),
  check("dena_phone_change_challenge_phone_ck", sql`phone_number ~ '^\\+989[0-9]{9}$'`),
]);

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
export const courseOwnerType = pgEnum("dena_course_owner_type", [
  "verified_provider", "independent_educator", "institute",
]);
export const coursePublicationStatus = pgEnum("dena_course_publication_status", [
  "draft", "published", "archived",
]);
export const courses = pgTable("dena_courses", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerType: courseOwnerType("owner_type").notNull().default("verified_provider"),
  providerId: uuid("provider_id"),
  independentEducatorProfileId: uuid("independent_educator_profile_id")
    .references(() => independentEducatorProfiles.id, { onDelete: "restrict" }),
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
  uniqueIndex("dena_courses_independent_request_uidx")
    .on(table.independentEducatorProfileId, table.clientRequestId)
    .where(sql`owner_type = 'independent_educator'`),
  uniqueIndex("dena_courses_institute_request_uidx")
    .on(table.responsibleInstituteId, table.clientRequestId)
    .where(sql`owner_type = 'institute'`),
  uniqueIndex("dena_courses_scope_fk_uidx").on(
    table.id, table.providerId, table.responsibleInstituteId,
  ),
  uniqueIndex("dena_courses_independent_scope_fk_uidx").on(
    table.id, table.independentEducatorProfileId, table.responsibleInstituteId,
  ),
  uniqueIndex("dena_courses_institute_scope_uidx").on(
    table.id, table.responsibleInstituteId,
  ),
  index("dena_courses_provider_idx").on(table.providerId),
  index("dena_courses_independent_educator_idx")
    .on(table.independentEducatorProfileId, table.publicationStatus),
  index("dena_courses_institute_idx").on(table.responsibleInstituteId),
  check("dena_courses_owner_scope_ck", sql`
    (owner_type = 'verified_provider'
      AND provider_id IS NOT NULL AND independent_educator_profile_id IS NULL)
    OR (owner_type = 'independent_educator'
      AND provider_id IS NULL AND independent_educator_profile_id IS NOT NULL)
    OR (owner_type = 'institute'
      AND provider_id IS NULL AND independent_educator_profile_id IS NULL)
  `),
]);

export const supervisionGrants = pgTable("dena_supervision_grants", {
  // One current approval state per course. Audit/history belongs in an append-only
  // event table in the follow-up write-flow; no self-approval API is exposed.
  courseId: uuid("course_id").primaryKey().references(() => courses.id, { onDelete: "cascade" }),
  ownerType: courseOwnerType("owner_type").notNull().default("verified_provider"),
  providerId: uuid("provider_id"),
  independentEducatorProfileId: uuid("independent_educator_profile_id")
    .references(() => independentEducatorProfiles.id, { onDelete: "restrict" }),
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
    name: "dena_supervision_matching_provider_course_fk",
  }).onDelete("cascade"),
  foreignKey({
    columns: [table.courseId, table.independentEducatorProfileId, table.instituteId],
    foreignColumns: [courses.id, courses.independentEducatorProfileId,
      courses.responsibleInstituteId],
    name: "dena_supervision_matching_independent_course_fk",
  }).onDelete("cascade"),
  foreignKey({
    columns: [table.courseId, table.instituteId],
    foreignColumns: [courses.id, courses.responsibleInstituteId],
    name: "dena_supervision_matching_institute_course_fk",
  }).onDelete("cascade"),
  check("dena_supervision_owner_scope_ck", sql`
    (owner_type = 'verified_provider'
      AND provider_id IS NOT NULL AND independent_educator_profile_id IS NULL)
    OR (owner_type = 'independent_educator'
      AND provider_id IS NULL AND independent_educator_profile_id IS NOT NULL)
    OR (owner_type = 'institute'
      AND provider_id IS NULL AND independent_educator_profile_id IS NULL)
  `),
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
  ownerType: courseOwnerType("owner_type").notNull().default("verified_provider"),
  providerId: uuid("provider_id"),
  independentEducatorProfileId: uuid("independent_educator_profile_id")
    .references(() => independentEducatorProfiles.id, { onDelete: "restrict" }),
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
  check("dena_supervision_event_owner_scope_ck", sql`
    (owner_type = 'verified_provider'
      AND provider_id IS NOT NULL AND independent_educator_profile_id IS NULL)
    OR (owner_type = 'independent_educator'
      AND provider_id IS NULL AND independent_educator_profile_id IS NOT NULL)
    OR (owner_type = 'institute'
      AND provider_id IS NULL AND independent_educator_profile_id IS NULL)
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

/**
 * Course educational roles are assignments, not global Dena roles.
 * This lets the same authenticated user be a student in one context and,
 * when explicitly assigned by an institute, a supporter in another course.
 */
export const courseTeamRole = pgEnum("dena_course_team_role", [
  "teacher", "academic_supporter", "counselor",
]);
export const courseTeamMemberStatus = pgEnum("dena_course_team_member_status", [
  "active", "inactive",
]);
export const courseTeamMembers = pgTable("dena_course_team_members", {
  id: uuid("id").primaryKey().defaultRandom(),
  courseId: uuid("course_id").notNull(),
  instituteId: uuid("institute_id").notNull(),
  memberUserId: uuid("member_user_id").notNull()
    .references(() => user.id, { onDelete: "restrict" }),
  role: courseTeamRole("role").notNull(),
  status: courseTeamMemberStatus("status").notNull().default("active"),
  studentSessionRequestsEnabled: boolean("student_session_requests_enabled")
    .notNull().default(false),
  assignedByInstituteUserId: uuid("assigned_by_institute_user_id").notNull()
    .references(() => user.id, { onDelete: "restrict" }),
  assignedAt: timestamp("assigned_at", { withTimezone: true })
    .notNull().defaultNow(),
  endedAt: timestamp("ended_at", { withTimezone: true }),
}, (table) => [
  uniqueIndex("dena_course_team_member_role_uidx").on(
    table.courseId, table.memberUserId, table.role,
  ),
  uniqueIndex("dena_course_team_member_course_uidx").on(
    table.id, table.courseId,
  ),
  index("dena_course_team_course_status_idx").on(
    table.courseId, table.status, table.role,
  ),
  foreignKey({
    columns: [table.courseId, table.instituteId],
    foreignColumns: [courses.id, courses.responsibleInstituteId],
    name: "dena_course_team_institute_scope_fk",
  }).onDelete("restrict"),
  check("dena_course_team_status_ck", sql`
    (status = 'active' AND ended_at IS NULL)
    OR (status = 'inactive' AND ended_at IS NOT NULL)
  `),
  check("dena_course_team_session_request_role_ck", sql`
    role = 'academic_supporter' OR student_session_requests_enabled = false
  `),
]);

/**
 * One private conversation per enrolled student and assigned course-team member.
 * The application re-checks active enrollment, supervision and assignment before
 * every new message. Historical messages may remain readable after deactivation
 * according to the later retention policy, but cannot grant course access.
 */
export const courseConversations = pgTable("dena_course_conversations", {
  id: uuid("id").primaryKey().defaultRandom(),
  courseId: uuid("course_id").notNull(),
  studentUserId: uuid("student_user_id").notNull()
    .references(() => user.id, { onDelete: "restrict" }),
  teamMemberId: uuid("team_member_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull().defaultNow(),
  lastMessageAt: timestamp("last_message_at", { withTimezone: true }),
}, (table) => [
  uniqueIndex("dena_course_conversation_student_member_uidx").on(
    table.studentUserId, table.teamMemberId,
  ),
  index("dena_course_conversation_course_student_idx").on(
    table.courseId, table.studentUserId,
  ),
  index("dena_course_conversation_member_recent_idx").on(
    table.teamMemberId, table.lastMessageAt,
  ),
  foreignKey({
    columns: [table.teamMemberId, table.courseId],
    foreignColumns: [courseTeamMembers.id, courseTeamMembers.courseId],
    name: "dena_course_conversation_team_scope_fk",
  }).onDelete("restrict"),
]);

export const courseConversationMessages = pgTable(
  "dena_course_conversation_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    conversationId: uuid("conversation_id").notNull()
      .references(() => courseConversations.id, { onDelete: "restrict" }),
    senderUserId: uuid("sender_user_id").notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull().defaultNow(),
  },
  (table) => [
    index("dena_course_conversation_message_idx").on(
      table.conversationId, table.createdAt,
    ),
    check("dena_course_conversation_message_body_ck", sql`
      char_length(body) BETWEEN 1 AND 4000 AND btrim(body) <> ''
    `),
  ],
);

export const problemSolvingRequestStatus = pgEnum(
  "dena_problem_solving_request_status",
  ["submitted", "under_review", "scheduled", "declined"],
);
export const problemSolvingSessionStatus = pgEnum(
  "dena_problem_solving_session_status",
  ["scheduled", "held", "cancelled"],
);

export const problemSolvingRequests = pgTable(
  "dena_problem_solving_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    courseId: uuid("course_id").notNull(),
   …17545 tokens truncated…: uuid("id").primaryKey().defaultRandom(),
  recipientUserId: uuid("recipient_user_id").notNull()
    .references(() => user.id, { onDelete: "restrict" }),
  ticketId: uuid("ticket_id").notNull()
    .references(() => technicalSupportTickets.id, { onDelete: "restrict" }),
  kind: text("kind").notNull(),
  readAt: timestamp("read_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("dena_support_notification_recipient_created_idx").on(
    table.recipientUserId, table.createdAt,
  ),
  index("dena_support_notification_ticket_idx").on(table.ticketId, table.createdAt),
  check("dena_support_notification_kind_ck", sql`
    kind IN ('ticket_created', 'requester_replied', 'support_replied', 'ticket_updated', 'attachment_added', 'attachment_scanned')
  `),
]);

export const technicalSupportAttachments = pgTable("dena_technical_support_attachments", {
  id: uuid("id").primaryKey().defaultRandom(),
  ticketId: uuid("ticket_id").notNull()
    .references(() => technicalSupportTickets.id, { onDelete: "restrict" }),
  uploadedByUserId: uuid("uploaded_by_user_id").notNull()
    .references(() => user.id, { onDelete: "restrict" }),
  fileName: text("file_name").notNull(),
  contentType: text("content_type").notNull(),
  byteSize: integer("byte_size").notNull(),
  sha256: text("sha256").notNull(),
  objectKey: text("object_key").notNull().unique(),
  status: text("status").notNull().default("quarantined"),
  scannedAt: timestamp("scanned_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("dena_support_attachment_ticket_idx").on(table.ticketId, table.createdAt),
  check("dena_support_attachment_file_name_ck", sql`
    char_length(file_name) BETWEEN 1 AND 180
  `),
  check("dena_support_attachment_type_ck", sql`
    content_type IN ('application/pdf', 'image/jpeg', 'image/png')
  `),
  check("dena_support_attachment_size_ck", sql`
    byte_size BETWEEN 1 AND 10485760
  `),
  check("dena_support_attachment_hash_ck", sql`
    sha256 ~ '^[0-9a-f]{64}$'
  `),
  check("dena_support_attachment_status_ck", sql`
    (status IN ('uploading', 'quarantined', 'failed') AND scanned_at IS NULL)
    OR (status IN ('ready', 'rejected') AND scanned_at IS NOT NULL)
  `),
]);

export const technicalSupportMessages = pgTable("dena_technical_support_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  ticketId: uuid("ticket_id").notNull()
    .references(() => technicalSupportTickets.id, { onDelete: "restrict" }),
  authorUserId: uuid("author_user_id").notNull()
    .references(() => user.id, { onDelete: "restrict" }),
  body: text("body").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("dena_support_message_ticket_created_idx").on(table.ticketId, table.createdAt),
  check("dena_support_message_body_ck", sql`
    char_length(body) BETWEEN 1 AND 5000
  `),
]);

export const instituteServiceCatalogStatus = pgEnum("dena_institute_service_status", [
  "draft", "active", "paused",
]);
export const instituteServiceCatalog = pgTable("dena_institute_services", {
  id: uuid("id").primaryKey().defaultRandom(),
  instituteId: uuid("institute_id").notNull()
    .references(() => verifiedEntities.id, { onDelete: "restrict" }),
  createdByUserId: uuid("created_by_user_id").notNull()
    .references(() => user.id, { onDelete: "restrict" }),
  title: text("title").notNull(),
  category: text("category").notNull(),
  description: text("description").notNull(),
  priceToman: bigint("price_toman", { mode: "number" }).notNull(),
  includedMinutes: integer("included_minutes"),
  validityDays: integer("validity_days"),
  guardianConsentRequired: boolean("guardian_consent_required").notNull().default(false),
  cancellationPolicy: text("cancellation_policy").notNull(),
  status: instituteServiceCatalogStatus("status").notNull().default("draft"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("dena_institute_services_scope_uidx").on(table.id, table.instituteId),
  index("dena_institute_services_owner_status_created_idx").on(
    table.instituteId, table.status, table.createdAt,
  ),
  check("dena_institute_services_title_ck", sql`char_length(title) BETWEEN 3 AND 120`),
  check("dena_institute_services_category_ck", sql`
    category IN ('consultation', 'career_guidance', 'assessment', 'support', 'other')
  `),
  check("dena_institute_services_description_ck", sql`char_length(description) BETWEEN 10 AND 2000`),
  check("dena_institute_services_price_ck", sql`price_toman BETWEEN 1 AND 1000000000000`),
  check("dena_institute_services_quota_ck", sql`
    (included_minutes IS NULL AND validity_days IS NULL)
    OR (included_minutes BETWEEN 5 AND 100000 AND validity_days BETWEEN 1 AND 3650)
  `),
  check("dena_institute_services_policy_ck", sql`char_length(cancellation_policy) BETWEEN 1 AND 1500`),
]);

export const financialRevenueStream = pgEnum("dena_financial_revenue_stream", [
  "institute_service", "supervised_provider",
]);
export const financialEntryAccount = pgEnum("dena_financial_entry_account", [
  "gateway_clearing", "dena_service_commission_payable", "institute_service_payable",
  "dena_provider_commission_payable", "institute_provider_payable",
  "provider_compensation_payable", "gateway_fee_expense", "student_refund_payable",
  "settlement_bank",
]);
export const financialEventType = pgEnum("dena_financial_event_type", [
  "payment_captured", "gateway_fee_recorded", "settlement_received", "refund_issued",
]);
export const financialJournals = pgTable("dena_financial_journals", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventKey: text("event_key").notNull().unique(),
  revenueStream: financialRevenueStream("revenue_stream").notNull(),
  eventType: financialEventType("event_type").notNull(),
  sourceId: uuid("source_id").notNull(),
  createdByUserId: uuid("created_by_user_id").references(() => user.id, { onDelete: "restrict" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("dena_financial_journal_stream_created_idx").on(table.revenueStream, table.createdAt),
  index("dena_financial_journal_source_idx").on(table.sourceId, table.eventType),
  check("dena_financial_journal_event_key_ck", sql`event_key ~ '^[a-zA-Z0-9_.:-]{8,180}$'`),
]);
export const financialEntries = pgTable("dena_financial_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  journalId: uuid("journal_id").notNull()
    .references(() => financialJournals.id, { onDelete: "restrict" }),
  account: financialEntryAccount("account").notNull(),
  debitRials: bigint("debit_rials", { mode: "number" }).notNull().default(0),
  creditRials: bigint("credit_rials", { mode: "number" }).notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("dena_financial_entry_journal_idx").on(table.journalId, table.createdAt),
  check("dena_financial_entry_one_side_ck", sql`
    (debit_rials > 0 AND credit_rials = 0)
    OR (credit_rials > 0 AND debit_rials = 0)
  `),
]);

export const instituteServiceOrderStatus = pgEnum("dena_institute_service_order_status", [
  "awaiting_guardian_consent", "awaiting_payment", "paid", "cancelled",
]);
export const instituteServiceOrders = pgTable("dena_institute_service_orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  idempotencyKey: uuid("idempotency_key").notNull(),
  studentUserId: uuid("student_user_id").notNull()
    .references(() => user.id, { onDelete: "restrict" }),
  serviceId: uuid("service_id").notNull(),
  instituteId: uuid("institute_id").notNull(),
  serviceTitleSnapshot: text("service_title_snapshot").notNull(),
  categorySnapshot: text("category_snapshot").notNull(),
  priceToman: bigint("price_toman", { mode: "number" }).notNull(),
  grossRials: bigint("gross_rials", { mode: "number" }).notNull(),
  denaShareRials: bigint("dena_share_rials", { mode: "number" }).notNull(),
  instituteShareRials: bigint("institute_share_rials", { mode: "number" }).notNull(),
  commissionBasisPoints: integer("commission_basis_points").notNull().default(1000),
  includedMinutes: integer("included_minutes"),
  validityDays: integer("validity_days"),
  guardianConsentRequired: boolean("guardian_consent_required").notNull(),
  guardianConsentConfirmedAt: timestamp("guardian_consent_confirmed_at", { withTimezone: true }),
  guardianConsentConfirmedByUserId: uuid("guardian_consent_confirmed_by_user_id")
    .references(() => user.id, { onDelete: "restrict" }),
  status: instituteServiceOrderStatus("status").notNull(),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("dena_institute_service_order_student_idempotency_uidx").on(
    table.studentUserId, table.idempotencyKey,
  ),
  index("dena_institute_service_order_student_created_idx").on(
    table.studentUserId, table.createdAt,
  ),
  index("dena_institute_service_order_institute_status_idx").on(
    table.instituteId, table.status, table.createdAt,
  ),
  foreignKey({
    columns: [table.serviceId, table.instituteId],
    foreignColumns: [instituteServiceCatalog.id, instituteServiceCatalog.instituteId],
    name: "dena_institute_service_order_service_scope_fk",
  }).onDelete("restrict"),
  check("dena_institute_service_order_snapshot_ck", sql`
    char_length(service_title_snapshot) BETWEEN 3 AND 120
    AND category_snapshot IN ('consultation', 'career_guidance', 'assessment', 'support', 'other')
    AND price_toman BETWEEN 1 AND 1000000000000
    AND gross_rials = price_toman * 10
    AND commission_basis_points = 1000
    AND dena_share_rials = gross_rials / 10
    AND institute_share_rials = gross_rials - dena_share_rials
  `),
  check("dena_institute_service_order_quota_ck", sql`
    (included_minutes IS NULL AND validity_days IS NULL)
    OR (included_minutes BETWEEN 5 AND 100000 AND validity_days BETWEEN 1 AND 3650)
  `),
  check("dena_institute_service_order_consent_ck", sql`
    (guardian_consent_required = false AND guardian_consent_confirmed_at IS NULL
      AND guardian_consent_confirmed_by_user_id IS NULL)
    OR (guardian_consent_required = true AND status IN ('awaiting_guardian_consent', 'cancelled')
      AND guardian_consent_confirmed_at IS NULL AND guardian_consent_confirmed_by_user_id IS NULL)
    OR (guardian_consent_required = true AND guardian_consent_confirmed_at IS NOT NULL
      AND guardian_consent_confirmed_by_user_id IS NOT NULL)
  `),
  check("dena_institute_service_order_state_ck", sql`
    (status = 'awaiting_guardian_consent' AND guardian_consent_required = true
      AND guardian_consent_confirmed_at IS NULL AND paid_at IS NULL)
    OR (status = 'awaiting_payment' AND paid_at IS NULL
      AND (guardian_consent_required = false OR guardian_consent_confirmed_at IS NOT NULL))
    OR (status = 'paid' AND paid_at IS NOT NULL
      AND (guardian_consent_required = false OR guardian_consent_confirmed_at IS NOT NULL))
    OR (status = 'cancelled' AND paid_at IS NULL)
  `),
]);

export const serviceTimeLedgerEventType = pgEnum("dena_service_time_ledger_event_type", [
  "grant", "consume",
]);
export const serviceTimeLedger = pgTable("dena_service_time_ledger", {
  id: uuid("id").primaryKey().defaultRandom(),
  serviceOrderId: uuid("service_order_id").notNull()
    .references(() => instituteServiceOrders.id, { onDelete: "restrict" }),
  eventKey: text("event_key").notNull(),
  eventType: serviceTimeLedgerEventType("event_type").notNull(),
  seconds: integer("seconds").notNull(),
  serviceSessionId: uuid("service_session_id"),
  createdByUserId: uuid("created_by_user_id").references(() => user.id, { onDelete: "restrict" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("dena_service_time_ledger_event_key_uidx").on(table.eventKey),
  uniqueIndex("dena_service_time_ledger_consume_session_uidx").on(table.serviceSessionId)
    .where(sql`${table.eventType} = 'consume'`),
  index("dena_service_time_ledger_order_created_idx").on(table.serviceOrderId, table.createdAt),
  check("dena_service_time_ledger_event_key_ck", sql`event_key ~ '^[a-zA-Z0-9_.:-]{8,180}$'`),
  check("dena_service_time_ledger_seconds_ck", sql`seconds BETWEEN 1 AND 6000000`),
  check("dena_service_time_ledger_event_session_ck", sql`
    (event_type = 'grant' AND service_session_id IS NULL)
    OR (event_type = 'consume' AND service_session_id IS NOT NULL)
  `),
]);

export const instituteServiceCallStatus = pgEnum("dena_institute_service_call_status", [
  "scheduled", "started", "ended", "cancelled",
]);
export const instituteServiceCalls = pgTable("dena_institute_service_calls", {
  id: uuid("id").primaryKey().defaultRandom(),
  serviceOrderId: uuid("service_order_id").notNull()
    .references(() => instituteServiceOrders.id, { onDelete: "restrict" }),
  idempotencyKey: uuid("idempotency_key").notNull(),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
  status: instituteServiceCallStatus("status").notNull().default("scheduled"),
  startedAt: timestamp("started_at", { withTimezone: true }),
  endedAt: timestamp("ended_at", { withTimezone: true }),
  connectedSeconds: integer("connected_seconds").notNull().default(0),
  createdByUserId: uuid("created_by_user_id").notNull()
    .references(() => user.id, { onDelete: "restrict" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("dena_institute_service_call_order_created_idx").on(table.serviceOrderId, table.createdAt),
  uniqueIndex("dena_institute_service_call_order_idempotency_uidx")
    .on(table.serviceOrderId, table.idempotencyKey),
  uniqueIndex("dena_institute_service_call_order_open_uidx").on(table.serviceOrderId)
    .where(sql`${table.status} IN ('scheduled', 'started')`),
  check("dena_institute_service_call_state_ck", sql`
    (status = 'scheduled' AND started_at IS NULL AND ended_at IS NULL)
    OR (status = 'started' AND started_at IS NOT NULL AND ended_at IS NULL)
    OR (status = 'ended' AND started_at IS NOT NULL AND ended_at >= started_at)
    OR (status = 'cancelled' AND started_at IS NULL AND ended_at IS NULL)
  `),
  check("dena_institute_service_call_connected_seconds_ck", sql`connected_seconds >= 0`),
]);

export const serviceCallMediaEventKind = pgEnum("dena_service_call_media_event_kind", [
  "joined", "left", "room_finished",
]);
export const serviceCallMediaEvents = pgTable("dena_service_call_media_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  providerEventId: text("provider_event_id").notNull(),
  serviceCallId: uuid("service_call_id").notNull()
    .references(() => instituteServiceCalls.id, { onDelete: "restrict" }),
  participantUserId: uuid("participant_user_id").references(() => user.id, { onDelete: "restrict" }),
  participantRole: text("participant_role").notNull(),
  kind: serviceCallMediaEventKind("kind").notNull(),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("dena_service_call_media_event_provider_uidx").on(table.providerEventId),
  index("dena_service_call_media_event_call_time_idx").on(table.serviceCallId, table.occurredAt, table.id),
  check("dena_service_call_media_event_provider_id_ck", sql`provider_event_id ~ '^[A-Za-z0-9._:-]{8,100}$'`),
  check("dena_service_call_media_event_actor_ck", sql`
    (kind = 'room_finished' AND participant_user_id IS NULL AND participant_role = 'system')
    OR (kind <> 'room_finished' AND participant_user_id IS NOT NULL
      AND participant_role IN ('student', 'institute'))
  `),
]);

/** Only content intentionally published to the student belongs here. Private
 * counselor notes and session recordings have no field in this model. */
export const serviceCallFollowUps = pgTable("dena_service_call_follow_ups", {
  id: uuid("id").primaryKey().defaultRandom(),
  serviceCallId: uuid("service_call_id").notNull().unique()
    .references(() => instituteServiceCalls.id, { onDelete: "restrict" }),
  authorUserId: uuid("author_user_id").notNull()
    .references(() => user.id, { onDelete: "restrict" }),
  summary: text("summary").notNull(),
  nextSteps: jsonb("next_steps").$type<string[]>().notNull().default([]),
  publishedAt: timestamp("published_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("dena_service_call_follow_up_published_idx").on(table.publishedAt, table.id),
  check("dena_service_call_follow_up_summary_ck", sql`
    char_length(summary) BETWEEN 10 AND 4000
  `),
  check("dena_service_call_follow_up_steps_ck", sql`
    jsonb_typeof(next_steps) = 'array' AND jsonb_array_length(next_steps) <= 10
  `),
]);

/** Private two-way messages shared only by the student and their institute. */
export const serviceOrderMessages = pgTable("dena_service_order_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  serviceOrderId: uuid("service_order_id").notNull()
    .references(() => instituteServiceOrders.id, { onDelete: "restrict" }),
  senderUserId: uuid("sender_user_id").notNull()
    .references(() => user.id, { onDelete: "restrict" }),
  idempotencyKey: uuid("idempotency_key").notNull(),
  body: text("body").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("dena_service_order_message_idempotency_uidx")
    .on(table.serviceOrderId, table.senderUserId, table.idempotencyKey),
  index("dena_service_order_message_order_created_idx")
    .on(table.serviceOrderId, table.createdAt, table.id),
  check("dena_service_order_message_body_ck", sql`
    char_length(body) BETWEEN 1 AND 4000 AND btrim(body) <> ''
  `),
]);

/** Private order files stay quarantined until the configured scanner approves them. */
export const serviceOrderAttachments = pgTable("dena_service_order_attachments", {
  id: uuid("id").primaryKey().defaultRandom(),
  serviceOrderId: uuid("service_order_id").notNull()
    .references(() => instituteServiceOrders.id, { onDelete: "restrict" }),
  uploadedByUserId: uuid("uploaded_by_user_id").notNull()
    .references(() => user.id, { onDelete: "restrict" }),
  fileName: text("file_name").notNull(),
  contentType: text("content_type").notNull(),
  byteSize: integer("byte_size").notNull(),
  sha256: text("sha256").notNull(),
  objectKey: text("object_key").notNull().unique(),
  status: text("status").notNull().default("quarantined"),
  scannedAt: timestamp("scanned_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("dena_service_order_attachment_order_created_idx").on(table.serviceOrderId, table.createdAt),
  check("dena_service_order_attachment_name_ck", sql`char_length(file_name) BETWEEN 1 AND 180`),
  check("dena_service_order_attachment_type_ck", sql`
    content_type IN ('application/pdf', 'image/jpeg', 'image/png')
  `),
  check("dena_service_order_attachment_size_ck", sql`byte_size BETWEEN 1 AND 10485760`),
  check("dena_service_order_attachment_hash_ck", sql`sha256 ~ '^[0-9a-f]{64}$'`),
  check("dena_service_order_attachment_status_ck", sql`
    (status IN ('uploading', 'quarantined', 'failed') AND scanned_at IS NULL)
    OR (status IN ('ready', 'rejected') AND scanned_at IS NOT NULL)
  `),
]);
