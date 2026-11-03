ALTER TABLE "dena_institute_service_calls" DROP CONSTRAINT "dena_institute_service_call_state_ck";--> statement-breakpoint
ALTER TABLE "dena_institute_service_calls" ADD COLUMN "no_show_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "dena_institute_service_calls" ADD COLUMN "no_show_by_user_id" uuid;--> statement-breakpoint
ALTER TABLE "dena_institute_service_calls" ADD CONSTRAINT "dena_institute_service_calls_no_show_by_user_id_user_id_fk" FOREIGN KEY ("no_show_by_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dena_institute_service_calls" ADD CONSTRAINT "dena_institute_service_call_state_ck" CHECK (
    (status = 'scheduled' AND started_at IS NULL AND ended_at IS NULL
      AND no_show_at IS NULL AND no_show_by_user_id IS NULL)
    OR (status = 'started' AND started_at IS NOT NULL AND ended_at IS NULL
      AND no_show_at IS NULL AND no_show_by_user_id IS NULL)
    OR (status = 'ended' AND started_at IS NOT NULL AND ended_at >= started_at
      AND no_show_at IS NULL AND no_show_by_user_id IS NULL)
    OR (status = 'cancelled' AND started_at IS NULL AND ended_at IS NULL
      AND ((no_show_at IS NULL AND no_show_by_user_id IS NULL)
        OR (no_show_at IS NOT NULL AND no_show_by_user_id IS NOT NULL)))
  );
