CREATE TYPE "public"."dena_assessment_exam_status" AS ENUM('draft', 'published', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."dena_assessment_exam_type" AS ENUM('institute_planned', 'dena_coordinated');--> statement-breakpoint
CREATE TABLE "dena_assessment_exam_questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"exam_id" uuid NOT NULL,
	"bank_id" uuid NOT NULL,
	"owner_type" "dena_assessment_bank_owner_type" NOT NULL,
	"owner_id" uuid NOT NULL,
	"bank_question_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"prompt" text NOT NULL,
	"option_0" text NOT NULL,
	"option_1" text NOT NULL,
	"option_2" text NOT NULL,
	"option_3" text NOT NULL,
	"correct_option" integer NOT NULL,
	"points" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "dena_assessment_exam_question_values_ck" CHECK (
    position BETWEEN 0 AND 299
    AND points BETWEEN 1 AND 100
    AND char_length(prompt) BETWEEN 10 AND 500 AND btrim(prompt) <> ''
    AND char_length(option_0) BETWEEN 1 AND 160 AND btrim(option_0) <> ''
    AND char_length(option_1) BETWEEN 1 AND 160 AND btrim(option_1) <> ''
    AND char_length(option_2) BETWEEN 1 AND 160 AND btrim(option_2) <> ''
    AND char_length(option_3) BETWEEN 1 AND 160 AND btrim(option_3) <> ''
    AND correct_option BETWEEN 0 AND 3
  )
);
--> statement-breakpoint
CREATE TABLE "dena_assessment_exams" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"exam_type" "dena_assessment_exam_type" NOT NULL,
	"owner_type" "dena_assessment_bank_owner_type" NOT NULL,
	"owner_id" uuid NOT NULL,
	"bank_id" uuid NOT NULL,
	"course_id" uuid,
	"title" text NOT NULL,
	"instructions" text NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"duration_minutes" integer NOT NULL,
	"attempt_limit" integer DEFAULT 1 NOT NULL,
	"status" "dena_assessment_exam_status" DEFAULT 'draft' NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "dena_assessment_exam_type_scope_ck" CHECK (
    (exam_type = 'institute_planned' AND owner_type = 'institute'
      AND owner_id <> '00000000-0000-0000-0000-000000000001'::uuid
      AND course_id IS NOT NULL)
    OR (exam_type = 'dena_coordinated' AND owner_type = 'dena'
      AND owner_id = '00000000-0000-0000-0000-000000000001'::uuid
      AND course_id IS NULL)
  ),
	CONSTRAINT "dena_assessment_exam_title_ck" CHECK (
    char_length(title) BETWEEN 3 AND 160 AND btrim(title) <> ''
  ),
	CONSTRAINT "dena_assessment_exam_instructions_ck" CHECK (
    char_length(instructions) BETWEEN 1 AND 2000 AND btrim(instructions) <> ''
  ),
	CONSTRAINT "dena_assessment_exam_schedule_ck" CHECK (
    ends_at > starts_at
    AND duration_minutes BETWEEN 5 AND 300
    AND attempt_limit BETWEEN 1 AND 20
  )
);
--> statement-breakpoint
-- The composite exam scope key must exist before the exam-question foreign key.
CREATE UNIQUE INDEX "dena_assessment_exam_scope_uidx" ON "dena_assessment_exams" USING btree ("id","bank_id","owner_type","owner_id");--> statement-breakpoint
ALTER TABLE "dena_assessment_exam_questions" ADD CONSTRAINT "dena_assessment_exam_question_exam_scope_fk" FOREIGN KEY ("exam_id","bank_id","owner_type","owner_id") REFERENCES "public"."dena_assessment_exams"("id","bank_id","owner_type","owner_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dena_assessment_exam_questions" ADD CONSTRAINT "dena_assessment_exam_question_bank_scope_fk" FOREIGN KEY ("bank_question_id","bank_id","owner_type","owner_id") REFERENCES "public"."dena_assessment_question_bank_questions"("id","bank_id","owner_type","owner_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dena_assessment_exams" ADD CONSTRAINT "dena_assessment_exams_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dena_assessment_exams" ADD CONSTRAINT "dena_assessment_exam_bank_scope_fk" FOREIGN KEY ("bank_id","owner_type","owner_id") REFERENCES "public"."dena_assessment_question_banks"("id","owner_type","owner_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dena_assessment_exams" ADD CONSTRAINT "dena_assessment_exam_course_scope_fk" FOREIGN KEY ("course_id","owner_id") REFERENCES "public"."dena_courses"("id","responsible_institute_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "dena_assessment_exam_question_position_uidx" ON "dena_assessment_exam_questions" USING btree ("exam_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "dena_assessment_exam_question_source_uidx" ON "dena_assessment_exam_questions" USING btree ("exam_id","bank_question_id");--> statement-breakpoint
CREATE INDEX "dena_assessment_exam_question_bank_idx" ON "dena_assessment_exam_questions" USING btree ("bank_id","bank_question_id");--> statement-breakpoint
CREATE INDEX "dena_assessment_exam_owner_schedule_idx" ON "dena_assessment_exams" USING btree ("owner_type","owner_id","starts_at","id");--> statement-breakpoint
CREATE INDEX "dena_assessment_exam_status_idx" ON "dena_assessment_exams" USING btree ("exam_type","status","starts_at");
