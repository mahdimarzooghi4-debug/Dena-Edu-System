CREATE TYPE "public"."dena_service_call_media_event_kind" AS ENUM('joined', 'left', 'room_finished');--> statement-breakpoint
CREATE TABLE "dena_service_call_media_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider_event_id" text NOT NULL,
	"service_call_id" uuid NOT NULL,
	"participant_user_id" uuid,
	"participant_role" text NOT NULL,
	"kind" "dena_service_call_media_event_kind" NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "dena_service_call_media_event_provider_id_ck" CHECK (provider_event_id ~ '^[A-Za-z0-9._:-]{8,100}$'),
	CONSTRAINT "dena_service_call_media_event_actor_ck" CHECK (
    (kind = 'room_finished' AND participant_user_id IS NULL AND participant_role = 'system')
    OR (kind <> 'room_finished' AND participant_user_id IS NOT NULL
      AND participant_role IN ('student', 'institute'))
  )
);
--> statement-breakpoint
ALTER TABLE "dena_service_time_ledger" RENAME COLUMN "minutes" TO "seconds";--> statement-breakpoint
ALTER TABLE "dena_service_time_ledger" DROP CONSTRAINT "dena_service_time_ledger_minutes_ck";--> statement-breakpoint
ALTER TABLE "dena_institute_service_calls" ADD COLUMN "connected_seconds" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "dena_service_call_media_events" ADD CONSTRAINT "dena_service_call_media_events_service_call_id_dena_institute_service_calls_id_fk" FOREIGN KEY ("service_call_id") REFERENCES "public"."dena_institute_service_calls"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dena_service_call_media_events" ADD CONSTRAINT "dena_service_call_media_events_participant_user_id_user_id_fk" FOREIGN KEY ("participant_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "dena_service_call_media_event_provider_uidx" ON "dena_service_call_media_events" USING btree ("provider_event_id");--> statement-breakpoint
CREATE INDEX "dena_service_call_media_event_call_time_idx" ON "dena_service_call_media_events" USING btree ("service_call_id","occurred_at","id");--> statement-breakpoint
ALTER TABLE "dena_institute_service_calls" ADD CONSTRAINT "dena_institute_service_call_connected_seconds_ck" CHECK (connected_seconds >= 0);--> statement-breakpoint
ALTER TABLE "dena_service_time_ledger" ADD CONSTRAINT "dena_service_time_ledger_seconds_ck" CHECK (seconds BETWEEN 1 AND 6000000);
