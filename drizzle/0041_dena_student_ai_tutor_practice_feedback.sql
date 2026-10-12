ALTER TABLE "dena_student_ai_tutor_topics"
  ADD COLUMN "practice_attempt_count" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "dena_student_ai_tutor_topics"
  ADD COLUMN "practice_correct_count" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "dena_student_ai_tutor_topics"
  ADD CONSTRAINT "dena_student_ai_tutor_topics_practice_bounds_ck"
  CHECK (
    practice_attempt_count BETWEEN 0 AND 10000
    AND practice_correct_count BETWEEN 0 AND practice_attempt_count
  );
