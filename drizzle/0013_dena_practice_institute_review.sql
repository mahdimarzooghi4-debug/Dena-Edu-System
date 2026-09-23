CREATE TYPE "public"."dena_practice_review_status" AS ENUM('pending', 'approved', 'rejected');
--> statement-breakpoint
ALTER TABLE "dena_course_practice_questions"
  ADD COLUMN "review_status" "dena_practice_review_status" DEFAULT 'pending' NOT NULL;
--> statement-breakpoint
ALTER TABLE "dena_course_practice_questions"
  ADD COLUMN "reviewed_by_institute_user_id" uuid;
--> statement-breakpoint
ALTER TABLE "dena_course_practice_questions"
  ADD COLUMN "reviewed_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "dena_course_practice_questions"
  ADD COLUMN "review_reason" text;
--> statement-breakpoint
ALTER TABLE "dena_course_practice_questions"
  ADD CONSTRAINT "dena_course_practice_questions_reviewed_by_institute_user_id_user_id_fk"
  FOREIGN KEY ("reviewed_by_institute_user_id") REFERENCES "public"."user"("id")
  ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "dena_course_practice_questions"
  ADD CONSTRAINT "dena_practice_review_state_ck" CHECK (
    (review_status = 'pending'
      AND reviewed_by_institute_user_id IS NULL
      AND reviewed_at IS NULL
      AND review_reason IS NULL)
    OR
    (review_status IN ('approved', 'rejected')
      AND reviewed_by_institute_user_id IS NOT NULL
      AND reviewed_at IS NOT NULL
      AND review_reason IS NOT NULL)
  );
