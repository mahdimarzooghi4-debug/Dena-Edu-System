ALTER TABLE "dena_technical_support_tickets" ADD COLUMN "assigned_to_user_id" uuid;--> statement-breakpoint
ALTER TABLE "dena_technical_support_tickets" ADD COLUMN "status" text DEFAULT 'new' NOT NULL;--> statement-breakpoint
ALTER TABLE "dena_technical_support_tickets" ADD COLUMN "priority" text DEFAULT 'normal' NOT NULL;--> statement-breakpoint
ALTER TABLE "dena_technical_support_tickets" ADD COLUMN "first_response_due_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "dena_technical_support_tickets" ADD COLUMN "resolution_due_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "dena_technical_support_tickets" ADD COLUMN "resolution_paused_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "dena_technical_support_tickets" ADD COLUMN "first_responded_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "dena_technical_support_tickets" ADD COLUMN "resolved_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "dena_technical_support_tickets" ADD COLUMN "closed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "dena_technical_support_tickets" ADD CONSTRAINT "dena_technical_support_tickets_assigned_to_user_id_user_id_fk" FOREIGN KEY ("assigned_to_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "dena_support_ticket_assignment_status_idx" ON "dena_technical_support_tickets" USING btree ("assigned_to_user_id","status");--> statement-breakpoint
CREATE INDEX "dena_support_ticket_priority_status_idx" ON "dena_technical_support_tickets" USING btree ("priority","status");--> statement-breakpoint
ALTER TABLE "dena_technical_support_tickets" ADD CONSTRAINT "dena_support_ticket_status_ck" CHECK (
    status IN ('new', 'in_progress', 'waiting_requester', 'resolved', 'closed')
  );--> statement-breakpoint
ALTER TABLE "dena_technical_support_tickets" ADD CONSTRAINT "dena_support_ticket_priority_ck" CHECK (
    priority IN ('low', 'normal', 'high', 'urgent')
  );--> statement-breakpoint
ALTER TABLE "dena_technical_support_tickets" ADD CONSTRAINT "dena_support_ticket_dates_ck" CHECK (
    (status = 'closed' AND closed_at IS NOT NULL)
    OR (status <> 'closed' AND closed_at IS NULL)
  );--> statement-breakpoint
ALTER TABLE "dena_technical_support_tickets" ALTER COLUMN "first_response_due_at" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "dena_technical_support_tickets" ALTER COLUMN "resolution_due_at" DROP DEFAULT;
