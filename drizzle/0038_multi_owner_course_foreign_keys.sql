ALTER TABLE "dena_supervision_grants" DROP CONSTRAINT "dena_supervision_matching_course_fk";
--> statement-breakpoint
ALTER TABLE "dena_courses" DROP CONSTRAINT "dena_courses_owner_scope_fk_uq";--> statement-breakpoint
CREATE UNIQUE INDEX "dena_courses_scope_fk_uidx" ON "dena_courses" USING btree ("id","provider_id","responsible_institute_id");--> statement-breakpoint
CREATE UNIQUE INDEX "dena_courses_independent_scope_fk_uidx" ON "dena_courses" USING btree ("id","independent_educator_profile_id","responsible_institute_id");--> statement-breakpoint
ALTER TABLE "dena_supervision_grants" ADD CONSTRAINT "dena_supervision_matching_provider_course_fk" FOREIGN KEY ("course_id","provider_id","institute_id") REFERENCES "public"."dena_courses"("id","provider_id","responsible_institute_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dena_supervision_grants" ADD CONSTRAINT "dena_supervision_matching_independent_course_fk" FOREIGN KEY ("course_id","independent_educator_profile_id","institute_id") REFERENCES "public"."dena_courses"("id","independent_educator_profile_id","responsible_institute_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dena_supervision_grants" ADD CONSTRAINT "dena_supervision_matching_institute_course_fk" FOREIGN KEY ("course_id","institute_id") REFERENCES "public"."dena_courses"("id","responsible_institute_id") ON DELETE cascade ON UPDATE no action;
