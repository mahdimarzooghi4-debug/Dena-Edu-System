CREATE TYPE "public"."dena_assessment_bank_owner_type" AS ENUM('dena', 'institute');--> statement-breakpoint
ALTER TYPE "public"."dena_audit_entity_type" ADD VALUE 'ASSESSMENT_QUESTION';--> statement-breakpoint
CREATE TABLE "dena_assessment_question_bank_questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bank_id" uuid NOT NULL,
	"owner_type" "dena_assessment_bank_owner_type" NOT NULL,
	"owner_id" uuid NOT NULL,
	"course_id" uuid,
	"lesson_asset_id" uuid,
	"prompt" text NOT NULL,
	"option_0" text NOT NULL,
	"option_1" text NOT NULL,
	"option_2" text NOT NULL,
	"option_3" text NOT NULL,
	"correct_option" integer NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "dena_assessment_bank_question_owner_ck" CHECK (
      (owner_type = 'dena'
        AND owner_id = '00000000-0000-0000-0000-000000000001'::uuid
        AND course_id IS NULL AND lesson_asset_id IS NULL)
      OR (owner_type = 'institute'
        AND owner_id <> '00000000-0000-0000-0000-000000000001'::uuid
        AND course_id IS NOT NULL AND lesson_asset_id IS NOT NULL)
    ),
	CONSTRAINT "dena_assessment_bank_question_bounds_ck" CHECK (
      char_length(prompt) BETWEEN 10 AND 500 AND btrim(prompt) <> ''
      AND char_length(option_0) BETWEEN 1 AND 160 AND btrim(option_0) <> ''
      AND char_length(option_1) BETWEEN 1 AND 160 AND btrim(option_1) <> ''
      AND char_length(option_2) BETWEEN 1 AND 160 AND btrim(option_2) <> ''
      AND char_length(option_3) BETWEEN 1 AND 160 AND btrim(option_3) <> ''
      AND correct_option BETWEEN 0 AND 3
    )
);
--> statement-breakpoint
CREATE TABLE "dena_assessment_question_banks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_type" "dena_assessment_bank_owner_type" NOT NULL,
	"owner_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "dena_assessment_bank_owner_ck" CHECK (
    (owner_type = 'dena' AND owner_id = '00000000-0000-0000-0000-000000000001'::uuid)
    OR (owner_type = 'institute' AND owner_id <> '00000000-0000-0000-0000-000000000001'::uuid)
  )
);
--> statement-breakpoint
ALTER TABLE "dena_assessment_question_bank_questions" ADD CONSTRAINT "dena_assessment_question_bank_questions_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dena_assessment_question_bank_questions" ADD CONSTRAINT "dena_assessment_bank_question_bank_scope_fk" FOREIGN KEY ("bank_id","owner_type","owner_id") REFERENCES "public"."dena_assessment_question_banks"("id","owner_type","owner_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dena_assessment_question_bank_questions" ADD CONSTRAINT "dena_assessment_bank_question_course_scope_fk" FOREIGN KEY ("course_id","owner_id") REFERENCES "public"."dena_courses"("id","responsible_institute_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dena_assessment_question_bank_questions" ADD CONSTRAINT "dena_assessment_bank_question_lesson_scope_fk" FOREIGN KEY ("lesson_asset_id","course_id") REFERENCES "public"."dena_private_media_assets"("id","course_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "dena_assessment_bank_question_id_scope_uidx" ON "dena_assessment_question_bank_questions" USING btree ("id","bank_id","owner_type","owner_id");--> statement-breakpoint
CREATE INDEX "dena_assessment_bank_question_list_idx" ON "dena_assessment_question_bank_questions" USING btree ("bank_id","created_at","id");--> statement-breakpoint
CREATE UNIQUE INDEX "dena_assessment_bank_owner_uidx" ON "dena_assessment_question_banks" USING btree ("owner_type","owner_id");--> statement-breakpoint
CREATE UNIQUE INDEX "dena_assessment_bank_scope_uidx" ON "dena_assessment_question_banks" USING btree ("id","owner_type","owner_id");--> statement-breakpoint
CREATE INDEX "dena_assessment_bank_owner_idx" ON "dena_assessment_question_banks" USING btree ("owner_type","owner_id");
--> statement-breakpoint
INSERT INTO "dena_assessment_question_banks" ("id", "owner_type", "owner_id")
VALUES (
	'00000000-0000-0000-0000-000000000002'::uuid,
	'dena',
	'00000000-0000-0000-0000-000000000001'::uuid
)
ON CONFLICT ("owner_type", "owner_id") DO NOTHING;
