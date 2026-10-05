CREATE TYPE "public"."dena_course_owner_type" AS ENUM('verified_provider', 'independent_educator', 'institute');--> statement-breakpoint
ALTER TABLE "dena_supervision_grants" DROP CONSTRAINT "dena_supervision_matching_course_fk";
--> statement-breakpoint
DROP INDEX "dena_courses_scope_fk_uidx";--> statement-breakpoint
ALTER TABLE "dena_courses" ALTER COLUMN "provider_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "dena_supervision_events" ALTER COLUMN "provider_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "dena_supervision_grants" ALTER COLUMN "provider_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "dena_courses" ADD COLUMN "owner_type" "dena_course_owner_type" DEFAULT 'verified_provider' NOT NULL;--> statement-breakpoint
ALTER TABLE "dena_courses" ADD COLUMN "independent_educator_profile_id" uuid;--> statement-breakpoint
ALTER TABLE "dena_supervision_events" ADD COLUMN "owner_type" "dena_course_owner_type" DEFAULT 'verified_provider' NOT NULL;--> statement-breakpoint
ALTER TABLE "dena_supervision_events" ADD COLUMN "independent_educator_profile_id" uuid;--> statement-breakpoint
ALTER TABLE "dena_supervision_grants" ADD COLUMN "owner_type" "dena_course_owner_type" DEFAULT 'verified_provider' NOT NULL;--> statement-breakpoint
ALTER TABLE "dena_supervision_grants" ADD COLUMN "independent_educator_profile_id" uuid;--> statement-breakpoint
ALTER TABLE "dena_courses" ADD CONSTRAINT "dena_courses_independent_educator_profile_id_dena_independent_educator_profiles_id_fk" FOREIGN KEY ("independent_educator_profile_id") REFERENCES "public"."dena_independent_educator_profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dena_supervision_events" ADD CONSTRAINT "dena_supervision_events_independent_educator_profile_id_dena_independent_educator_profiles_id_fk" FOREIGN KEY ("independent_educator_profile_id") REFERENCES "public"."dena_independent_educator_profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dena_supervision_grants" ADD CONSTRAINT "dena_supervision_grants_independent_educator_profile_id_dena_independent_educator_profiles_id_fk" FOREIGN KEY ("independent_educator_profile_id") REFERENCES "public"."dena_independent_educator_profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dena_supervision_grants" ADD CONSTRAINT "dena_supervision_matching_course_fk" FOREIGN KEY ("course_id","owner_type","provider_id","independent_educator_profile_id","institute_id") REFERENCES "public"."dena_courses"("id","owner_type","provider_id","independent_educator_profile_id","responsible_institute_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "dena_courses_independent_request_uidx" ON "dena_courses" USING btree ("independent_educator_profile_id","client_request_id") WHERE owner_type = 'independent_educator';--> statement-breakpoint
CREATE UNIQUE INDEX "dena_courses_institute_request_uidx" ON "dena_courses" USING btree ("responsible_institute_id","client_request_id") WHERE owner_type = 'institute';--> statement-breakpoint
CREATE UNIQUE INDEX "dena_courses_owner_scope_fk_uidx" ON "dena_courses" USING btree ("id","owner_type","provider_id","independent_educator_profile_id","responsible_institute_id");--> statement-breakpoint
CREATE INDEX "dena_courses_independent_educator_idx" ON "dena_courses" USING btree ("independent_educator_profile_id","publication_status");--> statement-breakpoint
ALTER TABLE "dena_courses" ADD CONSTRAINT "dena_courses_owner_scope_ck" CHECK (
    (owner_type = 'verified_provider'
      AND provider_id IS NOT NULL AND independent_educator_profile_id IS NULL)
    OR (owner_type = 'independent_educator'
      AND provider_id IS NULL AND independent_educator_profile_id IS NOT NULL)
    OR (owner_type = 'institute'
      AND provider_id IS NULL AND independent_educator_profile_id IS NULL)
  );--> statement-breakpoint
ALTER TABLE "dena_supervision_events" ADD CONSTRAINT "dena_supervision_event_owner_scope_ck" CHECK (
    (owner_type = 'verified_provider'
      AND provider_id IS NOT NULL AND independent_educator_profile_id IS NULL)
    OR (owner_type = 'independent_educator'
      AND provider_id IS NULL AND independent_educator_profile_id IS NOT NULL)
    OR (owner_type = 'institute'
      AND provider_id IS NULL AND independent_educator_profile_id IS NULL)
  );--> statement-breakpoint
ALTER TABLE "dena_supervision_grants" ADD CONSTRAINT "dena_supervision_owner_scope_ck" CHECK (
    (owner_type = 'verified_provider'
      AND provider_id IS NOT NULL AND independent_educator_profile_id IS NULL)
    OR (owner_type = 'independent_educator'
      AND provider_id IS NULL AND independent_educator_profile_id IS NOT NULL)
    OR (owner_type = 'institute'
      AND provider_id IS NULL AND independent_educator_profile_id IS NULL)
  );