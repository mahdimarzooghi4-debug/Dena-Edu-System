CREATE TYPE "public"."dena_institute_service_call_status" AS ENUM('scheduled', 'started', 'ended', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."dena_service_time_ledger_event_type" AS ENUM('grant', 'consume');--> statement-breakpoint
ALTER TYPE "public"."dena_audit_entity_type" ADD VALUE 'SERVICE_CALL' BEFORE 'PROVIDER_COLLABORATION';--> statement-breakpoint
CREATE TABLE "dena_institute_service_calls" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"service_order_id" uuid NOT NULL,
	"idempotency_key" uuid NOT NULL,
	"scheduled_at" timestamp with time zone NOT NULL,
	"status" "dena_institute_service_call_status" DEFAULT 'scheduled' NOT NULL,
	"started_at" timestamp with time zone,
	"ended_at" timestamp with time zone,
	"created_by_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "dena_institute_service_call_state_ck" CHECK (
    (status = 'scheduled' AND started_at IS NULL AND ended_at IS NULL)
    OR (status = 'started' AND started_at IS NOT NULL AND ended_at IS NULL)
    OR (status = 'ended' AND started_at IS NOT NULL AND ended_at >= started_at)
    OR (status = 'cancelled' AND started_at IS NULL AND ended_at IS NULL)
  )
);
--> statement-breakpoint
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
ALTER TABLE "dena_institute_service_calls" ADD CONSTRAINT "dena_institute_service_calls_service_order_id_dena_institute_service_orders_id_fk" FOREIGN KEY ("service_order_id") REFERENCES "public"."dena_institute_service_orders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dena_institute_service_calls" ADD CONSTRAINT "dena_institute_service_calls_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dena_service_time_ledger" ADD CONSTRAINT "dena_service_time_ledger_service_order_id_dena_institute_service_orders_id_fk" FOREIGN KEY ("service_order_id") REFERENCES "public"."dena_institute_service_orders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dena_service_time_ledger" ADD CONSTRAINT "dena_service_time_ledger_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "dena_institute_service_call_order_created_idx" ON "dena_institute_service_calls" USING btree ("service_order_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "dena_institute_service_call_order_idempotency_uidx" ON "dena_institute_service_calls" USING btree ("service_order_id","idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "dena_institute_service_call_order_open_uidx" ON "dena_institute_service_calls" USING btree ("service_order_id") WHERE "dena_institute_service_calls"."status" IN ('scheduled', 'started');--> statement-breakpoint
CREATE UNIQUE INDEX "dena_service_time_ledger_event_key_uidx" ON "dena_service_time_ledger" USING btree ("event_key");--> statement-breakpoint
CREATE INDEX "dena_service_time_ledger_order_created_idx" ON "dena_service_time_ledger" USING btree ("service_order_id","created_at");