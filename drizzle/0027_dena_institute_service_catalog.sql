CREATE TYPE "public"."dena_institute_service_status" AS ENUM('draft', 'active', 'paused');--> statement-breakpoint
CREATE TABLE "dena_institute_services" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"institute_id" uuid NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"title" text NOT NULL,
	"category" text NOT NULL,
	"description" text NOT NULL,
	"price_toman" bigint NOT NULL,
	"included_minutes" integer,
	"validity_days" integer,
	"guardian_consent_required" boolean DEFAULT false NOT NULL,
	"cancellation_policy" text NOT NULL,
	"status" "dena_institute_service_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "dena_institute_services_title_ck" CHECK (char_length(title) BETWEEN 3 AND 120),
	CONSTRAINT "dena_institute_services_category_ck" CHECK (
    category IN ('consultation', 'career_guidance', 'assessment', 'support', 'other')
  ),
	CONSTRAINT "dena_institute_services_description_ck" CHECK (char_length(description) BETWEEN 10 AND 2000),
	CONSTRAINT "dena_institute_services_price_ck" CHECK (price_toman BETWEEN 1 AND 1000000000000),
	CONSTRAINT "dena_institute_services_quota_ck" CHECK (
    (included_minutes IS NULL AND validity_days IS NULL)
    OR (included_minutes BETWEEN 5 AND 100000 AND validity_days BETWEEN 1 AND 3650)
  ),
	CONSTRAINT "dena_institute_services_policy_ck" CHECK (char_length(cancellation_policy) BETWEEN 1 AND 1500)
);
--> statement-breakpoint
ALTER TABLE "dena_institute_services" ADD CONSTRAINT "dena_institute_services_institute_id_dena_verified_entities_id_fk" FOREIGN KEY ("institute_id") REFERENCES "public"."dena_verified_entities"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dena_institute_services" ADD CONSTRAINT "dena_institute_services_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "dena_institute_services_owner_status_created_idx" ON "dena_institute_services" USING btree ("institute_id","status","created_at");