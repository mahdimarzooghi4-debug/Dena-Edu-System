CREATE TABLE dena_provider_revenue_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_key text NOT NULL UNIQUE,
  source_id uuid NOT NULL UNIQUE,
  contract_id uuid NOT NULL REFERENCES dena_provider_compensation_drafts(id) ON DELETE RESTRICT,
  captured_at timestamptz NOT NULL,
  gross_rials bigint NOT NULL CHECK (gross_rials > 0),
  dena_share_rials bigint NOT NULL CHECK (dena_share_rials > 0),
  gateway_fee_rials bigint NOT NULL CHECK (gateway_fee_rials >= 0),
  provider_share_rials bigint NOT NULL CHECK (provider_share_rials >= 0),
  institute_net_rials bigint NOT NULL CHECK (institute_net_rials >= 0),
  capture_journal_id uuid NOT NULL UNIQUE REFERENCES dena_financial_journals(id) ON DELETE RESTRICT,
  fee_journal_id uuid UNIQUE REFERENCES dena_financial_journals(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (gross_rials = dena_share_rials + gateway_fee_rials + provider_share_rials + institute_net_rials),
  CHECK ((gateway_fee_rials=0 AND fee_journal_id IS NULL) OR (gateway_fee_rials>0 AND fee_journal_id IS NOT NULL))
);
CREATE INDEX dena_provider_revenue_contract_idx ON dena_provider_revenue_allocations(contract_id,captured_at,id);
CREATE TRIGGER dena_provider_revenue_allocations_immutable
BEFORE UPDATE OR DELETE ON dena_provider_revenue_allocations
FOR EACH ROW EXECUTE FUNCTION dena_reject_financial_ledger_mutation();

CREATE FUNCTION dena_protect_compensation_terms() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF ROW(NEW.collaboration_id,NEW.client_request_id,NEW.reference,NEW.share_basis,NEW.share_basis_points,
      NEW.proposed_start,NEW.proposed_end,NEW.settlement_terms,NEW.created_by,NEW.created_at)
    IS DISTINCT FROM ROW(OLD.collaboration_id,OLD.client_request_id,OLD.reference,OLD.share_basis,OLD.share_basis_points,
      OLD.proposed_start,OLD.proposed_end,OLD.settlement_terms,OLD.created_by,OLD.created_at) THEN
    RAISE EXCEPTION 'compensation terms are immutable; create a new proposal';
  END IF;
  IF NEW.status <> OLD.status AND NOT (
    (OLD.status='draft' AND NEW.status IN ('accepted','rejected')) OR
    (OLD.status='accepted' AND NEW.status='active')
  ) THEN RAISE EXCEPTION 'invalid compensation status transition'; END IF;
  IF OLD.decided_at IS NOT NULL AND ROW(NEW.decided_at,NEW.decided_by) IS DISTINCT FROM ROW(OLD.decided_at,OLD.decided_by) THEN
    RAISE EXCEPTION 'compensation decision is immutable';
  END IF;
  IF OLD.activated_at IS NOT NULL AND ROW(NEW.activated_at,NEW.activated_by) IS DISTINCT FROM ROW(OLD.activated_at,OLD.activated_by) THEN
    RAISE EXCEPTION 'compensation activation is immutable';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER dena_provider_compensation_terms_immutable
BEFORE UPDATE ON dena_provider_compensation_drafts FOR EACH ROW EXECUTE FUNCTION dena_protect_compensation_terms();
