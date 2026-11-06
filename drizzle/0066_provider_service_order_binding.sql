CREATE TABLE dena_provider_service_contracts (
  service_id uuid PRIMARY KEY REFERENCES dena_institute_services(id) ON DELETE RESTRICT,
  contract_id uuid NOT NULL REFERENCES dena_provider_compensation_drafts(id) ON DELETE RESTRICT,
  assigned_by uuid NOT NULL REFERENCES "user"(id) ON DELETE RESTRICT,
  assigned_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE dena_institute_service_orders ADD COLUMN provider_contract_id uuid
  REFERENCES dena_provider_compensation_drafts(id) ON DELETE RESTRICT;
CREATE INDEX dena_service_orders_provider_contract_idx ON dena_institute_service_orders(provider_contract_id);
CREATE FUNCTION dena_protect_service_order_provider_contract() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.provider_contract_id IS DISTINCT FROM OLD.provider_contract_id THEN
    RAISE EXCEPTION 'service order provider contract snapshot is immutable';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER dena_service_order_provider_contract_immutable BEFORE UPDATE ON dena_institute_service_orders
FOR EACH ROW EXECUTE FUNCTION dena_protect_service_order_provider_contract();
