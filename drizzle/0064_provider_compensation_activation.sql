ALTER TABLE dena_provider_compensation_drafts
  DROP CONSTRAINT dena_provider_compensation_status_check,
  DROP CONSTRAINT dena_provider_compensation_decision_check,
  ADD COLUMN activated_by uuid REFERENCES "user"(id) ON DELETE RESTRICT,
  ADD COLUMN activated_at timestamptz,
  ADD CONSTRAINT dena_provider_compensation_status_check CHECK (status IN ('draft','accepted','rejected','active')),
  ADD CONSTRAINT dena_provider_compensation_decision_check CHECK (
    (status='draft' AND decided_by IS NULL AND decided_at IS NULL) OR
    (status IN ('accepted','rejected','active') AND decided_by IS NOT NULL AND decided_at IS NOT NULL)
  ),
  ADD CONSTRAINT dena_provider_compensation_activation_check CHECK (
    (status='active' AND activated_by IS NOT NULL AND activated_at IS NOT NULL) OR
    (status<>'active' AND activated_by IS NULL AND activated_at IS NULL)
  );
