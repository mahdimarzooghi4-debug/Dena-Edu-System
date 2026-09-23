CREATE TYPE "public"."dena_processing_job_status" AS ENUM('queued', 'leased', 'done', 'dead');--> statement-breakpoint
CREATE TABLE "dena_media_processing_jobs" (
  "upload_id" uuid PRIMARY KEY NOT NULL,
  "status" "dena_processing_job_status" DEFAULT 'queued' NOT NULL,
  "attempts" integer DEFAULT 0 NOT NULL,
  "lease_token" uuid,
  "lease_until" timestamp with time zone,
  "next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
  "last_error" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "dena_processing_attempts_ck" CHECK (attempts >= 0 AND attempts <= 5),
  CONSTRAINT "dena_processing_lease_ck" CHECK (
    (status = 'leased' AND lease_token IS NOT NULL AND lease_until IS NOT NULL)
    OR (status <> 'leased' AND lease_token IS NULL AND lease_until IS NULL)
  )
);--> statement-breakpoint
ALTER TABLE "dena_media_processing_jobs" ADD CONSTRAINT "dena_media_processing_jobs_upload_id_dena_media_ingests_id_fk" FOREIGN KEY ("upload_id") REFERENCES "public"."dena_media_ingests"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "dena_processing_claim_idx" ON "dena_media_processing_jobs" USING btree ("status","next_attempt_at");
