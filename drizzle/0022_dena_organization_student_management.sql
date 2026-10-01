ALTER TYPE "public"."dena_audit_entity_type" ADD VALUE 'ORGANIZATION_STUDENT';--> statement-breakpoint
ALTER TYPE "public"."dena_audit_entity_type" ADD VALUE 'ORGANIZATION_API_KEY';--> statement-breakpoint
CREATE TABLE "dena_organization_api_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"secret_hash" text NOT NULL,
	"prefix" text NOT NULL,
	"label" text NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"last_used_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"rotated_from_key_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "dena_organization_api_keys_secret_hash_unique" UNIQUE("secret_hash"),
	CONSTRAINT "dena_org_api_key_label_ck" CHECK (char_length(label) BETWEEN 1 AND 80),
	CONSTRAINT "dena_org_api_key_prefix_ck" CHECK (prefix ~ '^dena_org_[A-Za-z0-9_-]{8}$')
);
--> statement-breakpoint
CREATE TABLE "dena_organization_students" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"national_code_ciphertext" text NOT NULL,
	"national_code_hash" text NOT NULL,
	"birth_date" date NOT NULL,
	"national_code_last4" text NOT NULL,
	"gender" text NOT NULL,
	"email" text,
	"created_by_user_id" uuid NOT NULL,
	"source" text DEFAULT 'manual' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "dena_org_student_name_ck" CHECK (
    char_length(first_name) BETWEEN 1 AND 80 AND char_length(last_name) BETWEEN 1 AND 100
  ),
	CONSTRAINT "dena_org_student_national_code_last4_ck" CHECK (national_code_last4 ~ '^\d{4}$'),
	CONSTRAINT "dena_org_student_gender_ck" CHECK (gender IN ('female', 'male', 'prefer_not_to_say')),
	CONSTRAINT "dena_org_student_source_ck" CHECK (source IN ('manual', 'bulk', 'api'))
);
--> statement-breakpoint
ALTER TABLE "dena_organization_api_keys" ADD CONSTRAINT "dena_organization_api_keys_organization_id_dena_verified_entities_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."dena_verified_entities"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dena_organization_api_keys" ADD CONSTRAINT "dena_organization_api_keys_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dena_organization_students" ADD CONSTRAINT "dena_organization_students_organization_id_dena_verified_entities_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."dena_verified_entities"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dena_organization_students" ADD CONSTRAINT "dena_organization_students_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dena_organization_students" ADD CONSTRAINT "dena_organization_students_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "dena_org_api_keys_scope_active_idx" ON "dena_organization_api_keys" USING btree ("organization_id","revoked_at");--> statement-breakpoint
CREATE UNIQUE INDEX "dena_org_student_scope_user_uidx" ON "dena_organization_students" USING btree ("organization_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "dena_org_student_scope_national_code_uidx" ON "dena_organization_students" USING btree ("organization_id","national_code_hash");--> statement-breakpoint
CREATE INDEX "dena_org_students_scope_created_idx" ON "dena_organization_students" USING btree ("organization_id","created_at");