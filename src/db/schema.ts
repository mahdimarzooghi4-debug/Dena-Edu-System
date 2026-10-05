import {
  bigint, boolean, check, date, foreignKey, index, integer, pgEnum, pgTable,
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
  uniqueIndex("dena_courses_institute_scope_uidx").on(
    table.id, table.responsibleInstituteId,
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
    studentUserId: uuid("student_user_id").notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    supporterTeamMemberId: uuid("supporter_team_member_id").notNull(),
    subject: text("subject").notNull(),
    description: text("description"),
    status: problemSolvingRequestStatus("status")
      .notNull().default("submitted"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull().defaultNow(),
  },
  (table) => [
    index("dena_problem_request_student_idx").on(
      table.studentUserId, table.createdAt,
    ),
    index("dena_problem_request_supporter_status_idx").on(
      table.supporterTeamMemberId, table.status, table.createdAt,
    ),
    foreignKey({
      columns: [table.supporterTeamMemberId, table.courseId],
      foreignColumns: [courseTeamMembers.id, courseTeamMembers.courseId],
      name: "dena_problem_request_supporter_scope_fk",
    }).onDelete("restrict"),
    check("dena_problem_request_subject_ck", sql`
      char_length(subject) BETWEEN 3 AND 160 AND btrim(subject) <> ''
    `),
    check("dena_problem_request_description_ck", sql`
      description IS NULL OR
      (char_length(description) BETWEEN 1 AND 1000 AND btrim(description) <> '')
    `),
  ],
);

export const problemSolvingSessions = pgTable(
  "dena_problem_solving_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    requestId: uuid("request_id").unique()
      .references(() => problemSolvingRequests.id, { onDelete: "restrict" }),
    courseId: uuid("course_id").notNull(),
    studentUserId: uuid("student_user_id").notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    supporterTeamMemberId: uuid("supporter_team_member_id").notNull(),
    subject: text("subject").notNull(),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
    status: problemSolvingSessionStatus("status")
      .notNull().default("scheduled"),
    createdByUserId: uuid("created_by_user_id").notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull().defaultNow(),
  },
  (table) => [
    index("dena_problem_session_student_time_idx").on(
      table.studentUserId, table.scheduledAt,
    ),
    index("dena_problem_session_supporter_time_idx").on(
      table.supporterTeamMemberId, table.scheduledAt,
    ),
    foreignKey({
      columns: [table.supporterTeamMemberId, table.courseId],
      foreignColumns: [courseTeamMembers.id, courseTeamMembers.courseId],
      name: "dena_problem_session_supporter_scope_fk",
    }).onDelete("restrict"),
    check("dena_problem_session_subject_ck", sql`
      char_length(subject) BETWEEN 3 AND 160 AND btrim(subject) <> ''
    `),
  ],
);

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
  uniqueIndex("dena_private_media_id_course_uidx").on(table.id, table.courseId),
  check("dena_private_media_key_ck", sql`
    object_key = course_id::text || '/' || id::text || '.mp4'
  `),
]);

/** Self-reported learning marker; it is NOT proof of watching or assessment. */
export const studentVideoCompletions = pgTable("dena_student_video_completions", {
  id: uuid("id").primaryKey().defaultRandom(),
  studentUserId: uuid("student_user_id").notNull()
    .references(() => user.id, { onDelete: "restrict" }),
  assetId: uuid("asset_id").notNull()
    .references(() => privateMediaAssets.id, { onDelete: "restrict" }),
  completedAt: timestamp("completed_at", { withTimezone: true })
    .notNull().defaultNow(),
}, (table) => [
  uniqueIndex("dena_student_asset_completion_uidx").on(
    table.studentUserId, table.assetId,
  ),
  index("dena_video_completion_asset_idx").on(table.assetId),
]);

/** Private per-student note. Never reused as a completion or assessment.
 * Avoid selecting this table for providers, institutes, benefactors or admins.
 */
export const studentVideoNotes = pgTable("dena_student_video_notes", {
  id: uuid("id").primaryKey().defaultRandom(),
  studentUserId: uuid("student_user_id").notNull()
    .references(() => user.id, { onDelete: "restrict" }),
  assetId: uuid("asset_id").notNull()
    .references(() => privateMediaAssets.id, { onDelete: "restrict" }),
  body: text("body").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull().defaultNow(),
}, (table) => [
  uniqueIndex("dena_student_asset_note_uidx").on(
    table.studentUserId, table.assetId,
  ),
  index("dena_video_note_asset_idx").on(table.assetId),
  check("dena_video_note_body_ck", sql`
    char_length(body) BETWEEN 1 AND 2000 AND btrim(body) <> ''
  `),
]);

/** One immutable provider-authored practice question per course for the pilot.
 * The correct answer is NEVER returned from a student read endpoint.
 * Course-level institute approval is not independent review of question text.
 */
export const practiceReviewStatus = pgEnum("dena_practice_review_status", [
  "pending", "approved", "rejected",
]);

