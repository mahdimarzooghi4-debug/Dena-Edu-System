CREATE TYPE "public"."dena_problem_solving_request_status" AS ENUM('submitted', 'under_review', 'scheduled', 'declined');--> statement-breakpoint
CREATE TYPE "public"."dena_problem_solving_session_status" AS ENUM('scheduled', 'held', 'cancelled');--> statement-breakpoint
CREATE TABLE "dena_problem_solving_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" uuid NOT NULL,
	"student_user_id" uuid NOT NULL,
	"supporter_team_member_id" uuid NOT NULL,
	"subject" text NOT NULL,
	"description" text,
	"status" "dena_problem_solving_request_status" DEFAULT 'submitted' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "dena_problem_request_subject_ck" CHECK (
      char_length(subject) BETWEEN 3 AND 160 AND btrim(subject) <> ''
    ),
	CONSTRAINT "dena_problem_request_description_ck" CHECK (
      description IS NULL OR
      (char_length(description) BETWEEN 1 AND 1000 AND btrim(description) <> '')
    )
);
--> statement-breakpoint
CREATE TABLE "dena_problem_solving_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid,
	"course_id" uuid NOT NULL,
	"student_user_id" uuid NOT NULL,
	"supporter_team_member_id" uuid NOT NULL,
	"subject" text NOT NULL,
	"scheduled_at" timestamp with time zone NOT NULL,
	"status" "dena_problem_solving_session_status" DEFAULT 'scheduled' NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "dena_problem_solving_sessions_request_id_unique" UNIQUE("request_id"),
	CONSTRAINT "dena_problem_session_subject_ck" CHECK (
      char_length(subject) BETWEEN 3 AND 160 AND btrim(subject) <> ''
    )
);
--> statement-breakpoint
ALTER TABLE "dena_course_team_members" ADD COLUMN "student_session_requests_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "dena_problem_solving_requests" ADD CONSTRAINT "dena_problem_solving_requests_student_user_id_user_id_fk" FOREIGN KEY ("student_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dena_problem_solving_requests" ADD CONSTRAINT "dena_problem_request_supporter_scope_fk" FOREIGN KEY ("supporter_team_member_id","course_id") REFERENCES "public"."dena_course_team_members"("id","course_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dena_problem_solving_sessions" ADD CONSTRAINT "dena_problem_solving_sessions_request_id_dena_problem_solving_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."dena_problem_solving_requests"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dena_problem_solving_sessions" ADD CONSTRAINT "dena_problem_solving_sessions_student_user_id_user_id_fk" FOREIGN KEY ("student_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dena_problem_solving_sessions" ADD CONSTRAINT "dena_problem_solving_sessions_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dena_problem_solving_sessions" ADD CONSTRAINT "dena_problem_session_supporter_scope_fk" FOREIGN KEY ("supporter_team_member_id","course_id") REFERENCES "public"."dena_course_team_members"("id","course_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "dena_problem_request_student_idx" ON "dena_problem_solving_requests" USING btree ("student_user_id","created_at");--> statement-breakpoint
CREATE INDEX "dena_problem_request_supporter_status_idx" ON "dena_problem_solving_requests" USING btree ("supporter_team_member_id","status","created_at");--> statement-breakpoint
CREATE INDEX "dena_problem_session_student_time_idx" ON "dena_problem_solving_sessions" USING btree ("student_user_id","scheduled_at");--> statement-breakpoint
CREATE INDEX "dena_problem_session_supporter_time_idx" ON "dena_problem_solving_sessions" USING btree ("supporter_team_member_id","scheduled_at");--> statement-breakpoint
ALTER TABLE "dena_course_team_members" ADD CONSTRAINT "dena_course_team_session_request_role_ck" CHECK (
    role = 'academic_supporter' OR student_session_requests_enabled = false
  );