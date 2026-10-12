CREATE TABLE "dena_student_video_notes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "student_user_id" uuid NOT NULL,
  "asset_id" uuid NOT NULL,
  "body" text NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "dena_video_note_body_ck" CHECK (
    char_length(body) BETWEEN 1 AND 2000 AND btrim(body) <> ''
  )
);
--> statement-breakpoint
ALTER TABLE "dena_student_video_notes"
  ADD CONSTRAINT "dena_student_video_notes_student_user_id_user_id_fk"
  FOREIGN KEY ("student_user_id") REFERENCES "public"."user"("id")
  ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "dena_student_video_notes"
  ADD CONSTRAINT "dena_student_video_notes_asset_id_dena_private_media_assets_id_fk"
  FOREIGN KEY ("asset_id") REFERENCES "public"."dena_private_media_assets"("id")
  ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "dena_student_asset_note_uidx"
  ON "dena_student_video_notes" USING btree ("student_user_id","asset_id");
--> statement-breakpoint
CREATE INDEX "dena_video_note_asset_idx"
  ON "dena_student_video_notes" USING btree ("asset_id");
