ALTER TABLE "dena_provider_institute_collaborations" DROP CONSTRAINT "dena_provider_institute_collab_stage_ck";--> statement-breakpoint
ALTER TABLE "dena_provider_institute_collaborations" ADD CONSTRAINT "dena_provider_institute_collab_stage_ck" CHECK (
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
    );