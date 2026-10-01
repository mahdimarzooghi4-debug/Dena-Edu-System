ALTER TABLE "dena_institute_service_orders" DROP CONSTRAINT "dena_institute_service_order_consent_ck";--> statement-breakpoint
ALTER TABLE "dena_institute_service_orders" ADD CONSTRAINT "dena_institute_service_order_consent_ck" CHECK (
    (guardian_consent_required = false AND guardian_consent_confirmed_at IS NULL
      AND guardian_consent_confirmed_by_user_id IS NULL)
    OR (guardian_consent_required = true AND status IN ('awaiting_guardian_consent', 'cancelled')
      AND guardian_consent_confirmed_at IS NULL AND guardian_consent_confirmed_by_user_id IS NULL)
    OR (guardian_consent_required = true AND guardian_consent_confirmed_at IS NOT NULL
      AND guardian_consent_confirmed_by_user_id IS NOT NULL)
  );