export const coursePracticeQuestions = pgTable("dena_course_practice_questions", {
  courseId: uuid("course_id").primaryKey()
    .references(() => courses.id, { onDelete: "restrict" }),
  prompt: text("prompt").notNull(),
  option0: text("option_0").notNull(),
  option1: text("option_1").notNull(),
  option2: text("option_2").notNull(),
  option3: text("option_3").notNull(),
  correctOption: integer("correct_option").notNull(),
  authoredByProviderUserId: uuid("authored_by_provider_user_id").notNull()
    .references(() => user.id, { onDelete: "restrict" }),
  reviewStatus: practiceReviewStatus("review_status").notNull().default("pending"),
  reviewedByInstituteUserId: uuid("reviewed_by_institute_user_id")
    .references(() => user.id, { onDelete: "restrict" }),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  reviewReason: text("review_reason"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull().defaultNow(),
}, () => [
  check("dena_practice_review_state_ck", sql`
    (review_status = 'pending' AND reviewed_by_institute_user_id IS NULL
      AND reviewed_at IS NULL AND review_reason IS NULL)
    OR
    (review_status IN ('approved', 'rejected')
      AND reviewed_by_institute_user_id IS NOT NULL
      AND reviewed_at IS NOT NULL AND review_reason IS NOT NULL)
  `),
  check("dena_practice_question_bounds_ck", sql`
    char_length(prompt) BETWEEN 10 AND 500 AND btrim(prompt) <> ''
    AND char_length(option_0) BETWEEN 1 AND 160 AND btrim(option_0) <> ''
    AND char_length(option_1) BETWEEN 1 AND 160 AND btrim(option_1) <> ''
    AND char_length(option_2) BETWEEN 1 AND 160 AND btrim(option_2) <> ''
    AND char_length(option_3) BETWEEN 1 AND 160 AND btrim(option_3) <> ''
    AND correct_option BETWEEN 0 AND 3
  `),
]);

/** A single durable formative answer per active student and course.
 * This is not a certificate or an official academic score.
 */
export const studentPracticeAttempts = pgTable("dena_student_practice_attempts", {
  id: uuid("id").primaryKey().defaultRandom(),
  courseId: uuid("course_id").notNull()
    .references(() => coursePracticeQuestions.courseId, { onDelete: "restrict" }),
  studentUserId: uuid("student_user_id").notNull()
    .references(() => user.id, { onDelete: "restrict" }),
  selectedOption: integer("selected_option").notNull(),
  correct: boolean("correct").notNull(),
  submittedAt: timestamp("submitted_at", { withTimezone: true })
    .notNull().defaultNow(),
}, (table) => [
  uniqueIndex("dena_practice_attempt_student_course_uidx").on(
    table.studentUserId, table.courseId,
  ),
  index("dena_practice_attempt_course_idx").on(table.courseId),
  check("dena_practice_selected_option_ck", sql`
    selected_option BETWEEN 0 AND 3
  `),
]);

/** A multi-question, course-scoped learning assessment. Its threshold is
 * explicit per assessment; there is no platform-wide pass score. */
export const learningAssessmentReviewStatus = pgEnum(
  "dena_learning_assessment_review_status",
  ["pending", "approved", "rejected"],
);
export const learningAssessmentOutcome = pgEnum(
  "dena_learning_assessment_outcome",
  ["needs_review", "completed"],
);
export const learningAssessmentAttemptStatus = pgEnum(
  "dena_learning_assessment_attempt_status",
  ["in_progress", "submitted"],
);

export const courseLearningAssessments = pgTable(
  "dena_course_learning_assessments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    courseId: uuid("course_id").notNull()
      .references(() => courses.id, { onDelete: "restrict" }),
    title: text("title").notNull(),
    instructions: text("instructions").notNull(),
    questionCount: integer("question_count").notNull(),
    requiredCorrectCount: integer("required_correct_count").notNull(),
    authoredByProviderUserId: uuid("authored_by_provider_user_id").notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    reviewStatus: learningAssessmentReviewStatus("review_status")
      .notNull().default("pending"),
    reviewedByInstituteUserId: uuid("reviewed_by_institute_user_id")
      .references(() => user.id, { onDelete: "restrict" }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    reviewReason: text("review_reason"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("dena_learning_assessment_id_course_uidx").on(
      table.id, table.courseId,
    ),
    index("dena_learning_assessment_course_review_idx").on(
      table.courseId, table.reviewStatus,
    ),
    check("dena_learning_assessment_title_ck", sql`
      char_length(title) BETWEEN 3 AND 160 AND btrim(title) <> ''
    `),
    check("dena_learning_assessment_instructions_ck", sql`
      char_length(instructions) BETWEEN 1 AND 1000
      AND btrim(instructions) <> ''
    `),
    check("dena_learning_assessment_question_count_ck", sql`
      question_count BETWEEN 1 AND 100
      AND required_correct_count BETWEEN 1 AND question_count
    `),
    check("dena_learning_assessment_review_state_ck", sql`
      (review_status = 'pending'
        AND reviewed_by_institute_user_id IS NULL
        AND reviewed_at IS NULL AND review_reason IS NULL)
      OR
      (review_status IN ('approved', 'rejected')
        AND reviewed_by_institute_user_id IS NOT NULL
        AND reviewed_at IS NOT NULL AND review_reason IS NOT NULL
        AND char_length(review_reason) BETWEEN 15 AND 500
        AND btrim(review_reason) <> '')
    `),
  ],
);

export const courseLearningAssessmentQuestions = pgTable(
  "dena_course_learning_assessment_questions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    assessmentId: uuid("assessment_id").notNull(),
    courseId: uuid("course_id").notNull(),
    lessonAssetId: uuid("lesson_asset_id").notNull(),
    prompt: text("prompt").notNull(),
    option0: text("option_0").notNull(),
    option1: text("option_1").notNull(),
    option2: text("option_2").notNull(),
    option3: text("option_3").notNull(),
    correctOption: integer("correct_option").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("dena_learning_assessment_question_id_scope_uidx").on(
      table.id, table.assessmentId,
    ),
    index("dena_learning_assessment_question_bank_idx").on(
      table.assessmentId, table.createdAt,
    ),
    foreignKey({
      columns: [table.assessmentId, table.courseId],
      foreignColumns: [courseLearningAssessments.id,
        courseLearningAssessments.courseId],
      name: "dena_learning_assessment_question_assessment_scope_fk",
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.lessonAssetId, table.courseId],
      foreignColumns: [privateMediaAssets.id, privateMediaAssets.courseId],
      name: "dena_learning_assessment_question_lesson_scope_fk",
    }).onDelete("restrict"),
    check("dena_learning_assessment_question_bounds_ck", sql`
      char_length(prompt) BETWEEN 10 AND 500 AND btrim(prompt) <> ''
      AND char_length(option_0) BETWEEN 1 AND 160 AND btrim(option_0) <> ''
      AND char_length(option_1) BETWEEN 1 AND 160 AND btrim(option_1) <> ''
      AND char_length(option_2) BETWEEN 1 AND 160 AND btrim(option_2) <> ''
      AND char_length(option_3) BETWEEN 1 AND 160 AND btrim(option_3) <> ''
      AND correct_option BETWEEN 0 AND 3
    `),
  ],
);

