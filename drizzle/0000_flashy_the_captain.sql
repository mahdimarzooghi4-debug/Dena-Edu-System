CREATE TYPE "public"."dena_role" AS ENUM('student', 'institute', 'provider', 'admin', 'organization', 'benefactor');--> statement-breakpoint
CREATE TYPE "public"."dena_membership_status" AS ENUM('active', 'suspended', 'revoked');--> statement-breakpoint
CREATE TYPE "public"."dena_supervision_status" AS ENUM('requested', 'approved', 'revoked');--> statement-breakpoint
CREATE TABLE "account" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"accountId" text NOT NULL,
	"providerId" text NOT NULL,
	"userId" uuid NOT NULL,
	"accessToken" text,
	"refreshToken" text,
	"idToken" text,
	"accessTokenExpiresAt" timestamp with time zone,
	"refreshTokenExpiresAt" timestamp with time zone,
	"scope" text,
	"password" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dena_courses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider_id" uuid NOT NULL,
	"responsible_institute_id" uuid NOT NULL,
	"title" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dena_memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "dena_role" NOT NULL,
	"institute_id" uuid,
	"provider_id" uuid,
	"organization_id" uuid,
	"benefactor_id" uuid,
	"can_handle_technical_support" boolean DEFAULT false NOT NULL,
	"status" "dena_membership_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "dena_membership_role_scope_ck" CHECK (
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
  )
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"expiresAt" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"ipAddress" text,
	"userAgent" text,
	"userId" uuid NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "dena_supervision_grants" (
	"course_id" uuid PRIMARY KEY NOT NULL,
	"provider_id" uuid NOT NULL,
	"institute_id" uuid NOT NULL,
	"status" "dena_supervision_status" DEFAULT 'requested' NOT NULL,
	"approved_by_institute_user_id" uuid,
	"approved_at" timestamp with time zone,
	CONSTRAINT "dena_supervision_approved_ck" CHECK (
    status <> 'approved' OR
    (approved_by_institute_user_id IS NOT NULL AND approved_at IS NOT NULL)
  )
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"emailVerified" boolean DEFAULT false NOT NULL,
	"image" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expiresAt" timestamp with time zone NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dena_memberships" ADD CONSTRAINT "dena_memberships_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dena_supervision_grants" ADD CONSTRAINT "dena_supervision_grants_course_id_dena_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."dena_courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dena_supervision_grants" ADD CONSTRAINT "dena_supervision_grants_approved_by_institute_user_id_user_id_fk" FOREIGN KEY ("approved_by_institute_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_user_idx" ON "account" USING btree ("userId");--> statement-breakpoint
CREATE UNIQUE INDEX "account_provider_account_uidx" ON "account" USING btree ("providerId","accountId");--> statement-breakpoint
CREATE INDEX "dena_courses_provider_idx" ON "dena_courses" USING btree ("provider_id");--> statement-breakpoint
CREATE INDEX "dena_courses_institute_idx" ON "dena_courses" USING btree ("responsible_institute_id");--> statement-breakpoint
CREATE INDEX "dena_memberships_active_user_idx" ON "dena_memberships" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "session_user_idx" ON "session" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "dena_supervision_institute_idx" ON "dena_supervision_grants" USING btree ("institute_id","status");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");