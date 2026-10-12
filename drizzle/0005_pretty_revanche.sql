CREATE TYPE "public"."dena_media_ingest_status" AS ENUM('reserved', 'uploading', 'quarantined', 'ready', 'rejected');--> statement-breakpoint
CREATE TABLE "dena_media_ingests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"asset_id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"course_id" uuid NOT NULL,
	"provider_id" uuid NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"request_id" uuid NOT NULL,
	"title" text NOT NULL,
	"expected_bytes" integer NOT NULL,
	"expected_sha256" text NOT NULL,
	"status" "dena_media_ingest_status" DEFAULT 'reserved' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"uploaded_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"rejection_reason" text,
	CONSTRAINT "dena_media_ingests_asset_id_unique" UNIQUE("asset_id"),
	CONSTRAINT "dena_ingest_bytes_ck" CHECK (
    expected_bytes >= 16 AND expected_bytes <= 8388608
  ),
	CONSTRAINT "dena_ingest_sha_ck" CHECK (
    expected_sha256 ~ '^[0-9a-f]{64}$'
  ),
	CONSTRAINT "dena_ingest_state_ck" CHECK (
    (status IN ('reserved', 'uploading') AND uploaded_at IS NULL
      AND completed_at IS NULL AND rejection_reason IS NULL)
    OR (status = 'quarantined' AND uploaded_at IS NOT NULL
      AND completed_at IS NULL AND rejection_reason IS NULL)
    OR (status = 'ready' AND uploaded_at IS NOT NULL
      AND completed_at IS NOT NULL AND rejection_reason IS NULL)
    OR (status = 'rejected' AND completed_at IS NOT NULL
      AND rejection_reason IS NOT NULL)
  )
);
--> statement-breakpoint
ALTER TABLE "dena_media_ingests" ADD CONSTRAINT "dena_media_ingests_course_id_dena_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."dena_courses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dena_media_ingests" ADD CONSTRAINT "dena_media_ingests_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "dena_ingest_course_request_uidx" ON "dena_media_ingests" USING btree ("course_id","request_id");--> statement-breakpoint
CREATE INDEX "dena_ingest_status_idx" ON "dena_media_ingests" USING btree ("status","created_at");