export const studentLearningAssessmentAttempts = pgTable(
  "dena_student_learning_assessment_attempts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    assessmentId: uuid("assessment_id").notNull(),
    courseId: uuid("course_id").notNull(),
    studentUserId: uuid("student_user_id").notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    attemptNumber: integer("attempt_number").notNull(),
    status: learningAssessmentAttemptStatus("status")
      .notNull().default("in_progress"),
    outcome: learningAssessmentOutcome("outcome"),
    correctCount: integer("correct_count"),
    startedAt: timestamp("started_at", { withTimezone: true })
      .notNull().defaultNow(),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("dena_learning_assessment_attempt_id_scope_uidx").on(
      table.id, table.assessmentId, table.courseId,
    ),
    uniqueIndex("dena_learning_assessment_attempt_id_student_uidx").on(
      table.id, table.studentUserId,
    ),
    uniqueIndex("dena_learning_assessment_attempt_number_uidx").on(
      table.assessmentId, table.studentUserId, table.attemptNumber,
    ),
    index("dena_learning_assessment_attempt_student_idx").on(
      table.studentUserId, table.assessmentId, table.attemptNumber,
    ),
    foreignKey({
      columns: [table.assessmentId, table.courseId],
      foreignColumns: [courseLearningAssessments.id,
        courseLearningAssessments.courseId],
      name: "dena_learning_assessment_attempt_assessment_scope_fk",
    }).onDelete("restrict"),
    check("dena_learning_assessment_attempt_number_ck", sql`
      attempt_number >= 1
    `),
    check("dena_learning_assessment_attempt_state_ck", sql`
      (status = 'in_progress' AND outcome IS NULL
        AND correct_count IS NULL AND submitted_at IS NULL)
      OR
      (status = 'submitted' AND outcome IS NOT NULL
        AND correct_count IS NOT NULL AND submitted_at IS NOT NULL)
    `),
  ],
);

/** Randomly selected questions are snapshotted per attempt; selected answers
 * and grading state are never shared with course staff. */
export const studentLearningAssessmentAttemptQuestions = pgTable(
  "dena_student_learning_assessment_attempt_questions",
  {
    attemptId: uuid("attempt_id").notNull(),
    assessmentId: uuid("assessment_id").notNull(),
    courseId: uuid("course_id").notNull(),
    questionId: uuid("question_id").notNull(),
    position: integer("position").notNull(),
    selectedOption: integer("selected_option"),
    correct: boolean("correct"),
  },
  (table) => [
    primaryKey({ columns: [table.attemptId, table.questionId] }),
    uniqueIndex("dena_learning_assessment_attempt_position_uidx").on(
      table.attemptId, table.position,
    ),
    foreignKey({
      columns: [table.attemptId, table.assessmentId, table.courseId],
      foreignColumns: [studentLearningAssessmentAttempts.id,
        studentLearningAssessmentAttempts.assessmentId,
        studentLearningAssessmentAttempts.courseId],
      name: "dena_learning_assessment_attempt_question_attempt_scope_fk",
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.questionId, table.assessmentId],
      foreignColumns: [courseLearningAssessmentQuestions.id,
        courseLearningAssessmentQuestions.assessmentId],
      name: "dena_learning_assessment_attempt_question_bank_scope_fk",
    }).onDelete("restrict"),
    check("dena_learning_assessment_attempt_question_position_ck", sql`
      position >= 0
    `),
    check("dena_learning_assessment_attempt_question_answer_ck", sql`
      (selected_option IS NULL AND correct IS NULL)
      OR (selected_option BETWEEN 0 AND 3 AND correct IS NOT NULL)
    `),
  ],
);

/** The student acknowledges review of a lesson linked to a missed question.
 * This is an acknowledgement, not proof of playback. */
export const studentLearningAssessmentLessonReviews = pgTable(
  "dena_student_learning_assessment_lesson_reviews",
  {
    attemptId: uuid("attempt_id").notNull(),
    assessmentId: uuid("assessment_id").notNull(),
    courseId: uuid("course_id").notNull(),
    lessonAssetId: uuid("lesson_asset_id").notNull(),
    studentUserId: uuid("student_user_id").notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true })
      .notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.attemptId, table.lessonAssetId] }),
    index("dena_learning_assessment_lesson_review_student_idx").on(
      table.studentUserId, table.assessmentId, table.reviewedAt,
    ),
    foreignKey({
      columns: [table.attemptId, table.assessmentId, table.courseId],
      foreignColumns: [studentLearningAssessmentAttempts.id,
        studentLearningAssessmentAttempts.assessmentId,
        studentLearningAssessmentAttempts.courseId],
      name: "dena_learning_assessment_lesson_review_attempt_scope_fk",
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.attemptId, table.studentUserId],
      foreignColumns: [studentLearningAssessmentAttempts.id,
        studentLearningAssessmentAttempts.studentUserId],
      name: "dena_learning_assessment_lesson_review_student_scope_fk",
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.lessonAssetId, table.courseId],
      foreignColumns: [privateMediaAssets.id, privateMediaAssets.courseId],
      name: "dena_learning_assessment_lesson_review_asset_scope_fk",
    }).onDelete("restrict"),
  ],
);

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

/** A verified provider may work under a verified institute's supervision
 * while retaining their own provider identity. This institution-wide
 * affiliation is separate from per-course supervision and Dena reviews it
 * after the institute accepts the request. */
export const providerInstituteCollaborationStatus = pgEnum(
  "dena_provider_institute_collaboration_status",
  ["requested", "awaiting_dena", "approved", "institute_rejected", "dena_rejected"],
);
export const providerInstituteCollaborationEventKind = pgEnum(
  "dena_provider_institute_collaboration_event_kind",
  ["requested", "institute_approved", "institute_rejected", "dena_approved", "dena_rejected", "provider_withdrew"],
);

