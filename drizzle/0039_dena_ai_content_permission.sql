CREATE TABLE "dena_ai_content_permission_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "course_id" uuid NOT NULL,
  "asset_id" uuid NOT NULL,
  "institute_id" uuid NOT NULL,
  "actor_user_id" uuid NOT NULL,
  "request_id" uuid NOT NULL,
  "decision" text NOT NULL,
  "rights_review_ref" text,
  "reason" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "dena_ai_permission_asset_course_fk"
    FOREIGN KEY ("asset_id","course_id")
    REFERENCES "public"."dena_private_media_assets"("id","course_id")
    ON DELETE restrict ON UPDATE no action,
  CONSTRAINT "dena_ai_permission_institute_course_fk"
    FOREIGN KEY ("course_id","institute_id")
    REFERENCES "public"."dena_courses"("id","responsible_institute_id")
    ON DELETE restrict ON UPDATE no action,
  CONSTRAINT "dena_ai_content_permission_events_actor_user_id_user_id_fk"
    FOREIGN KEY ("actor_user_id") REFERENCES "public"."user"("id")
    ON DELETE restrict ON UPDATE no action,
  CONSTRAINT "dena_ai_permission_decision_ck" CHECK (
    (decision = 'granted' AND rights_review_ref IS NOT NULL
      AND char_length(btrim(rights_review_ref)) BETWEEN 8 AND 200
      AND reason IS NULL)
    OR (decision = 'revoked' AND rights_review_ref IS NULL
      AND reason IS NOT NULL AND char_length(btrim(reason)) BETWEEN 3 AND 500)
  )
);
--> statement-breakpoint
CREATE UNIQUE INDEX "dena_ai_permission_actor_request_uidx"
  ON "dena_ai_content_permission_events" USING btree ("actor_user_id","request_id");
--> statement-breakpoint
CREATE INDEX "dena_ai_permission_asset_recent_idx"
  ON "dena_ai_content_permission_events" USING btree ("asset_id","created_at","id");
