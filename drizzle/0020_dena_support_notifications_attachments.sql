CREATE TABLE "dena_technical_support_attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticket_id" uuid NOT NULL,
	"uploaded_by_user_id" uuid NOT NULL,
	"file_name" text NOT NULL,
	"content_type" text NOT NULL,
	"byte_size" integer NOT NULL,
	"sha256" text NOT NULL,
	"object_key" text NOT NULL,
	"status" text DEFAULT 'quarantined' NOT NULL,
	"scanned_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "dena_technical_support_attachments_object_key_unique" UNIQUE("object_key"),
	CONSTRAINT "dena_support_attachment_file_name_ck" CHECK (
    char_length(file_name) BETWEEN 1 AND 180
  ),
	CONSTRAINT "dena_support_attachment_type_ck" CHECK (
    content_type IN ('application/pdf', 'image/jpeg', 'image/png')
  ),
	CONSTRAINT "dena_support_attachment_size_ck" CHECK (
    byte_size BETWEEN 1 AND 10485760
  ),
	CONSTRAINT "dena_support_attachment_hash_ck" CHECK (
    sha256 ~ '^[0-9a-f]{64}$'
  ),
	CONSTRAINT "dena_support_attachment_status_ck" CHECK (
    (status = 'quarantined' AND scanned_at IS NULL)
    OR (status IN ('ready', 'rejected') AND scanned_at IS NOT NULL)
  )
);
--> statement-breakpoint
CREATE TABLE "dena_technical_support_notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recipient_user_id" uuid NOT NULL,
	"ticket_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "dena_support_notification_kind_ck" CHECK (
    kind IN ('ticket_created', 'requester_replied', 'support_replied', 'ticket_updated')
  )
);
--> statement-breakpoint
ALTER TABLE "dena_technical_support_attachments" ADD CONSTRAINT "dena_technical_support_attachments_ticket_id_dena_technical_support_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."dena_technical_support_tickets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dena_technical_support_attachments" ADD CONSTRAINT "dena_technical_support_attachments_uploaded_by_user_id_user_id_fk" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dena_technical_support_notifications" ADD CONSTRAINT "dena_technical_support_notifications_recipient_user_id_user_id_fk" FOREIGN KEY ("recipient_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dena_technical_support_notifications" ADD CONSTRAINT "dena_technical_support_notifications_ticket_id_dena_technical_support_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."dena_technical_support_tickets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "dena_support_attachment_ticket_idx" ON "dena_technical_support_attachments" USING btree ("ticket_id","created_at");--> statement-breakpoint
CREATE INDEX "dena_support_notification_recipient_created_idx" ON "dena_technical_support_notifications" USING btree ("recipient_user_id","created_at");--> statement-breakpoint
CREATE INDEX "dena_support_notification_ticket_idx" ON "dena_technical_support_notifications" USING btree ("ticket_id","created_at");