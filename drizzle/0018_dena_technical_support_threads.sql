CREATE TABLE "dena_technical_support_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticket_id" uuid NOT NULL,
	"author_user_id" uuid NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "dena_support_message_body_ck" CHECK (
    char_length(body) BETWEEN 1 AND 5000
  )
);
--> statement-breakpoint
CREATE TABLE "dena_technical_support_tickets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"requester_user_id" uuid NOT NULL,
	"subject" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "dena_support_ticket_subject_ck" CHECK (
    char_length(subject) BETWEEN 3 AND 120
  )
);
--> statement-breakpoint
ALTER TABLE "dena_technical_support_messages" ADD CONSTRAINT "dena_technical_support_messages_ticket_id_dena_technical_support_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."dena_technical_support_tickets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dena_technical_support_messages" ADD CONSTRAINT "dena_technical_support_messages_author_user_id_user_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dena_technical_support_tickets" ADD CONSTRAINT "dena_technical_support_tickets_requester_user_id_user_id_fk" FOREIGN KEY ("requester_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "dena_support_message_ticket_created_idx" ON "dena_technical_support_messages" USING btree ("ticket_id","created_at");--> statement-breakpoint
CREATE INDEX "dena_support_ticket_requester_updated_idx" ON "dena_technical_support_tickets" USING btree ("requester_user_id","updated_at");--> statement-breakpoint
CREATE INDEX "dena_support_ticket_updated_idx" ON "dena_technical_support_tickets" USING btree ("updated_at");