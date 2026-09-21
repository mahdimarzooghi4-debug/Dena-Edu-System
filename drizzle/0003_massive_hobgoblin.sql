CREATE TYPE "public"."dena_supervision_event_kind" AS ENUM('requested', 'approved', 'rejected', 'revoked');--> statement-breakpoint
CREATE TABLE "dena_supervision_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" uuid NOT NULL,
	"provider_id" uuid NOT NULL,
	"institute_id" uuid NOT NULL,
	"actor_user_id" uuid NOT NULL,
	"kind" "dena_supervision_event_kind" NOT NULL,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "dena_supervision_event_reason_ck" CHECK (
    (kind = 'requested' AND reason IS NULL)
    OR (kind <> 'requested' AND reason IS NOT NULL)
  )
);
--> statement-breakpoint
ALTER TABLE "dena_courses" ADD COLUMN "created_by_provider_user_id" uuid;--> statement-breakpoint
ALTER TABLE "dena_courses" ADD COLUMN "client_request_id" uuid;--> statement-breakpoint
ALTER TABLE "dena_supervision_grants" ADD COLUMN "requested_by_provider_user_id" uuid;--> statement-breakpoint
ALTER TABLE "dena_supervision_grants" ADD COLUMN "requested_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "dena_supervision_events" ADD CONSTRAINT "dena_supervision_events_course_id_dena_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."dena_courses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dena_supervision_events" ADD CONSTRAINT "dena_supervision_events_actor_user_id_user_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "dena_supervision_events_course_idx" ON "dena_supervision_events" USING btree ("course_id","created_at");--> statement-breakpoint
ALTER TABLE "dena_courses" ADD CONSTRAINT "dena_courses_created_by_provider_user_id_user_id_fk" FOREIGN KEY ("created_by_provider_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dena_supervision_grants" ADD CONSTRAINT "dena_supervision_grants_requested_by_provider_user_id_user_id_fk" FOREIGN KEY ("requested_by_provider_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dena_supervision_grants" ADD CONSTRAINT "dena_supervision_matching_course_fk" FOREIGN KEY ("course_id","provider_id","institute_id") REFERENCES "public"."dena_courses"("id","provider_id","responsible_institute_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "dena_courses_provider_request_uidx" ON "dena_courses" USING btree ("provider_id","client_request_id");--> statement-breakpoint
CREATE UNIQUE INDEX "dena_courses_scope_fk_uidx" ON "dena_courses" USING btree ("id","provider_id","responsible_institute_id");