CREATE TYPE "public"."dena_institute_service_order_status" AS ENUM('awaiting_guardian_consent', 'awaiting_payment', 'paid', 'cancelled');--> statement-breakpoint
ALTER TYPE "public"."dena_audit_entity_type" ADD VALUE 'SERVICE_ORDER';--> statement-breakpoint
CREATE TABLE "dena_institute_service_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"idempotency_key" uuid NOT NULL,
	"student_user_id" uuid NOT NULL,
	"service_id" uuid NOT NULL,
	"institute_id" uuid NOT NULL,
	"service_title_snapshot" text NOT NULL,
	"category_snapshot" text NOT NULL,
	"price_toman" bigint NOT NULL,
	"gross_rials" bigint NOT NULL,
	"dena_share_rials" bigint NOT NULL,
	"institute_share_rials" bigint NOT NULL,
	"commission_basis_points" integer DEFAULT 1000 NOT NULL,
	"included_minutes" integer,
	"validity_days" integer,
	"guardian_consent_required" boolean NOT NULL,
	"guardian_consent_confirmed_at" timestamp with time zone,
	"guardian_consent_confirmed_by_user_id" uuid,
	"status" "dena_institute_service_order_status" NOT NULL,
	"paid_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "dena_institute_service_order_snapshot_ck" CHECK (
    char_length(service_title_snapshot) BETWEEN 3 AND 120
    AND category_snapshot IN ('consultation', 'career_guidance', 'assessment', 'support', 'other')
    AND price_toman BETWEEN 1 AND 1000000000000
    AND gross_rials = price_toman * 10
    AND commission_basis_points = 1000
    AND dena_share_rials = gross_rials / 10
    AND institute_share_rials = gross_rials - dena_share_rials
  ),
	CONSTRAINT "dena_institute_service_order_quota_ck" CHECK (
    (included_minutes IS NULL AND validity_days IS NULL)
    OR (included_minutes BETWEEN 5 AND 100000 AND validity_days BETWEEN 1 AND 3650)
  ),
	CONSTRAINT "dena_institute_service_order_consent_ck" CHECK (
    (guardian_consent_confirmed_at IS NULL AND guardian_consent_confirmed_by_user_id IS NULL
      AND status <> 'paid')
    OR (guardian_consent_confirmed_at IS NOT NULL AND guardian_consent_confirmed_by_user_id IS NOT NULL)
  ),
	CONSTRAINT "dena_institute_service_order_state_ck" CHECK (
    (status = 'awaiting_guardian_consent' AND guardian_consent_required = true
      AND guardian_consent_confirmed_at IS NULL AND paid_at IS NULL)
    OR (status = 'awaiting_payment' AND paid_at IS NULL
      AND (guardian_consent_required = false OR guardian_consent_confirmed_at IS NOT NULL))
    OR (status = 'paid' AND paid_at IS NOT NULL
      AND (guardian_consent_required = false OR guardian_consent_confirmed_at IS NOT NULL))
    OR (status = 'cancelled' AND paid_at IS NULL)
  )
);
--> statement-breakpoint
ALTER TABLE "dena_institute_service_orders" ADD CONSTRAINT "dena_institute_service_orders_student_user_id_user_id_fk" FOREIGN KEY ("student_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dena_institute_service_orders" ADD CONSTRAINT "dena_institute_service_orders_guardian_consent_confirmed_by_user_id_user_id_fk" FOREIGN KEY ("guardian_consent_confirmed_by_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dena_institute_service_orders" ADD CONSTRAINT "dena_institute_service_order_service_scope_fk" FOREIGN KEY ("service_id","institute_id") REFERENCES "public"."dena_institute_services"("id","institute_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "dena_institute_service_order_student_idempotency_uidx" ON "dena_institute_service_orders" USING btree ("student_user_id","idempotency_key");--> statement-breakpoint
CREATE INDEX "dena_institute_service_order_student_created_idx" ON "dena_institute_service_orders" USING btree ("student_user_id","created_at");--> statement-breakpoint
CREATE INDEX "dena_institute_service_order_institute_status_idx" ON "dena_institute_service_orders" USING btree ("institute_id","status","created_at");