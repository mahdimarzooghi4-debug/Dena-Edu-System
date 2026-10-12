ALTER TABLE "dena_media_multipart_plans" ADD COLUMN "cancelled_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "dena_media_multipart_plans" DROP CONSTRAINT "dena_multipart_status_ck";--> statement-breakpoint
ALTER TABLE "dena_media_multipart_plans" ADD CONSTRAINT "dena_multipart_status_ck" CHECK (
    status IN ('planned', 'expired', 'cancelled')
  );--> statement-breakpoint
ALTER TABLE "dena_media_multipart_plans" ADD CONSTRAINT "dena_multipart_cancel_ck" CHECK (
    (status = 'cancelled' AND cancelled_at IS NOT NULL)
    OR (status <> 'cancelled' AND cancelled_at IS NULL)
  );
