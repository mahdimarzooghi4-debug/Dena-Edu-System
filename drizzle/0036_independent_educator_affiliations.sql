CREATE TYPE "public"."dena_educator_institute_affiliation_event_kind" AS ENUM('requested', 'approved', 'rejected', 'withdrawn', 'revoked');--> statement-breakpoint
CREATE TYPE "public"."dena_educator_institute_affiliation_status" AS ENUM('requested', 'approved', 'rejected', 'withdrawn', 'revoked');--> statement-breakpoint
ALTER TYPE "public"."dena_audit_entity_type" ADD VALUE 'EDUCATOR_AFFILIATION';--> statement-breakpoint
CREATE TABLE "dena_educator_institute_affiliation_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"affiliation_id" uuid NOT NULL,
	"actor_user_id" uuid NOT NULL,
	"kind" "dena_educator_institute_affiliation_event_kind" NOT NULL,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "dena_educator_affiliation_event_reason_ck" CHECK (
      (kind = 'requested' AND reason IS NULL)
      OR (kind <> 'requested' AND reason IS NOT NULL
        AND char_length(reason) BETWEEN 15 AND 500 AND btrim(reason) <> '')
    )
);
--> statement-breakpoint
CREATE TABLE "dena_educator_institute_affiliations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"educator_profile_id" uuid NOT NULL,
	"institute_id" uuid NOT NULL,
	"requested_by_user_id" uuid NOT NULL,
	"client_request_id" uuid NOT NULL,
	"display_name_snapshot" text NOT NULL,
	"statement" text NOT NULL,
	"status" "dena_educator_institute_affiliation_status" DEFAULT 'requested' NOT NULL,
	"reviewed_by_user_id" uuid,
	"reviewed_at" timestamp with time zone,
	"decision_reason" text,
	"withdrawn_at" timestamp with time zone,
	"ended_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "dena_educator_affiliation_snapshot_ck" CHECK (
      char_length(display_name_snapshot) BETWEEN 3 AND 120
      AND btrim(display_name_snapshot) <> ''
      AND char_length(statement) BETWEEN 20 AND 500
      AND btrim(statement) <> ''
    ),
	CONSTRAINT "dena_educator_affiliation_decision_reason_ck" CHECK (
      decision_reason IS NULL OR
      (char_length(decision_reason) BETWEEN 15 AND 500
        AND btrim(decision_reason) <> '')
    ),
	CONSTRAINT "dena_educator_affiliation_state_ck" CHECK (
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
    )
);
--> statement-breakpoint
CREATE TABLE "dena_independent_educator_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"display_name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "dena_independent_educator_profiles_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "dena_independent_educator_display_name_ck" CHECK (
      char_length(display_name) BETWEEN 3 AND 120 AND btrim(display_name) <> ''
    )
);
--> statement-breakpoint
ALTER TABLE "dena_educator_institute_affiliation_events" ADD CONSTRAINT "dena_educator_institute_affiliation_events_affiliation_id_dena_educator_institute_affiliations_id_fk" FOREIGN KEY ("affiliation_id") REFERENCES "public"."dena_educator_institute_affiliations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dena_educator_institute_affiliation_events" ADD CONSTRAINT "dena_educator_institute_affiliation_events_actor_user_id_user_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dena_educator_institute_affiliations" ADD CONSTRAINT "dena_educator_institute_affiliations_educator_profile_id_dena_independent_educator_profiles_id_fk" FOREIGN KEY ("educator_profile_id") REFERENCES "public"."dena_independent_educator_profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dena_educator_institute_affiliations" ADD CONSTRAINT "dena_educator_institute_affiliations_institute_id_dena_verified_entities_id_fk" FOREIGN KEY ("institute_id") REFERENCES "public"."dena_verified_entities"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dena_educator_institute_affiliations" ADD CONSTRAINT "dena_educator_institute_affiliations_requested_by_user_id_user_id_fk" FOREIGN KEY ("requested_by_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dena_educator_institute_affiliations" ADD CONSTRAINT "dena_educator_institute_affiliations_reviewed_by_user_id_user_id_fk" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dena_independent_educator_profiles" ADD CONSTRAINT "dena_independent_educator_profiles_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "dena_educator_affiliation_events_idx" ON "dena_educator_institute_affiliation_events" USING btree ("affiliation_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "dena_educator_affiliation_request_uidx" ON "dena_educator_institute_affiliations" USING btree ("educator_profile_id","client_request_id");--> statement-breakpoint
CREATE UNIQUE INDEX "dena_educator_affiliation_active_uidx" ON "dena_educator_institute_affiliations" USING btree ("educator_profile_id","institute_id") WHERE status IN ('requested', 'approved');--> statement-breakpoint
CREATE INDEX "dena_educator_affiliation_profile_idx" ON "dena_educator_institute_affiliations" USING btree ("educator_profile_id","status","created_at");--> statement-breakpoint
CREATE INDEX "dena_educator_affiliation_institute_idx" ON "dena_educator_institute_affiliations" USING btree ("institute_id","status","created_at");