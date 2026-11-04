CREATE TABLE "dena_service_order_attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"service_order_id" uuid NOT NULL,
	"uploaded_by_user_id" uuid NOT NULL,
	"file_name" text NOT NULL,
	"content_type" text NOT NULL,
	"byte_size" integer NOT NULL,
	"sha256" text NOT NULL,
	"object_key" text NOT NULL,
	"status" text DEFAULT 'quarantined' NOT NULL,
	"scanned_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "dena_service_order_attachments_object_key_unique" UNIQUE("object_key"),
	CONSTRAINT "dena_service_order_attachment_name_ck" CHECK (char_length(file_name) BETWEEN 1 AND 180),
	CONSTRAINT "dena_service_order_attachment_type_ck" CHECK (
    content_type IN ('application/pdf', 'image/jpeg', 'image/png')
  ),
	CONSTRAINT "dena_service_order_attachment_size_ck" CHECK (byte_size BETWEEN 1 AND 10485760),
	CONSTRAINT "dena_service_order_attachment_hash_ck" CHECK (sha256 ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "dena_service_order_attachment_status_ck" CHECK (
    (status IN ('uploading', 'quarantined', 'failed') AND scanned_at IS NULL)
    OR (status IN ('ready', 'rejected') AND scanned_at IS NOT NULL)
  )
);
--> statement-breakpoint
CREATE TABLE "dena_service_order_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"service_order_id" uuid NOT NULL,
	"sender_user_id" uuid NOT NULL,
	"idempotency_key" uuid NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "dena_service_order_message_body_ck" CHECK (
    char_length(body) BETWEEN 1 AND 4000 AND btrim(body) <> ''
  )
);
--> statement-breakpoint
ALTER TABLE "dena_service_order_attachments" ADD CONSTRAINT "dena_service_order_attachments_service_order_id_dena_institute_service_orders_id_fk" FOREIGN KEY ("service_order_id") REFERENCES "public"."dena_institute_service_orders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dena_service_order_attachments" ADD CONSTRAINT "dena_service_order_attachments_uploaded_by_user_id_user_id_fk" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dena_service_order_messages" ADD CONSTRAINT "dena_service_order_messages_service_order_id_dena_institute_service_orders_id_fk" FOREIGN KEY ("service_order_id") REFERENCES "public"."dena_institute_service_orders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dena_service_order_messages" ADD CONSTRAINT "dena_service_order_messages_sender_user_id_user_id_fk" FOREIGN KEY ("sender_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "dena_service_order_attachment_order_created_idx" ON "dena_service_order_attachments" USING btree ("service_order_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "dena_service_order_message_idempotency_uidx" ON "dena_service_order_messages" USING btree ("service_order_id","sender_user_id","idempotency_key");--> statement-breakpoint
CREATE INDEX "dena_service_order_message_order_created_idx" ON "dena_service_order_messages" USING btree ("service_order_id","created_at","id");