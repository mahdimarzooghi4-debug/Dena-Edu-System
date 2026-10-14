CREATE TYPE "public"."dena_service_time_ledger_event_type" AS ENUM('grant', 'consume');--> statement-breakpoint
CREATE TABLE "dena_service_time_ledger" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"service_order_id" uuid NOT NULL,
	"event_key" text NOT NULL,
	"event_type" "dena_service_time_ledger_event_type" NOT NULL,
	"minutes" integer NOT NULL,
	"service_session_id" uuid,
	"created_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "dena_service_time_ledger_event_key_ck" CHECK (event_key ~ '^[a-zA-Z0-9_.:-]{8,180}$'),
	CONSTRAINT "dena_service_time_ledger_minutes_ck" CHECK (minutes BETWEEN 1 AND 100000),
	CONSTRAINT "dena_service_time_ledger_event_session_ck" CHECK (
    (event_type = 'grant' AND service_session_id IS NULL)
    OR (event_type = 'consume' AND service_session_id IS NOT NULL)
  )
);
--> statement-breakpoint
ALTER TABLE "dena_service_time_ledger" ADD CONSTRAINT "dena_service_time_ledger_service_order_id_dena_institute_service_orders_id_fk" FOREIGN KEY ("service_order_id") REFERENCES "public"."dena_institute_service_orders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dena_service_time_ledger" ADD CONSTRAINT "dena_service_time_ledger_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "dena_service_time_ledger_event_key_uidx" ON "dena_service_time_ledger" USING btree ("event_key");--> statement-breakpoint
CREATE INDEX "dena_service_time_ledger_order_created_idx" ON "dena_service_time_ledger" USING btree ("service_order_id","created_at");