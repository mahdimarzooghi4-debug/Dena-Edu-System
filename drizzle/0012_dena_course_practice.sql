CREATE TABLE "dena_course_practice_questions" (
  "course_id" uuid PRIMARY KEY NOT NULL,
  "prompt" text NOT NULL,
  "option_0" text NOT NULL,
  "option_1" text NOT NULL,
  "option_2" text NOT NULL,
  "option_3" text NOT NULL,
  "correct_option" integer NOT NULL,
  "authored_by_provider_user_id" uuid NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "dena_practice_question_bounds_ck" CHECK (
    char_length(prompt) BETWEEN 10 AND 500 AND btrim(prompt) <> ''
    AND char_length(option_0) BETWEEN 1 AND 160 AND btrim(option_0) <> ''
    AND char_length(option_1) BETWEEN 1 AND 160 AND btrim(option_1) <> ''
    AND char_length(option_2) BETWEEN 1 AND 160 AND btrim(option_2) <> ''
    AND char_length(option_3) BETWEEN 1 AND 160 AND btrim(option_3) <> ''
    AND correct_option BETWEEN 0 AND 3
  )
);
--> statement-breakpoint
CREATE TABLE "dena_student_practice_attempts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "course_id" uuid NOT NULL,
  "student_user_id" uuid NOT NULL,
  "selected_option" integer NOT NULL,
  "correct" boolean NOT NULL,
  "submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "dena_practice_selected_option_ck" CHECK (
    selected_option BETWEEN 0 AND 3
  )
);
--> statement-breakpoint
ALTER TABLE "dena_course_practice_questions"
  ADD CONSTRAINT "dena_course_practice_questions_course_id_dena_courses_id_fk"
  FOREIGN KEY ("course_id") REFERENCES "public"."dena_courses"("id")
  ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "dena_course_practice_questions"
  ADD CONSTRAINT "dena_course_practice_questions_authored_by_provider_user_id_user_id_fk"
  FOREIGN KEY ("authored_by_provider_user_id") REFERENCES "public"."user"("id")
  ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "dena_student_practice_attempts"
  ADD CONSTRAINT "dena_student_practice_attempts_course_id_dena_course_practice_questions_course_id_fk"
  FOREIGN KEY ("course_id") REFERENCES "public"."dena_course_practice_questions"("course_id")
  ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "dena_student_practice_attempts"
  ADD CONSTRAINT "dena_student_practice_attempts_student_user_id_user_id_fk"
  FOREIGN KEY ("student_user_id") REFERENCES "public"."user"("id")
  ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "dena_practice_attempt_student_course_uidx"
  ON "dena_student_practice_attempts" USING btree ("student_user_id","course_id");
--> statement-breakpoint
CREATE INDEX "dena_practice_attempt_course_idx"
  ON "dena_student_practice_attempts" USING btree ("course_id");
