ALTER TABLE "dena_student_ai_tutor_topics"
  ADD COLUMN "lesson_feedback" text;
--> statement-breakpoint
ALTER TABLE "dena_student_ai_tutor_topics"
  ADD CONSTRAINT "dena_student_ai_tutor_topics_lesson_feedback_ck"
  CHECK (
    lesson_feedback IS NULL OR lesson_feedback IN ('understood', 'needs_help')
  );
