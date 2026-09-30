CREATE TYPE "public"."dena_course_team_member_status" AS ENUM('active', 'inactive');--> statement-breakpoint
CREATE TYPE "public"."dena_course_team_role" AS ENUM('teacher', 'academic_supporter', 'counselor');--> statement-breakpoint
CREATE TABLE "dena_course_conversation_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"sender_user_id" uuid NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "dena_course_conversation_message_body_ck" CHECK (
      char_length(body) BETWEEN 1 AND 4000 AND btrim(body) <> ''
    )
);
--> statement-breakpoint
CREATE TABLE "dena_course_conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" uuid NOT NULL,
	"student_user_id" uuid NOT NULL,
	"team_member_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_message_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "dena_course_team_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" uuid NOT NULL,
	"institute_id" uuid NOT NULL,
	"member_user_id" uuid NOT NULL,
	"role" "dena_course_team_role" NOT NULL,
	"status" "dena_course_team_member_status" DEFAULT 'active' NOT NULL,
	"assigned_by_institute_user_id" uuid NOT NULL,
	"assigned_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone,
	CONSTRAINT "dena_course_team_status_ck" CHECK (
    (status = 'active' AND ended_at IS NULL)
    OR (status = 'inactive' AND ended_at IS NOT NULL)
  )
);
--> statement-breakpoint
CREATE UNIQUE INDEX "dena_course_team_member_course_uidx" ON "dena_course_team_members" USING btree ("id","course_id");--> statement-breakpoint
CREATE UNIQUE INDEX "dena_courses_institute_scope_uidx" ON "dena_courses" USING btree ("id","responsible_institute_id");--> statement-breakpoint
ALTER TABLE "dena_course_conversation_messages" ADD CONSTRAINT "dena_course_conversation_messages_conversation_id_dena_course_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."dena_course_conversations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dena_course_conversation_messages" ADD CONSTRAINT "dena_course_conversation_messages_sender_user_id_user_id_fk" FOREIGN KEY ("sender_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dena_course_conversations" ADD CONSTRAINT "dena_course_conversations_student_user_id_user_id_fk" FOREIGN KEY ("student_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dena_course_conversations" ADD CONSTRAINT "dena_course_conversation_team_scope_fk" FOREIGN KEY ("team_member_id","course_id") REFERENCES "public"."dena_course_team_members"("id","course_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dena_course_team_members" ADD CONSTRAINT "dena_course_team_members_member_user_id_user_id_fk" FOREIGN KEY ("member_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dena_course_team_members" ADD CONSTRAINT "dena_course_team_members_assigned_by_institute_user_id_user_id_fk" FOREIGN KEY ("assigned_by_institute_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dena_course_team_members" ADD CONSTRAINT "dena_course_team_institute_scope_fk" FOREIGN KEY ("course_id","institute_id") REFERENCES "public"."dena_courses"("id","responsible_institute_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "dena_course_conversation_message_idx" ON "dena_course_conversation_messages" USING btree ("conversation_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "dena_course_conversation_student_member_uidx" ON "dena_course_conversations" USING btree ("student_user_id","team_member_id");--> statement-breakpoint
CREATE INDEX "dena_course_conversation_course_student_idx" ON "dena_course_conversations" USING btree ("course_id","student_user_id");--> statement-breakpoint
CREATE INDEX "dena_course_conversation_member_recent_idx" ON "dena_course_conversations" USING btree ("team_member_id","last_message_at");--> statement-breakpoint
CREATE UNIQUE INDEX "dena_course_team_member_role_uidx" ON "dena_course_team_members" USING btree ("course_id","member_user_id","role");--> statement-breakpoint
CREATE INDEX "dena_course_team_course_status_idx" ON "dena_course_team_members" USING btree ("course_id","status","role");