ALTER TABLE "dena_course_practice_questions"
  ADD COLUMN "learning_concept_id" text;
--> statement-breakpoint
ALTER TABLE "dena_course_practice_questions"
  ADD CONSTRAINT "dena_practice_learning_concept_ck"
  CHECK (
    learning_concept_id IS NULL OR learning_concept_id IN (
      'science.light.v1', 'geography.climate.v1',
      'math.linear-equation.v1', 'math.fractions.add.v1', 'math.percent.v1'
    )
  );
