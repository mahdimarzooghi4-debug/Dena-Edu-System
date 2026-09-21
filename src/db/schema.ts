import {
  boolean, check, index, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid,
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
}, (table) => [
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
  approvedByInstituteUserId: uuid("approved_by_institute_user_id").references(() => user.id),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
}, (table) => [
  check("dena_supervision_approved_ck", sql`
    status <> 'approved' OR
    (approved_by_institute_user_id IS NOT NULL AND approved_at IS NOT NULL)
  `),
  index("dena_supervision_institute_idx").on(table.instituteId, table.status),
]);