export const providerInstituteCollaborations = pgTable(
  "dena_provider_institute_collaborations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    providerId: uuid("provider_id").notNull()
      .references(() => verifiedEntities.id, { onDelete: "restrict" }),
    instituteId: uuid("institute_id").notNull()
      .references(() => verifiedEntities.id, { onDelete: "restrict" }),
    requestedByUserId: uuid("requested_by_user_id").notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    clientRequestId: uuid("client_request_id").notNull(),
    status: providerInstituteCollaborationStatus("status").notNull().default("requested"),
    withdrawnAt: timestamp("withdrawn_at", { withTimezone: true }),
    instituteReviewedByUserId: uuid("institute_reviewed_by_user_id")
      .references(() => user.id, { onDelete: "restrict" }),
    instituteReviewedAt: timestamp("institute_reviewed_at", { withTimezone: true }),
    instituteDecisionReason: text("institute_decision_reason"),
    denaReviewedByUserId: uuid("dena_reviewed_by_user_id")
      .references(() => user.id, { onDelete: "restrict" }),
    denaReviewedAt: timestamp("dena_reviewed_at", { withTimezone: true }),
    denaDecisionReason: text("dena_decision_reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("dena_provider_institute_collab_request_uidx")
      .on(table.providerId, table.clientRequestId),
    uniqueIndex("dena_provider_institute_collab_active_uidx")
      .on(table.providerId, table.instituteId)
      .where(sql`status IN ('requested', 'awaiting_dena', 'approved') AND withdrawn_at IS NULL`),
    index("dena_provider_institute_collab_provider_idx").on(table.providerId, table.status),
    index("dena_provider_institute_collab_institute_idx").on(table.instituteId, table.status),
    check("dena_provider_institute_collab_distinct_scopes_ck", sql`provider_id <> institute_id`),
    check("dena_provider_institute_collab_stage_ck", sql`
      (status = 'requested'
        AND institute_reviewed_by_user_id IS NULL AND institute_reviewed_at IS NULL
        AND institute_decision_reason IS NULL
        AND dena_reviewed_by_user_id IS NULL AND dena_reviewed_at IS NULL
        AND dena_decision_reason IS NULL)
      OR (status = 'awaiting_dena'
        AND institute_reviewed_by_user_id IS NOT NULL AND institute_reviewed_at IS NOT NULL
        AND institute_decision_reason IS NOT NULL
        AND dena_reviewed_by_user_id IS NULL AND dena_reviewed_at IS NULL
        AND dena_decision_reason IS NULL)
      OR (status = 'approved'
        AND institute_reviewed_by_user_id IS NOT NULL AND institute_reviewed_at IS NOT NULL
        AND institute_decision_reason IS NOT NULL
        AND dena_reviewed_by_user_id IS NOT NULL AND dena_reviewed_at IS NOT NULL
        AND dena_decision_reason IS NOT NULL)
      OR (status = 'institute_rejected'
        AND institute_reviewed_by_user_id IS NOT NULL AND institute_reviewed_at IS NOT NULL
        AND institute_decision_reason IS NOT NULL
        AND dena_reviewed_by_user_id IS NULL AND dena_reviewed_at IS NULL
        AND dena_decision_reason IS NULL)
      OR (status = 'dena_rejected'
        AND institute_reviewed_by_user_id IS NOT NULL AND institute_reviewed_at IS NOT NULL
        AND institute_decision_reason IS NOT NULL
        AND dena_reviewed_by_user_id IS NOT NULL AND dena_reviewed_at IS NOT NULL
        AND dena_decision_reason IS NOT NULL)
    `),
    check("dena_provider_institute_collab_withdrawal_ck", sql`
      withdrawn_at IS NULL OR (status = 'requested'
        AND institute_reviewed_by_user_id IS NULL AND institute_reviewed_at IS NULL
        AND institute_decision_reason IS NULL
        AND dena_reviewed_by_user_id IS NULL AND dena_reviewed_at IS NULL
        AND dena_decision_reason IS NULL)
    `),
  ],
);

/** Append-only transition history for provider/institute affiliation review. */
export const providerInstituteCollaborationEvents = pgTable(
  "dena_provider_institute_collaboration_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    collaborationId: uuid("collaboration_id").notNull()
      .references(() => providerInstituteCollaborations.id, { onDelete: "restrict" }),
    actorUserId: uuid("actor_user_id").notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    kind: providerInstituteCollaborationEventKind("kind").notNull(),
    reason: text("reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("dena_provider_institute_collab_events_idx").on(table.collaborationId, table.createdAt),
    check("dena_provider_institute_collab_event_reason_ck", sql`
      (kind = 'requested' AND reason IS NULL)
      OR (kind <> 'requested' AND reason IS NOT NULL)
    `),
  ],
);

/** An educator without an independent educational license is a user profile,
 * not a verified provider entity or a global provider membership. */
export const independentEducatorProfiles = pgTable(
  "dena_independent_educator_profiles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().unique()
      .references(() => user.id, { onDelete: "restrict" }),
    displayName: text("display_name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull().defaultNow(),
  },
  () => [
    check("dena_independent_educator_display_name_ck", sql`
      char_length(display_name) BETWEEN 3 AND 120 AND btrim(display_name) <> ''
    `),
  ],
);

export const educatorInstituteAffiliationStatus = pgEnum(
  "dena_educator_institute_affiliation_status",
  ["requested", "approved", "rejected", "withdrawn", "revoked"],
);
export const educatorInstituteAffiliationEventKind = pgEnum(
  "dena_educator_institute_affiliation_event_kind",
  ["requested", "approved", "rejected", "withdrawn", "revoked"],
);

/** Institution-specific acceptance for an independent educator. It does not
 * grant the global provider role, a verified entity, or course access. */
