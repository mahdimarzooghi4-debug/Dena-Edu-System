ALTER TYPE "public"."dena_provider_institute_collaboration_event_kind" ADD VALUE 'provider_withdrew';--> statement-breakpoint
DROP INDEX "dena_provider_institute_collab_active_uidx";--> statement-breakpoint
ALTER TABLE "dena_provider_institute_collaborations" ADD COLUMN "withdrawn_at" timestamp with time zone;--> statement-breakpoint
CREATE UNIQUE INDEX "dena_provider_institute_collab_active_uidx" ON "dena_provider_institute_collaborations" USING btree ("provider_id","institute_id") WHERE status IN ('requested', 'awaiting_dena', 'approved') AND withdrawn_at IS NULL;--> statement-breakpoint
ALTER TABLE "dena_provider_institute_collaborations" ADD CONSTRAINT "dena_provider_institute_collab_withdrawal_ck" CHECK (
      withdrawn_at IS NULL OR (status = 'requested'
        AND institute_reviewed_by_user_id IS NULL AND institute_reviewed_at IS NULL
        AND institute_decision_reason IS NULL
        AND dena_reviewed_by_user_id IS NULL AND dena_reviewed_at IS NULL
        AND dena_decision_reason IS NULL)
    );