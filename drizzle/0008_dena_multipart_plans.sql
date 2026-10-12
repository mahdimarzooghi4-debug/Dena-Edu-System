CREATE TABLE "dena_media_multipart_plans" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "course_id" uuid NOT NULL,
  "provider_id" uuid NOT NULL,
  "created_by_user_id" uuid NOT NULL,
  "request_id" uuid NOT NULL,
  "title" text NOT NULL,
  "expected_bytes" bigint NOT NULL,
  "expected_sha256" text NOT NULL,
  "status" text DEFAULT 'planned' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  CONSTRAINT "dena_multipart_bytes_ck" CHECK (
    expected_bytes > 16777216 AND expected_bytes <= 5368709120
  ),
  CONSTRAINT "dena_multipart_sha_ck" CHECK (
    expected_sha256 ~ '^[0-9a-f]{64}$'
  ),
  CONSTRAINT "dena_multipart_status_ck" CHECK (
    status IN ('planned', 'expired')
  )
);--> statement-breakpoint
ALTER TABLE "dena_media_multipart_plans" ADD CONSTRAINT "dena_media_multipart_plans_course_id_dena_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."dena_courses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dena_media_multipart_plans" ADD CONSTRAINT "dena_media_multipart_plans_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "dena_multipart_course_request_uidx" ON "dena_media_multipart_plans" USING btree ("course_id","request_id");--> statement-breakpoint
CREATE INDEX "dena_multipart_status_expiry_idx" ON "dena_media_multipart_plans" USING btree ("status","expires_at");