export const educatorInstituteAffiliations = pgTable(
  "dena_educator_institute_affiliations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    educatorProfileId: uuid("educator_profile_id").notNull()
      .references(() => independentEducatorProfiles.id, { onDelete: "restrict" }),
    instituteId: uuid("institute_id").notNull()
      .references(() => verifiedEntities.id, { onDelete: "restrict" }),
    requestedByUserId: uuid("requested_by_user_id").notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    clientRequestId: uuid("client_request_id").notNull(),
    displayNameSnapshot: text("display_name_snapshot").notNull(),
    statement: text("statement").notNull(),
    status: educatorInstituteAffiliationStatus("status")
      .notNull().default("requested"),
    reviewedByUserId: uuid("reviewed_by_user_id")
      .references(() => user.id, { onDelete: "restrict" }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    decisionReason: text("decision_reason"),
    withdrawnAt: timestamp("withdrawn_at", { withTimezone: true }),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("dena_educator_affiliation_request_uidx")
      .on(table.educatorProfileId, table.clientRequestId),
    uniqueIndex("dena_educator_affiliation_active_uidx")
      .on(table.educatorProfileId, table.instituteId)
      .where(sql`status IN ('requested', 'approved')`),
    index("dena_educator_affiliation_profile_idx")
      .on(table.educatorProfileId, table.status, table.createdAt),
    index("dena_educator_affiliation_institute_idx")
      .on(table.instituteId, table.status, table.createdAt),
    check("dena_educator_affiliation_snapshot_ck", sql`
      char_length(display_name_snapshot) BETWEEN 3 AND 120
      AND btrim(display_name_snapshot) <> ''
      AND char_length(statement) BETWEEN 20 AND 500
      AND btrim(statement) <> ''
    `),
    check("dena_educator_affiliation_decision_reason_ck", sql`
      decision_reason IS NULL OR
      (char_length(decision_reason) BETWEEN 15 AND 500
        AND btrim(decision_reason) <> '')
    `),
    check("dena_educator_affiliation_state_ck", sql`
      (status = 'requested' AND reviewed_by_user_id IS NULL
        AND reviewed_at IS NULL AND decision_reason IS NULL
        AND withdrawn_at IS NULL AND ended_at IS NULL)
      OR (status = 'approved' AND reviewed_by_user_id IS NOT NULL
        AND reviewed_at IS NOT NULL AND decision_reason IS NOT NULL
        AND withdrawn_at IS NULL AND ended_at IS NULL)
      OR (status = 'rejected' AND reviewed_by_user_id IS NOT NULL
        AND reviewed_at IS NOT NULL AND decision_reason IS NOT NULL
        AND withdrawn_at IS NULL AND ended_at IS NULL)
      OR (status = 'withdrawn' AND reviewed_by_user_id IS NULL
        AND reviewed_at IS NULL AND decision_reason IS NULL
        AND withdrawn_at IS NOT NULL AND ended_at IS NULL)
      OR (status = 'revoked' AND reviewed_by_user_id IS NOT NULL
        AND reviewed_at IS NOT NULL AND decision_reason IS NOT NULL
        AND withdrawn_at IS NULL AND ended_at IS NOT NULL)
    `),
  ],
);

export const educatorInstituteAffiliationEvents = pgTable(
  "dena_educator_institute_affiliation_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    affiliationId: uuid("affiliation_id").notNull()
      .references(() => educatorInstituteAffiliations.id, { onDelete: "restrict" }),
    actorUserId: uuid("actor_user_id").notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    kind: educatorInstituteAffiliationEventKind("kind").notNull(),
    reason: text("reason"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull().defaultNow(),
  },
  (table) => [
    index("dena_educator_affiliation_events_idx")
      .on(table.affiliationId, table.createdAt),
    check("dena_educator_affiliation_event_reason_ck", sql`
      (kind = 'requested' AND reason IS NULL)
      OR (kind <> 'requested' AND reason IS NOT NULL
        AND char_length(reason) BETWEEN 15 AND 500 AND btrim(reason) <> '')
    `),
  ],
);

/**
 * Exam question ownership is attached to a bank. The Dena bank uses the fixed
 * system owner UUID below; every institute bank is owned by its verified
 * institute UUID. Exams will reference a bank, never copy questions across it.
 */
export const assessmentBankOwnerType = pgEnum(
  "dena_assessment_bank_owner_type", ["dena", "institute"],
);
export const DENA_ASSESSMENT_OWNER_ID = "00000000-0000-0000-0000-000000000001";
export const DENA_ASSESSMENT_BANK_ID = "00000000-0000-0000-0000-000000000002";

export const assessmentQuestionBanks = pgTable("dena_assessment_question_banks", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerType: assessmentBankOwnerType("owner_type").notNull(),
  ownerId: uuid("owner_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull().defaultNow(),
}, (table) => [
  uniqueIndex("dena_assessment_bank_owner_uidx").on(table.ownerType, table.ownerId),
  uniqueIndex("dena_assessment_bank_scope_uidx").on(
    table.id, table.ownerType, table.ownerId,
  ),
  index("dena_assessment_bank_owner_idx").on(table.ownerType, table.ownerId),
  check("dena_assessment_bank_owner_ck", sql`
    (owner_type = 'dena' AND owner_id = '00000000-0000-0000-0000-000000000001'::uuid)
    OR (owner_type = 'institute' AND owner_id <> '00000000-0000-0000-0000-000000000001'::uuid)
  `),
]);

/** Institute questions and Dena questions live in distinct owner-scoped banks.
 * The duplicated owner key and composite FK prevent attaching a question to a
 * bank belonging to a different institute. Dena questions never reference an
 * institute course or lesson. */
