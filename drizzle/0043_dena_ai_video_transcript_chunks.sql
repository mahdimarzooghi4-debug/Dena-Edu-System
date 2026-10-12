CREATE TABLE "dena_ai_video_transcript_chunks" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "asset_id" uuid NOT NULL,
  "course_id" uuid NOT NULL,
  "created_by_user_id" uuid NOT NULL,
  "chunk_index" integer NOT NULL,
  "chunk_text" text NOT NULL,
  "source_sha256" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "dena_ai_video_transcript_asset_course_fk"
    FOREIGN KEY ("asset_id", "course_id")
    REFERENCES "dena_private_media_assets"("id", "course_id")
    ON DELETE RESTRICT,
  CONSTRAINT "dena_ai_video_transcript_chunks_created_by_user_id_user_id_fk"
    FOREIGN KEY ("created_by_user_id") REFERENCES "user"("id")
    ON DELETE RESTRICT,
  CONSTRAINT "dena_ai_video_transcript_bounds_ck"
    CHECK (
      chunk_index BETWEEN 0 AND 99
      AND char_length(chunk_text) BETWEEN 1 AND 1000
      AND char_length(source_sha256) = 64
      AND source_sha256 ~ '^[0-9a-f]{64}'
    )
);
--> statement-breakpoint
CREATE UNIQUE INDEX "dena_ai_video_transcript_asset_chunk_uidx"
  ON "dena_ai_video_transcript_chunks" USING btree ("asset_id", "chunk_index");
--> statement-breakpoint
CREATE INDEX "dena_ai_video_transcript_course_asset_idx"
  ON "dena_ai_video_transcript_chunks" USING btree ("course_id", "asset_id", "chunk_index");
