CREATE TABLE "dena_media_cleanup_jobs" (
  "upload_id" uuid PRIMARY KEY NOT NULL,
  "status" text DEFAULT 'pending' NOT NULL,
  "attempts" integer DEFAULT 0 NOT NULL,
  "lease_token" uuid,
  "lease_until" timestamp with time zone,
  "next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
  "completed_at" timestamp with time zone,
  "last_error" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "dena_cleanup_attempts_ck" CHECK (attempts >= 0 AND attempts <= 5),
  CONSTRAINT "dena_cleanup_state_ck" CHECK (
    (status = 'leased' AND lease_token IS NOT NULL
      AND lease_until IS NOT NULL AND completed_at IS NULL)
    OR (status IN ('pending', 'dead') AND lease_token IS NULL
      AND lease_until IS NULL AND completed_at IS NULL)
    OR (status = 'done' AND lease_token IS NULL
      AND lease_until IS NULL AND completed_at IS NOT NULL)
  )
);--> statement-breakpoint
ALTER TABLE "dena_media_cleanup_jobs" ADD CONSTRAINT "dena_media_cleanup_jobs_upload_id_dena_media_ingests_id_fk" FOREIGN KEY ("upload_id") REFERENCES "public"."dena_media_ingests"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "dena_cleanup_claim_idx" ON "dena_media_cleanup_jobs" USING btree ("status","next_attempt_at");
