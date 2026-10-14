ALTER TABLE "dena_student_ai_tutor_topics"
 DROP CONSTRAINT "dena_student_ai_tutor_topics_bounds_ck";
--> statement-breakpoint
ALTER TABLE "dena_student_ai_tutor_topics"
 ADD CONSTRAINT "dena_student_ai_tutor_topics_bounds_ck"
 CHECK (
    topic_id IN (
      'math.linear-equation.v1',
      'math.fractions.add.v1',
      'math.percent.v1',
      'science.light.v1',
      'geography.climate.v1'
    )
    AND question_count BETWEEN 1 AND 10000
    AND last_asked_at >= first_asked_at
 );
