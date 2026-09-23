CREATE TYPE "dena_audit_entity_type" AS ENUM ('SYSTEM', 'USER', 'COURSE', 'EXERCISE', 'REVIEW');

CREATE TABLE "dena_audit_logs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "actor_id" uuid NOT NULL REFERENCES "user"("id") ON DELETE RESTRICT,
  "actor_role" "dena_role" NOT NULL,
  "action" text NOT NULL,
  "entity_type" "dena_audit_entity_type" NOT NULL,
  "entity_id" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX "dena_audit_logs_created_at_idx" ON "dena_audit_logs" USING btree ("created_at");
CREATE INDEX "dena_audit_logs_actor_idx" ON "dena_audit_logs" USING btree ("actor_id", "created_at");

-- Intentionally no OTP, token, media key, student answer, or private profile fields.
