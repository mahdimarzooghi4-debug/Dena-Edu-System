ALTER TABLE "dena_media_multipart_plans" ALTER COLUMN "provider_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "dena_media_multipart_plans" ADD COLUMN "owner_type" "dena_course_owner_type" DEFAULT 'verified_provider' NOT NULL;--> statement-breakpoint
ALTER TABLE "dena_media_multipart_plans" ADD COLUMN "independent_educator_profile_id" uuid;--> statement-breakpoint
ALTER TABLE "dena_media_multipart_plans" ADD CONSTRAINT "dena_media_multipart_plans_independent_educator_profile_id_dena_independent_educator_profiles_id_fk" FOREIGN KEY ("independent_educator_profile_id") REFERENCES "public"."dena_independent_educator_profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dena_media_multipart_plans" ADD CONSTRAINT "dena_multipart_owner_scope_ck" CHECK (
    (owner_type = 'verified_provider' AND provider_id IS NOT NULL
      AND independent_educator_profile_id IS NULL)
    OR (owner_type = 'independent_educator' AND provider_id IS NULL
      AND independent_educator_profile_id IS NOT NULL)
  );