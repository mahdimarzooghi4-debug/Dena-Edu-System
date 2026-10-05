CREATE TABLE "dena_course_ownership_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" uuid NOT NULL,
	"source_affiliation_id" uuid NOT NULL,
	"actor_user_id" uuid NOT NULL,
	"previous_owner_type" "dena_course_owner_type" NOT NULL,
	"previous_provider_id" uuid,
	"previous_educator_profile_id" uuid,
	"next_owner_type" "dena_course_owner_type" NOT NULL,
	"institute_id" uuid NOT NULL,
	"reason" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "dena_course_ownership_transfer_ck" CHECK (
      previous_owner_type = 'independent_educator'
      AND previous_provider_id IS NULL
      AND previous_educator_profile_id IS NOT NULL
      AND next_owner_type = 'institute'
      AND char_length(reason) BETWEEN 15 AND 500 AND btrim(reason) <> ''
    )
);
--> statement-breakpoint
ALTER TABLE "dena_course_ownership_events" ADD CONSTRAINT "dena_course_ownership_events_course_id_dena_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."dena_courses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dena_course_ownership_events" ADD CONSTRAINT "dena_course_ownership_events_source_affiliation_id_dena_educator_institute_affiliations_id_fk" FOREIGN KEY ("source_affiliation_id") REFERENCES "public"."dena_educator_institute_affiliations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dena_course_ownership_events" ADD CONSTRAINT "dena_course_ownership_events_actor_user_id_user_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dena_course_ownership_events" ADD CONSTRAINT "dena_course_ownership_events_previous_educator_profile_id_dena_independent_educator_profiles_id_fk" FOREIGN KEY ("previous_educator_profile_id") REFERENCES "public"."dena_independent_educator_profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dena_course_ownership_events" ADD CONSTRAINT "dena_course_ownership_events_institute_id_dena_verified_entities_id_fk" FOREIGN KEY ("institute_id") REFERENCES "public"."dena_verified_entities"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "dena_course_ownership_transfer_uidx" ON "dena_course_ownership_events" USING btree ("course_id","source_affiliation_id");--> statement-breakpoint
CREATE INDEX "dena_course_ownership_course_idx" ON "dena_course_ownership_events" USING btree ("course_id","created_at");