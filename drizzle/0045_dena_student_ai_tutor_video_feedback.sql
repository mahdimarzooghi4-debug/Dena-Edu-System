CREATE TABLE "dena_student_ai_tutor_video_feedback" (
  "student_user_id" uuid NOT NULL,
  "course_id" uuid NOT NULL,
  "asset_id" uuid NOT NULL,
  "needs_guidance" boolean NOT NULL,
  "first_submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "dena_student_ai_tutor_video_feedback_pk"
    PRIMARY KEY("student_user_id", "course_id", "asset_id")
);--> statement-breakpoint
ALTER TABLE "dena_student_ai_tutor_video_feedback"
  ADD CONSTRAINT "dena_student_ai_tutor_video_feedback_student_user_id_user_id_fk"
  FOREIGN KEY ("student_user_id") REFERENCES "public"."user"("id")
  ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dena_student_ai_tutor_video_feedback"
  ADD CONSTRAINT "dena_student_ai_tutor_video_feedback_asset_course_fk"
  FOREIGN KEY ("asset_id", "course_id")
  REFERENCES "public"."dena_private_media_assets"("id", "course_id")
  ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "dena_student_ai_tutor_video_guidance_idx"
  ON "dena_student_ai_tutor_video_feedback" USING btree
  ("student_user_id", "course_id", "needs_guidance");