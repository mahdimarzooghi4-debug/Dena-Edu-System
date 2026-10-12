ALTER TABLE "dena_technical_support_attachments" DROP CONSTRAINT "dena_support_attachment_status_ck";--> statement-breakpoint
ALTER TABLE "dena_technical_support_notifications" DROP CONSTRAINT "dena_support_notification_kind_ck";--> statement-breakpoint
ALTER TABLE "dena_technical_support_attachments" ADD CONSTRAINT "dena_support_attachment_status_ck" CHECK (
    (status IN ('uploading', 'quarantined', 'failed') AND scanned_at IS NULL)
    OR (status IN ('ready', 'rejected') AND scanned_at IS NOT NULL)
  );--> statement-breakpoint
ALTER TABLE "dena_technical_support_notifications" ADD CONSTRAINT "dena_support_notification_kind_ck" CHECK (
    kind IN ('ticket_created', 'requester_replied', 'support_replied', 'ticket_updated', 'attachment_added', 'attachment_scanned')
  );