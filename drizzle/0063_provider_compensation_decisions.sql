ALTER TABLE dena_provider_compensation_drafts
  DROP CONSTRAINT dena_provider_compensation_drafts_status_check;
ALTER TABLE dena_provider_compensation_drafts
  ADD COLUMN decided_by uuid REFERENCES "user"(id) ON DELETE RESTRICT,
  ADD COLUMN decided_at timestamptz,
  ADD CONSTRAINT dena_provider_compensation_status_check CHECK (status IN ('draft','accepted','rejected')),
  ADD CONSTRAINT dena_provider_compensation_decision_check CHECK (
    (status='draft' AND decided_by IS NULL AND decided_at IS NULL) OR
    (status IN ('accepted','rejected') AND decided_by IS NOT NULL AND decided_at IS NOT NULL)
  );
