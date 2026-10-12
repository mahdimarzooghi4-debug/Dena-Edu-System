CREATE TYPE "public"."dena_course_publication_status" AS ENUM('draft', 'published', 'archived');--> statement-breakpoint
CREATE TYPE "public"."dena_enrollment_status" AS ENUM('active', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."dena_media_asset_status" AS ENUM('ready', 'withdrawn');--> statement-breakpoint
CREATE TABLE "dena_private_media_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" uuid NOT NULL,
	"title" text NOT NULL,
	"object_key" text NOT NULL,
	"status" "dena_media_asset_status" DEFAULT 'ready' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "dena_private_media_assets_object_key_unique" UNIQUE("object_key"),
	CONSTRAINT "dena_private_media_key_ck" CHECK (
    object_key = course_id::text || '/' || id::text || '.mp4'
  )
);
--> statement-breakpoint
CREATE TABLE "dena_student_enrollments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" uuid NOT NULL,
	"student_user_id" uuid NOT NULL,
	"status" "dena_enrollment_status" DEFAULT 'active' NOT NULL,
	"enrolled_at" timestamp with time zone DEFAULT now() NOT NULL,
	"cancelled_at" timestamp with time zone,
	CONSTRAINT "dena_enrollment_cancel_ck" CHECK (
    (status = 'active' AND cancelled_at IS NULL)
    OR (status = 'cancelled' AND cancelled_at IS NOT NULL)
  )
);
--> statement-breakpoint
ALTER TABLE "dena_courses" ADD COLUMN "publication_status" "dena_course_publication_status" DEFAULT 'draft' NOT NULL;--> statement-breakpoint
ALTER TABLE "dena_courses" ADD COLUMN "published_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "dena_private_media_assets" ADD CONSTRAINT "dena_private_media_assets_course_id_dena_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."dena_courses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dena_student_enrollments" ADD CONSTRAINT "dena_student_enrollments_course_id_dena_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."dena_courses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dena_student_enrollments" ADD CONSTRAINT "dena_student_enrollments_student_user_id_user_id_fk" FOREIGN KEY ("student_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "dena_private_media_course_idx" ON "dena_private_media_assets" USING btree ("course_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "dena_student_course_enrollment_uidx" ON "dena_student_enrollments" USING btree ("student_user_id","course_id");--> statement-breakpoint
CREATE INDEX "dena_enrollment_course_idx" ON "dena_student_enrollments" USING btree ("course_id","status");