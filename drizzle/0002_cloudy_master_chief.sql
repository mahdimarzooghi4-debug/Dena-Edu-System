CREATE TYPE "public"."dena_elevated_role" AS ENUM('institute', 'provider', 'organization', 'benefactor');--> statement-breakpoint
CREATE TYPE "public"."dena_role_application_event_kind" AS ENUM('submitted', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."dena_role_application_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TABLE "dena_role_application_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"actor_user_id" uuid NOT NULL,
	"kind" "dena_role_application_event_kind" NOT NULL,
	"assigned_scope_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dena_role_applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"requested_role" "dena_elevated_role" NOT NULL,
	"proposed_name" text NOT NULL,
	"statement" text NOT NULL,
	"status" "dena_role_application_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reviewed_at" timestamp with time zone,
	"reviewer_user_id" uuid,
	"decision_reason" text,
	"assigned_scope_id" uuid,
	CONSTRAINT "dena_role_application_review_ck" CHECK (
    (status = 'pending' AND reviewed_at IS NULL AND reviewer_user_id IS NULL
      AND decision_reason IS NULL AND assigned_scope_id IS NULL)
    OR
    (status = 'rejected' AND reviewed_at IS NOT NULL AND reviewer_user_id IS NOT NULL
      AND decision_reason IS NOT NULL AND assigned_scope_id IS NULL)
    OR
    (status = 'approved' AND reviewed_at IS NOT NULL AND reviewer_user_id IS NOT NULL
      AND decision_reason IS NOT NULL AND assigned_scope_id IS NOT NULL)
  )
);
--> statement-breakpoint
CREATE TABLE "dena_verified_entities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"role" "dena_elevated_role" NOT NULL,
	"name" text NOT NULL,
	"evidence_reference" text NOT NULL,
	"verified_by_user_id" uuid NOT NULL,
	"verified_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "dena_role_application_events" ADD CONSTRAINT "dena_role_application_events_application_id_dena_role_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."dena_role_applications"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dena_role_application_events" ADD CONSTRAINT "dena_role_application_events_actor_user_id_user_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dena_role_application_events" ADD CONSTRAINT "dena_role_application_events_assigned_scope_id_dena_verified_entities_id_fk" FOREIGN KEY ("assigned_scope_id") REFERENCES "public"."dena_verified_entities"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dena_role_applications" ADD CONSTRAINT "dena_role_applications_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dena_role_applications" ADD CONSTRAINT "dena_role_applications_reviewer_user_id_user_id_fk" FOREIGN KEY ("reviewer_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dena_role_applications" ADD CONSTRAINT "dena_role_applications_assigned_scope_id_dena_verified_entities_id_fk" FOREIGN KEY ("assigned_scope_id") REFERENCES "public"."dena_verified_entities"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dena_verified_entities" ADD CONSTRAINT "dena_verified_entities_verified_by_user_id_user_id_fk" FOREIGN KEY ("verified_by_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "dena_role_events_application_idx" ON "dena_role_application_events" USING btree ("application_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "dena_role_applicant_role_uidx" ON "dena_role_applications" USING btree ("user_id","requested_role");--> statement-breakpoint
CREATE INDEX "dena_role_review_queue_idx" ON "dena_role_applications" USING btree ("status","created_at");