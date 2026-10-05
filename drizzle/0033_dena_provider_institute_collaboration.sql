CREATE TYPE "public"."dena_provider_institute_collaboration_event_kind" AS ENUM('requested', 'institute_approved', 'institute_rejected', 'dena_approved', 'dena_rejected');--> statement-breakpoint
CREATE TYPE "public"."dena_provider_institute_collaboration_status" AS ENUM('requested', 'awaiting_dena', 'approved', 'institute_rejected', 'dena_rejected');--> statement-breakpoint
ALTER TYPE "public"."dena_audit_entity_type" ADD VALUE 'PROVIDER_COLLABORATION';--> statement-breakpoint
CREATE TABLE "dena_provider_institute_collaboration_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"collaboration_id" uuid NOT NULL,
	"actor_user_id" uuid NOT NULL,
	"kind" "dena_provider_institute_collaboration_event_kind" NOT NULL,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "dena_provider_institute_collab_event_reason_ck" CHECK (
      (kind = 'requested' AND reason IS NULL)
      OR (kind <> 'requested' AND reason IS NOT NULL)
    )
);
--> statement-breakpoint
CREATE TABLE "dena_provider_institute_collaborations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider_id" uuid NOT NULL,
	"institute_id" uuid NOT NULL,
	"requested_by_user_id" uuid NOT NULL,
	"client_request_id" uuid NOT NULL,
	"status" "dena_provider_institute_collaboration_status" DEFAULT 'requested' NOT NULL,
	"institute_reviewed_by_user_id" uuid,
	"institute_reviewed_at" timestamp with time zone,
	"institute_decision_reason" text,
	"dena_reviewed_by_user_id" uuid,
	"dena_reviewed_at" timestamp with time zone,
	"dena_decision_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "dena_provider_institute_collab_distinct_scopes_ck" CHECK (provider_id <> institute_id),
	CONSTRAINT "dena_provider_institute_collab_stage_ck" CHECK (
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
        AND dena_reviewed_by_user_id IS NOT NULL AND dena_reviewed_at IS NOT NULL)
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
    )
);
--> statement-breakpoint
ALTER TABLE "dena_provider_institute_collaboration_events" ADD CONSTRAINT "dena_provider_institute_collaboration_events_collaboration_id_dena_provider_institute_collaborations_id_fk" FOREIGN KEY ("collaboration_id") REFERENCES "public"."dena_provider_institute_collaborations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dena_provider_institute_collaboration_events" ADD CONSTRAINT "dena_provider_institute_collaboration_events_actor_user_id_user_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dena_provider_institute_collaborations" ADD CONSTRAINT "dena_provider_institute_collaborations_provider_id_dena_verified_entities_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."dena_verified_entities"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dena_provider_institute_collaborations" ADD CONSTRAINT "dena_provider_institute_collaborations_institute_id_dena_verified_entities_id_fk" FOREIGN KEY ("institute_id") REFERENCES "public"."dena_verified_entities"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dena_provider_institute_collaborations" ADD CONSTRAINT "dena_provider_institute_collaborations_requested_by_user_id_user_id_fk" FOREIGN KEY ("requested_by_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dena_provider_institute_collaborations" ADD CONSTRAINT "dena_provider_institute_collaborations_institute_reviewed_by_user_id_user_id_fk" FOREIGN KEY ("institute_reviewed_by_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dena_provider_institute_collaborations" ADD CONSTRAINT "dena_provider_institute_collaborations_dena_reviewed_by_user_id_user_id_fk" FOREIGN KEY ("dena_reviewed_by_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "dena_provider_institute_collab_events_idx" ON "dena_provider_institute_collaboration_events" USING btree ("collaboration_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "dena_provider_institute_collab_request_uidx" ON "dena_provider_institute_collaborations" USING btree ("provider_id","client_request_id");--> statement-breakpoint
CREATE UNIQUE INDEX "dena_provider_institute_collab_active_uidx" ON "dena_provider_institute_collaborations" USING btree ("provider_id","institute_id") WHERE status IN ('requested', 'awaiting_dena', 'approved');--> statement-breakpoint
CREATE INDEX "dena_provider_institute_collab_provider_idx" ON "dena_provider_institute_collaborations" USING btree ("provider_id","status");--> statement-breakpoint
CREATE INDEX "dena_provider_institute_collab_institute_idx" ON "dena_provider_institute_collaborations" USING btree ("institute_id","status");