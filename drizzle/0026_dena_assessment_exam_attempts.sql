CREATE TYPE "public"."dena_assessment_exam_attempt_status" AS ENUM('in_progress', 'submitted', 'expired');--> statement-breakpoint
ALTER TYPE "public"."dena_audit_entity_type" ADD VALUE 'ASSESSMENT_EXAM';--> statement-breakpoint
CREATE TABLE "dena_assessment_exam_attempt_answers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"attempt_id" uuid NOT NULL,
	"exam_id" uuid NOT NULL,
	"student_user_id" uuid NOT NULL,
	"exam_question_id" uuid NOT NULL,
	"selected_option" integer,
	"answered_at" timestamp with time zone,
	CONSTRAINT "dena_assessment_exam_attempt_answer_option_ck" CHECK ((selected_option IS NULL AND answered_at IS NULL) OR (selected_option BETWEEN 0 AND 3 AND answered_at IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "dena_assessment_exam_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"exam_id" uuid NOT NULL,
	"student_user_id" uuid NOT NULL,
	"attempt_number" integer NOT NULL,
	"status" "dena_assessment_exam_attempt_status" DEFAULT 'in_progress' NOT NULL,
	"question_count" integer NOT NULL,
	"correct_count" integer,
	"total_points" integer,
	"earned_points" integer,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deadline_at" timestamp with time zone NOT NULL,
	"submitted_at" timestamp with time zone,
	CONSTRAINT "dena_assessment_exam_attempt_values_ck" CHECK ((attempt_number BETWEEN 1 AND 20) AND (question_count BETWEEN 1 AND 300) AND (deadline_at > started_at) AND (correct_count IS NULL OR correct_count BETWEEN 0 AND question_count) AND (total_points IS NULL OR total_points BETWEEN 1 AND 30000) AND (earned_points IS NULL OR earned_points BETWEEN 0 AND total_points)),
	CONSTRAINT "dena_assessment_exam_attempt_state_ck" CHECK ((status = 'in_progress' AND submitted_at IS NULL AND correct_count IS NULL AND total_points IS NULL AND earned_points IS NULL) OR (status IN ('submitted', 'expired') AND submitted_at IS NOT NULL AND correct_count IS NOT NULL AND total_points IS NOT NULL AND earned_points IS NOT NULL))
);
--> statement-breakpoint
ALTER TABLE "dena_assessment_exam_attempt_answers" ADD CONSTRAINT "dena_assessment_exam_attempt_answer_attempt_scope_fk" FOREIGN KEY ("attempt_id","exam_id","student_user_id") REFERENCES "public"."dena_assessment_exam_attempts"("id","exam_id","student_user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dena_assessment_exam_attempt_answers" ADD CONSTRAINT "dena_assessment_exam_attempt_answer_question_scope_fk" FOREIGN KEY ("exam_question_id","exam_id") REFERENCES "public"."dena_assessment_exam_questions"("id","exam_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dena_assessment_exam_attempts" ADD CONSTRAINT "dena_assessment_exam_attempts_student_user_id_user_id_fk" FOREIGN KEY ("student_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dena_assessment_exam_attempts" ADD CONSTRAINT "dena_assessment_exam_attempt_exam_fk" FOREIGN KEY ("exam_id") REFERENCES "public"."dena_assessment_exams"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "dena_assessment_exam_attempt_answer_uidx" ON "dena_assessment_exam_attempt_answers" USING btree ("attempt_id","exam_question_id");--> statement-breakpoint
CREATE INDEX "dena_assessment_exam_attempt_answer_exam_idx" ON "dena_assessment_exam_attempt_answers" USING btree ("exam_id","exam_question_id");--> statement-breakpoint
CREATE UNIQUE INDEX "dena_assessment_exam_attempt_id_scope_uidx" ON "dena_assessment_exam_attempts" USING btree ("id","exam_id","student_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "dena_assessment_exam_attempt_number_uidx" ON "dena_assessment_exam_attempts" USING btree ("exam_id","student_user_id","attempt_number");--> statement-breakpoint
CREATE INDEX "dena_assessment_exam_attempt_student_idx" ON "dena_assessment_exam_attempts" USING btree ("student_user_id","status","started_at");--> statement-breakpoint
CREATE UNIQUE INDEX "dena_assessment_exam_question_id_exam_uidx" ON "dena_assessment_exam_questions" USING btree ("id","exam_id");