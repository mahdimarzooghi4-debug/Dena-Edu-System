CREATE TYPE "public"."dena_audit_entity_type" AS ENUM('SYSTEM', 'USER', 'COURSE', 'PRACTICE', 'MEDIA', 'ROLE_APPLICATION');--> statement-breakpoint
CREATE TABLE "dena_audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" uuid NOT NULL,
	"actor_role" "dena_role" NOT NULL,
	"action" text NOT NULL,
	"entity_type" "dena_audit_entity_type" NOT NULL,
	"entity_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "dena_audit_action_ck" CHECK (
    char_length(action) BETWEEN 1 AND 120
    AND action ~ '^[a-z0-9_.:-]+$'
  )
);
--> statement-breakpoint
ALTER TABLE "dena_audit_logs" ADD CONSTRAINT "dena_audit_logs_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "dena_audit_logs_created_at_idx" ON "dena_audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "dena_audit_logs_actor_idx" ON "dena_audit_logs" USING btree ("actor_id","created_at");