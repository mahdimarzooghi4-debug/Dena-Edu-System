ALTER TABLE "dena_organization_students" ADD COLUMN "guardian_consent_confirmed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "dena_organization_students" ADD COLUMN "guardian_consent_confirmed_by_user_id" uuid;--> statement-breakpoint
ALTER TABLE "dena_organization_students" ADD CONSTRAINT "dena_organization_students_guardian_consent_confirmed_by_user_id_user_id_fk" FOREIGN KEY ("guardian_consent_confirmed_by_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;