export const assessmentQuestionBankQuestions = pgTable(
  "dena_assessment_question_bank_questions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    bankId: uuid("bank_id").notNull(),
    ownerType: assessmentBankOwnerType("owner_type").notNull(),
    ownerId: uuid("owner_id").notNull(),
    courseId: uuid("course_id"),
    lessonAssetId: uuid("lesson_asset_id"),
    prompt: text("prompt").notNull(),
    option0: text("option_0").notNull(),
    option1: text("option_1").notNull(),
    option2: text("option_2").notNull(),
    option3: text("option_3").notNull(),
    correctOption: integer("correct_option").notNull(),
    createdByUserId: uuid("created_by_user_id").notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("dena_assessment_bank_question_id_scope_uidx").on(
      table.id, table.bankId, table.ownerType, table.ownerId,
    ),
    index("dena_assessment_bank_question_list_idx").on(
      table.bankId, table.createdAt, table.id,
    ),
    foreignKey({
      columns: [table.bankId, table.ownerType, table.ownerId],
      foreignColumns: [assessmentQuestionBanks.id,
        assessmentQuestionBanks.ownerType, assessmentQuestionBanks.ownerId],
      name: "dena_assessment_bank_question_bank_scope_fk",
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.courseId, table.ownerId],
      foreignColumns: [courses.id, courses.responsibleInstituteId],
      name: "dena_assessment_bank_question_course_scope_fk",
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.lessonAssetId, table.courseId],
      foreignColumns: [privateMediaAssets.id, privateMediaAssets.courseId],
      name: "dena_assessment_bank_question_lesson_scope_fk",
    }).onDelete("restrict"),
    check("dena_assessment_bank_question_owner_ck", sql`
      (owner_type = 'dena'
        AND owner_id = '00000000-0000-0000-0000-000000000001'::uuid
        AND course_id IS NULL AND lesson_asset_id IS NULL)
      OR (owner_type = 'institute'
        AND owner_id <> '00000000-0000-0000-0000-000000000001'::uuid
        AND course_id IS NOT NULL AND lesson_asset_id IS NOT NULL)
    `),
    check("dena_assessment_bank_question_bounds_ck", sql`
      char_length(prompt) BETWEEN 10 AND 500 AND btrim(prompt) <> ''
      AND char_length(option_0) BETWEEN 1 AND 160 AND btrim(option_0) <> ''
      AND char_length(option_1) BETWEEN 1 AND 160 AND btrim(option_1) <> ''
      AND char_length(option_2) BETWEEN 1 AND 160 AND btrim(option_2) <> ''
      AND char_length(option_3) BETWEEN 1 AND 160 AND btrim(option_3) <> ''
      AND correct_option BETWEEN 0 AND 3
    `),
  ],
);

/** Two examination products share a schedule model but cannot change tenant:
 * institute_planned uses that institute's bank; dena_coordinated uses Dena's. */
