CREATE TYPE "public"."dena_financial_entry_account" AS ENUM('gateway_clearing', 'dena_service_commission_payable', 'institute_service_payable', 'dena_provider_commission_payable', 'institute_provider_payable', 'provider_compensation_payable', 'gateway_fee_expense', 'student_refund_payable', 'settlement_bank');--> statement-breakpoint
CREATE TYPE "public"."dena_financial_event_type" AS ENUM('payment_captured', 'gateway_fee_recorded', 'settlement_received', 'refund_issued');--> statement-breakpoint
CREATE TYPE "public"."dena_financial_revenue_stream" AS ENUM('institute_service', 'supervised_provider');--> statement-breakpoint
CREATE TABLE "dena_financial_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"journal_id" uuid NOT NULL,
	"account" "dena_financial_entry_account" NOT NULL,
	"debit_rials" bigint DEFAULT 0 NOT NULL,
	"credit_rials" bigint DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "dena_financial_entry_one_side_ck" CHECK (
    (debit_rials > 0 AND credit_rials = 0)
    OR (credit_rials > 0 AND debit_rials = 0)
  )
);
--> statement-breakpoint
CREATE TABLE "dena_financial_journals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_key" text NOT NULL,
	"revenue_stream" "dena_financial_revenue_stream" NOT NULL,
	"event_type" "dena_financial_event_type" NOT NULL,
	"source_id" uuid NOT NULL,
	"created_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "dena_financial_journals_event_key_unique" UNIQUE("event_key"),
	CONSTRAINT "dena_financial_journal_event_key_ck" CHECK (event_key ~ '^[a-zA-Z0-9_.:-]{8,180}$')
);
--> statement-breakpoint
ALTER TABLE "dena_financial_entries" ADD CONSTRAINT "dena_financial_entries_journal_id_dena_financial_journals_id_fk" FOREIGN KEY ("journal_id") REFERENCES "public"."dena_financial_journals"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dena_financial_journals" ADD CONSTRAINT "dena_financial_journals_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "dena_financial_entry_journal_idx" ON "dena_financial_entries" USING btree ("journal_id","created_at");--> statement-breakpoint
CREATE INDEX "dena_financial_journal_stream_created_idx" ON "dena_financial_journals" USING btree ("revenue_stream","created_at");--> statement-breakpoint
CREATE INDEX "dena_financial_journal_source_idx" ON "dena_financial_journals" USING btree ("source_id","event_type");--> statement-breakpoint
CREATE UNIQUE INDEX "dena_institute_services_scope_uidx" ON "dena_institute_services" USING btree ("id","institute_id");
--> statement-breakpoint
CREATE FUNCTION dena_assert_financial_journal_balanced() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE target_id uuid;
DECLARE entry_count bigint;
DECLARE debit_total numeric;
DECLARE credit_total numeric;
BEGIN
  IF TG_TABLE_NAME = 'dena_financial_journals' THEN
    target_id := NEW.id;
  ELSE
    target_id := NEW.journal_id;
  END IF;

  SELECT count(*), coalesce(sum(debit_rials), 0), coalesce(sum(credit_rials), 0)
    INTO entry_count, debit_total, credit_total
    FROM dena_financial_entries
    WHERE journal_id = target_id;

  IF entry_count < 2 OR debit_total <> credit_total THEN
    RAISE EXCEPTION 'financial journal % must have at least two balanced entries', target_id
      USING ERRCODE = '23514';
  END IF;
  RETURN NULL;
END;
$$;
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER dena_financial_journal_balanced_on_header
AFTER INSERT ON dena_financial_journals
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION dena_assert_financial_journal_balanced();
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER dena_financial_journal_balanced_on_entry
AFTER INSERT ON dena_financial_entries
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION dena_assert_financial_journal_balanced();
--> statement-breakpoint
CREATE FUNCTION dena_reject_financial_ledger_mutation() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'financial ledger rows are immutable; record a correcting event';
END;
$$;
--> statement-breakpoint
CREATE TRIGGER dena_financial_journals_immutable
BEFORE UPDATE OR DELETE ON dena_financial_journals
FOR EACH ROW EXECUTE FUNCTION dena_reject_financial_ledger_mutation();
--> statement-breakpoint
CREATE TRIGGER dena_financial_entries_immutable
BEFORE UPDATE OR DELETE ON dena_financial_entries
FOR EACH ROW EXECUTE FUNCTION dena_reject_financial_ledger_mutation();
