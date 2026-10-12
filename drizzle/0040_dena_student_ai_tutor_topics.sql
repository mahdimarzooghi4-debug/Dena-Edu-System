CREATE TABLE "dena_student_ai_tutor_topics" (
  "student_user_id" uuid NOT NULL,
  "topic_id" text NOT NULL,
  "question_count" integer DEFAULT 1 NOT NULL,
  "first_asked_at" timestamp with time zone DEFAULT now() NOT NULL,
  "last_asked_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "dena_student_ai_tutor_topics_pk"
    PRIMARY KEY ("student_user_id", "topic_id"),
  CONSTRAINT "dena_student_ai_tutor_topics_student_user_id_user_id_fk"
    FOREIGN KEY ("student_user_id") REFERENCES "public"."user"("id")
    ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "dena_student_ai_tutor_topics_bounds_ck" CHECK (
    topic_id IN (
      'math.linear-equation.v1',
      'math.fractions.add.v1',
      'math.percent.v1'
    )
    AND question_count BETWEEN 1 AND 10000
    AND last_asked_at >= first_asked_at
  )
);