export const assessmentExamType = pgEnum("dena_assessment_exam_type", [
  "institute_planned", "dena_coordinated",
]);
export const assessmentExamStatus = pgEnum("dena_assessment_exam_status", [
  "draft", "published", "cancelled",
]);
export const assessmentExams = pgTable("dena_assessment_exams", {
  id: uuid("id").primaryKey().defaultRandom(),
  examType: assessmentExamType("exam_type").notNull(),
  ownerType: assessmentBankOwnerType("owner_type").notNull(),
  ownerId: uuid("owner_id").notNull(),
  bankId: uuid("bank_id").notNull(),
  courseId: uuid("course_id"),
  title: text("title").notNull(),
  instructions: text("instructions").notNull(),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
  durationMinutes: integer("duration_minutes").notNull(),
  attemptLimit: integer("attempt_limit").notNull().default(1),
  status: assessmentExamStatus("status").notNull().default("draft"),
  createdByUserId: uuid("created_by_user_id").notNull()
    .references(() => user.id, { onDelete: "restrict" }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull().defaultNow(),
}, (table) => [
  uniqueIndex("dena_assessment_exam_scope_uidx").on(
    table.id, table.bankId, table.ownerType, table.ownerId,
  ),
  index("dena_assessment_exam_owner_schedule_idx").on(
    table.ownerType, table.ownerId, table.startsAt, table.id,
  ),
  index("dena_assessment_exam_status_idx").on(table.examType, table.status, table.startsAt),
  foreignKey({
    columns: [table.bankId, table.ownerType, table.ownerId],
    foreignColumns: [assessmentQuestionBanks.id,
      assessmentQuestionBanks.ownerType, assessmentQuestionBanks.ownerId],
    name: "dena_assessment_exam_bank_scope_fk",
  }).onDelete("restrict"),
  foreignKey({
    columns: [table.courseId, table.ownerId],
    foreignColumns: [courses.id, courses.responsibleInstituteId],
    name: "dena_assessment_exam_course_scope_fk",
  }).onDelete("restrict"),
  check("dena_assessment_exam_type_scope_ck", sql`
    (exam_type = 'institute_planned' AND owner_type = 'institute'
      AND owner_id <> '00000000-0000-0000-0000-000000000001'::uuid
      AND course_id IS NOT NULL)
    OR (exam_type = 'dena_coordinated' AND owner_type = 'dena'
      AND owner_id = '00000000-0000-0000-0000-000000000001'::uuid
      AND course_id IS NULL)
  `),
  check("dena_assessment_exam_title_ck", sql`
    char_length(title) BETWEEN 3 AND 160 AND btrim(title) <> ''
  `),
  check("dena_assessment_exam_instructions_ck", sql`
    char_length(instructions) BETWEEN 1 AND 2000 AND btrim(instructions) <> ''
  `),
  check("dena_assessment_exam_schedule_ck", sql`
    ends_at > starts_at
    AND duration_minutes BETWEEN 5 AND 300
    AND attempt_limit BETWEEN 1 AND 20
  `),
]);

/** Question versions are snapshotted into the exam so later bank edits cannot
 * silently change a published exam or its result key. Composite scope FKs make
 * cross-bank and cross-institute question selection impossible. */
export const assessmentExamQuestions = pgTable("dena_assessment_exam_questions", {
  id: uuid("id").primaryKey().defaultRandom(),
  examId: uuid("exam_id").notNull(),
  bankId: uuid("bank_id").notNull(),
  ownerType: assessmentBankOwnerType("owner_type").notNull(),
  ownerId: uuid("owner_id").notNull(),
  bankQuestionId: uuid("bank_question_id").notNull(),
  position: integer("position").notNull(),
  prompt: text("prompt").notNull(),
  option0: text("option_0").notNull(),
  option1: text("option_1").notNull(),
  option2: text("option_2").notNull(),
  option3: text("option_3").notNull(),
  correctOption: integer("correct_option").notNull(),
  points: integer("points").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull().defaultNow(),
}, (table) => [
  uniqueIndex("dena_assessment_exam_question_position_uidx").on(
    table.examId, table.position,
  ),
  uniqueIndex("dena_assessment_exam_question_id_exam_uidx").on(
    table.id, table.examId,
  ),
  uniqueIndex("dena_assessment_exam_question_source_uidx").on(
    table.examId, table.bankQuestionId,
  ),
  index("dena_assessment_exam_question_bank_idx").on(
    table.bankId, table.bankQuestionId,
  ),
  foreignKey({
    columns: [table.examId, table.bankId, table.ownerType, table.ownerId],
    foreignColumns: [assessmentExams.id, assessmentExams.bankId,
      assessmentExams.ownerType, assessmentExams.ownerId],
    name: "dena_assessment_exam_question_exam_scope_fk",
  }).onDelete("cascade"),
  foreignKey({
    columns: [table.bankQuestionId, table.bankId, table.ownerType, table.ownerId],
    foreignColumns: [assessmentQuestionBankQuestions.id,
      assessmentQuestionBankQuestions.bankId,
      assessmentQuestionBankQuestions.ownerType,
      assessmentQuestionBankQuestions.ownerId],
    name: "dena_assessment_exam_question_bank_scope_fk",
  }).onDelete("restrict"),
  check("dena_assessment_exam_question_values_ck", sql`
    position BETWEEN 0 AND 299
    AND points BETWEEN 1 AND 100
    AND char_length(prompt) BETWEEN 10 AND 500 AND btrim(prompt) <> ''
    AND char_length(option_0) BETWEEN 1 AND 160 AND btrim(option_0) <> ''
    AND char_length(option_1) BETWEEN 1 AND 160 AND btrim(option_1) <> ''
    AND char_length(option_2) BETWEEN 1 AND 160 AND btrim(option_2) <> ''
    AND char_length(option_3) BETWEEN 1 AND 160 AND btrim(option_3) <> ''
    AND correct_option BETWEEN 0 AND 3
  `),
]);

export const assessmentExamAttemptStatus = pgEnum(
  "dena_assessment_exam_attempt_status",
  ["in_progress", "submitted", "expired"],
);
export const assessmentExamAttempts = pgTable("dena_assessment_exam_attempts", {
  id: uuid("id").primaryKey().defaultRandom(),
  examId: uuid("exam_id").notNull(),
  studentUserId: uuid("student_user_id").notNull()
    .references(() => user.id, { onDelete: "restrict" }),
  attemptNumber: integer("attempt_number").notNull(),
  status: assessmentExamAttemptStatus("status").notNull().default("in_progress"),
  questionCount: integer("question_count").notNull(),
  correctCount: integer("correct_count"),
  totalPoints: integer("total_points"),
  earnedPoints: integer("earned_points"),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  deadlineAt: timestamp("deadline_at", { withTimezone: true }).notNull(),
  submittedAt: timestamp("submitted_at", { withTimezone: true }),
}, (table) => [
  uniqueIndex("dena_assessment_exam_attempt_id_scope_uidx").on(
    table.id, table.examId, table.studentUserId,
  ),
  uniqueIndex("dena_assessment_exam_attempt_number_uidx").on(
    table.examId, table.studentUserId, table.attemptNumber,
  ),
  index("dena_assessment_exam_attempt_student_idx").on(
    table.studentUserId, table.status, table.startedAt,
  ),
  foreignKey({
    columns: [table.examId],
    foreignColumns: [assessmentExams.id],
    name: "dena_assessment_exam_attempt_exam_fk",
  }).onDelete("restrict"),
  check("dena_assessment_exam_attempt_values_ck", sql.raw(
    "(attempt_number BETWEEN 1 AND 20) AND (question_count BETWEEN 1 AND 300) " +
    "AND (deadline_at > started_at) " +
    "AND (correct_count IS NULL OR correct_count BETWEEN 0 AND question_count) " +
    "AND (total_points IS NULL OR total_points BETWEEN 1 AND 30000) " +
    "AND (earned_points IS NULL OR earned_points BETWEEN 0 AND total_points)",
  )),
  check("dena_assessment_exam_attempt_state_ck", sql.raw(
    "(status = 'in_progress' AND submitted_at IS NULL AND correct_count IS NULL " +
    "AND total_points IS NULL AND earned_points IS NULL) OR " +
    "(status IN ('submitted', 'expired') AND submitted_at IS NOT NULL " +
    "AND correct_count IS NOT NULL AND total_points IS NOT NULL " +
    "AND earned_points IS NOT NULL)",
  )),
]);

export const assessmentExamAttemptAnswers = pgTable(
  "dena_assessment_exam_attempt_answers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    attemptId: uuid("attempt_id").notNull(),
    examId: uuid("exam_id").notNull(),
    studentUserId: uuid("student_user_id").notNull(),
    examQuestionId: uuid("exam_question_id").notNull(),
    selectedOption: integer("selected_option"),
    answeredAt: timestamp("answered_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("dena_assessment_exam_attempt_answer_uidx").on(
      table.attemptId, table.examQuestionId,
    ),
    index("dena_assessment_exam_attempt_answer_exam_idx").on(
      table.examId, table.examQuestionId,
    ),
    foreignKey({
      columns: [table.attemptId, table.examId, table.studentUserId],
      foreignColumns: [assessmentExamAttempts.id, assessmentExamAttempts.examId,
        assessmentExamAttempts.studentUserId],
      name: "dena_assessment_exam_attempt_answer_attempt_scope_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.examQuestionId, table.examId],
      foreignColumns: [assessmentExamQuestions.id, assessmentExamQuestions.examId],
      name: "dena_assessment_exam_attempt_answer_question_scope_fk",
    }).onDelete("restrict"),
    check("dena_assessment_exam_attempt_answer_option_ck", sql.raw(
      "(selected_option IS NULL AND answered_at IS NULL) OR " +
      "(selected_option BETWEEN 0 AND 3 AND answered_at IS NOT NULL)",
    )),
  ],
);

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

/** Minimal security/administrative event metadata. Application flows insert
 * rows only; operational DB permissions must deny UPDATE/DELETE in production.
 */
