CREATE TYPE "public"."dena_learning_assessment_attempt_status" AS ENUM('in_progress', 'submitted');--> statement-breakpoint
CREATE TYPE "public"."dena_learning_assessment_outcome" AS ENUM('needs_review', 'completed');--> statement-breakpoint
CREATE TYPE "public"."dena_learning_assessment_review_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TABLE "dena_course_learning_assessment_questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"assessment_id" uuid NOT NULL,
	"course_id" uuid NOT NULL,
	"lesson_asset_id" uuid NOT NULL,
	"prompt" text NOT NULL,
	"option_0" text NOT NULL,
	"option_1" text NOT NULL,
	"option_2" text NOT NULL,
	"option_3" text NOT NULL,
	"correct_option" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "dena_learning_assessment_question_bounds_ck" CHECK (
      char_length(prompt) BETWEEN 10 AND 500 AND btrim(prompt) <> ''
      AND char_length(option_0) BETWEEN 1 AND 160 AND btrim(option_0) <> ''
      AND char_length(option_1) BETWEEN 1 AND 160 AND btrim(option_1) <> ''
      AND char_length(option_2) BETWEEN 1 AND 160 AND btrim(option_2) <> ''
      AND char_length(option_3) BETWEEN 1 AND 160 AND btrim(option_3) <> ''
      AND correct_option BETWEEN 0 AND 3
    )
);
--> statement-breakpoint
CREATE TABLE "dena_course_learning_assessments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" uuid NOT NULL,
	"title" text NOT NULL,
	"instructions" text NOT NULL,
	"question_count" integer NOT NULL,
	"required_correct_count" integer NOT NULL,
	"authored_by_provider_user_id" uuid NOT NULL,
	"review_status" "dena_learning_assessment_review_status" DEFAULT 'pending' NOT NULL,
	"reviewed_by_institute_user_id" uuid,
	"reviewed_at" timestamp with time zone,
	"review_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "dena_learning_assessment_title_ck" CHECK (
      char_length(title) BETWEEN 3 AND 160 AND btrim(title) <> ''
    ),
	CONSTRAINT "dena_learning_assessment_instructions_ck" CHECK (
      char_length(instructions) BETWEEN 1 AND 1000
      AND btrim(instructions) <> ''
    ),
	CONSTRAINT "dena_learning_assessment_question_count_ck" CHECK (
      question_count BETWEEN 1 AND 100
      AND required_correct_count BETWEEN 1 AND question_count
    ),
	CONSTRAINT "dena_learning_assessment_review_state_ck" CHECK (
      (review_status = 'pending'
        AND reviewed_by_institute_user_id IS NULL
        AND reviewed_at IS NULL AND review_reason IS NULL)
      OR
      (review_status IN ('approved', 'rejected')
        AND reviewed_by_institute_user_id IS NOT NULL
        AND reviewed_at IS NOT NULL AND review_reason IS NOT NULL
        AND char_length(review_reason) BETWEEN 15 AND 500
        AND btrim(review_reason) <> '')
    )
);
--> statement-breakpoint
CREATE TABLE "dena_student_learning_assessment_attempt_questions" (
	"attempt_id" uuid NOT NULL,
	"assessment_id" uuid NOT NULL,
	"course_id" uuid NOT NULL,
	"question_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"selected_option" integer,
	"correct" boolean,
	CONSTRAINT "dena_student_learning_assessment_attempt_questions_attempt_id_question_id_pk" PRIMARY KEY("attempt_id","question_id"),
	CONSTRAINT "dena_learning_assessment_attempt_question_position_ck" CHECK (
      position >= 0
    ),
	CONSTRAINT "dena_learning_assessment_attempt_question_answer_ck" CHECK (
      (selected_option IS NULL AND correct IS NULL)
      OR (selected_option BETWEEN 0 AND 3 AND correct IS NOT NULL)
    )
);
--> statement-breakpoint
CREATE TABLE "dena_student_learning_assessment_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"assessment_id" uuid NOT NULL,
	"course_id" uuid NOT NULL,
	"student_user_id" uuid NOT NULL,
	"attempt_number" integer NOT NULL,
	"status" "dena_learning_assessment_attempt_status" DEFAULT 'in_progress' NOT NULL,
	"outcome" "dena_learning_assessment_outcome",
	"correct_count" integer,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"submitted_at" timestamp with time zone,
	CONSTRAINT "dena_learning_assessment_attempt_number_ck" CHECK (
      attempt_number >= 1
    ),
	CONSTRAINT "dena_learning_assessment_attempt_state_ck" CHECK (
      (status = 'in_progress' AND outcome IS NULL
        AND correct_count IS NULL AND submitted_at IS NULL)
      OR
      (status = 'submitted' AND outcome IS NOT NULL
        AND correct_count IS NOT NULL AND submitted_at IS NOT NULL)
    )
);
--> statement-breakpoint
CREATE TABLE "dena_student_learning_assessment_lesson_reviews" (
	"attempt_id" uuid NOT NULL,
	"assessment_id" uuid NOT NULL,
	"course_id" uuid NOT NULL,
	"lesson_asset_id" uuid NOT NULL,
	"student_user_id" uuid NOT NULL,
	"reviewed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "dena_student_learning_assessment_lesson_reviews_attempt_id_lesson_asset_id_pk" PRIMARY KEY("attempt_id","lesson_asset_id")
);
--> statement-breakpoint
CREATE UNIQUE INDEX "dena_learning_assessment_question_id_scope_uidx" ON "dena_course_learning_assessment_questions" USING btree ("id","assessment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "dena_learning_assessment_id_course_uidx" ON "dena_course_learning_assessments" USING btree ("id","course_id");--> statement-breakpoint
CREATE UNIQUE INDEX "dena_learning_assessment_attempt_id_scope_uidx" ON "dena_student_learning_assessment_attempts" USING btree ("id","assessment_id","course_id");--> statement-breakpoint
CREATE UNIQUE INDEX "dena_learning_assessment_attempt_id_student_uidx" ON "dena_student_learning_assessment_attempts" USING btree ("id","student_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "dena_private_media_id_course_uidx" ON "dena_private_media_assets" USING btree ("id","course_id");--> statement-breakpoint
ALTER TABLE "dena_course_learning_assessment_questions" ADD CONSTRAINT "dena_learning_assessment_question_assessment_scope_fk" FOREIGN KEY ("assessment_id","course_id") REFERENCES "public"."dena_course_learning_assessments"("id","course_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dena_course_learning_assessment_questions" ADD CONSTRAINT "dena_learning_assessment_question_lesson_scope_fk" FOREIGN KEY ("lesson_asset_id","course_id") REFERENCES "public"."dena_private_media_assets"("id","course_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dena_course_learning_assessments" ADD CONSTRAINT "dena_course_learning_assessments_course_id_dena_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."dena_courses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dena_course_learning_assessments" ADD CONSTRAINT "dena_course_learning_assessments_authored_by_provider_user_id_user_id_fk" FOREIGN KEY ("authored_by_provider_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dena_course_learning_assessments" ADD CONSTRAINT "dena_course_learning_assessments_reviewed_by_institute_user_id_user_id_fk" FOREIGN KEY ("reviewed_by_institute_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dena_student_learning_assessment_attempt_questions" ADD CONSTRAINT "dena_learning_assessment_attempt_question_attempt_scope_fk" FOREIGN KEY ("attempt_id","assessment_id","course_id") REFERENCES "public"."dena_student_learning_assessment_attempts"("id","assessment_id","course_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dena_student_learning_assessment_attempt_questions" ADD CONSTRAINT "dena_learning_assessment_attempt_question_bank_scope_fk" FOREIGN KEY ("question_id","assessment_id") REFERENCES "public"."dena_course_learning_assessment_questions"("id","assessment_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dena_student_learning_assessment_attempts" ADD CONSTRAINT "dena_student_learning_assessment_attempts_student_user_id_user_id_fk" FOREIGN KEY ("student_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dena_student_learning_assessment_attempts" ADD CONSTRAINT "dena_learning_assessment_attempt_assessment_scope_fk" FOREIGN KEY ("assessment_id","course_id") REFERENCES "public"."dena_course_learning_assessments"("id","course_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dena_student_learning_assessment_lesson_reviews" ADD CONSTRAINT "dena_student_learning_assessment_lesson_reviews_student_user_id_user_id_fk" FOREIGN KEY ("student_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dena_student_learning_assessment_lesson_reviews" ADD CONSTRAINT "dena_learning_assessment_lesson_review_attempt_scope_fk" FOREIGN KEY ("attempt_id","assessment_id","course_id") REFERENCES "public"."dena_student_learning_assessment_attempts"("id","assessment_id","course_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dena_student_learning_assessment_lesson_reviews" ADD CONSTRAINT "dena_learning_assessment_lesson_review_student_scope_fk" FOREIGN KEY ("attempt_id","student_user_id") REFERENCES "public"."dena_student_learning_assessment_attempts"("id","student_user_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dena_student_learning_assessment_lesson_reviews" ADD CONSTRAINT "dena_learning_assessment_lesson_review_asset_scope_fk" FOREIGN KEY ("lesson_asset_id","course_id") REFERENCES "public"."dena_private_media_assets"("id","course_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "dena_learning_assessment_question_bank_idx" ON "dena_course_learning_assessment_questions" USING btree ("assessment_id","created_at");--> statement-breakpoint
CREATE INDEX "dena_learning_assessment_course_review_idx" ON "dena_course_learning_assessments" USING btree ("course_id","review_status");--> statement-breakpoint
CREATE UNIQUE INDEX "dena_learning_assessment_attempt_position_uidx" ON "dena_student_learning_assessment_attempt_questions" USING btree ("attempt_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "dena_learning_assessment_attempt_number_uidx" ON "dena_student_learning_assessment_attempts" USING btree ("assessment_id","student_user_id","attempt_number");--> statement-breakpoint
CREATE INDEX "dena_learning_assessment_attempt_student_idx" ON "dena_student_learning_assessment_attempts" USING btree ("student_user_id","assessment_id","attempt_number");--> statement-breakpoint
CREATE INDEX "dena_learning_assessment_lesson_review_student_idx" ON "dena_student_learning_assessment_lesson_reviews" USING btree ("student_user_id","assessment_id","reviewed_at");--> statement-breakpoint