export const auditEntityType = pgEnum("dena_audit_entity_type", [
  "SYSTEM", "USER", "COURSE", "PRACTICE", "MEDIA", "ROLE_APPLICATION",
  "ORGANIZATION_STUDENT", "ORGANIZATION_API_KEY", "ASSESSMENT_QUESTION",
  "ASSESSMENT_EXAM", "INSTITUTE_SERVICE", "SERVICE_ORDER",
  "PROVIDER_COLLABORATION", "EDUCATOR_AFFILIATION",
]);
export const auditLogs = pgTable("dena_audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  actorId: uuid("actor_id").notNull().references(() => user.id, {
    onDelete: "restrict",
  }),
  actorRole: denaRole("actor_role").notNull(),
  action: text("action").notNull(),
  entityType: auditEntityType("entity_type").notNull(),
  entityId: uuid("entity_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("dena_audit_logs_created_at_idx").on(table.createdAt),
  index("dena_audit_logs_actor_idx").on(table.actorId, table.createdAt),
  check("dena_audit_action_ck", sql`
    char_length(action) BETWEEN 1 AND 120
    AND action ~ '^[a-z0-9_.:-]+$'
  `),
]);

/** A roster record is scoped to exactly one organization. Private identity
 * fields stay here, while authentication remains with the shared phone OTP
 * user account. National code is encrypted and indexed only by a tenant HMAC.
 */
export const organizationStudents = pgTable("dena_organization_students", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull()
    .references(() => verifiedEntities.id, { onDelete: "restrict" }),
  userId: uuid("user_id").notNull().references(() => user.id, { onDelete: "restrict" }),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  nationalCodeCiphertext: text("national_code_ciphertext").notNull(),
  nationalCodeHash: text("national_code_hash").notNull(),
  birthDate: date("birth_date", { mode: "string" }).notNull(),
  nationalCodeLast4: text("national_code_last4").notNull(),
  gender: text("gender").notNull(),
  email: text("email"),
  createdByUserId: uuid("created_by_user_id").notNull()
    .references(() => user.id, { onDelete: "restrict" }),
  guardianConsentConfirmedAt: timestamp("guardian_consent_confirmed_at", { withTimezone: true }),
  guardianConsentConfirmedByUserId: uuid("guardian_consent_confirmed_by_user_id")
    .references(() => user.id, { onDelete: "restrict" }),
  source: text("source").notNull().default("manual"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("dena_org_student_scope_user_uidx").on(table.organizationId, table.userId),
  uniqueIndex("dena_org_student_scope_national_code_uidx").on(
    table.organizationId, table.nationalCodeHash,
  ),
  index("dena_org_students_scope_created_idx").on(table.organizationId, table.createdAt),
  check("dena_org_student_name_ck", sql`
    char_length(first_name) BETWEEN 1 AND 80 AND char_length(last_name) BETWEEN 1 AND 100
  `),
  check("dena_org_student_national_code_last4_ck", sql`national_code_last4 ~ '^\\d{4}$'`),
  check("dena_org_student_gender_ck", sql`gender IN ('female', 'male', 'prefer_not_to_say')`),
  check("dena_org_student_source_ck", sql`source IN ('manual', 'bulk', 'api')`),
]);

export const organizationApiKeys = pgTable("dena_organization_api_keys", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull()
    .references(() => verifiedEntities.id, { onDelete: "restrict" }),
  secretHash: text("secret_hash").notNull().unique(),
  prefix: text("prefix").notNull(),
  label: text("label").notNull(),
  createdByUserId: uuid("created_by_user_id").notNull()
    .references(() => user.id, { onDelete: "restrict" }),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  rotatedFromKeyId: uuid("rotated_from_key_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("dena_org_api_keys_scope_active_idx").on(table.organizationId, table.revokedAt),
  check("dena_org_api_key_label_ck", sql`char_length(label) BETWEEN 1 AND 80`),
  check("dena_org_api_key_prefix_ck", sql`prefix ~ '^dena_org_[A-Za-z0-9_-]{8}$'`),
]);

/** Shared platform-support threads. Access is controlled by the requester or
 * an active admin membership explicitly enabled for technical support. */
export const technicalSupportTickets = pgTable("dena_technical_support_tickets", {
  id: uuid("id").primaryKey().defaultRandom(),
  requesterUserId: uuid("requester_user_id").notNull()
    .references(() => user.id, { onDelete: "restrict" }),
  assignedToUserId: uuid("assigned_to_user_id")
    .references(() => user.id, { onDelete: "restrict" }),
  subject: text("subject").notNull(),
  status: text("status").notNull().default("new"),
  priority: text("priority").notNull().default("normal"),
  firstResponseDueAt: timestamp("first_response_due_at", { withTimezone: true }).notNull(),
  resolutionDueAt: timestamp("resolution_due_at", { withTimezone: true }).notNull(),
  resolutionPausedAt: timestamp("resolution_paused_at", { withTimezone: true }),
  firstRespondedAt: timestamp("first_responded_at", { withTimezone: true }),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  closedAt: timestamp("closed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("dena_support_ticket_requester_updated_idx").on(
    table.requesterUserId, table.updatedAt,
  ),
  index("dena_support_ticket_updated_idx").on(table.updatedAt),
  index("dena_support_ticket_assignment_status_idx").on(
    table.assignedToUserId, table.status,
  ),
  index("dena_support_ticket_priority_status_idx").on(table.priority, table.status),
  check("dena_support_ticket_subject_ck", sql`
    char_length(subject) BETWEEN 3 AND 120
  `),
  check("dena_support_ticket_status_ck", sql`
    status IN ('new', 'in_progress', 'waiting_requester', 'resolved', 'closed')
  `),
  check("dena_support_ticket_priority_ck", sql`
    priority IN ('low', 'normal', 'high', 'urgent')
  `),
  check("dena_support_ticket_dates_ck", sql`
    (status = 'closed' AND closed_at IS NOT NULL)
    OR (status <> 'closed' AND closed_at IS NULL)
  `),
]);

export const technicalSupportNotifications = pgTable("dena_technical_support_notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
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
