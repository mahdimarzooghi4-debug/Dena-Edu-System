CREATE TABLE dena_provider_compensation_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collaboration_id uuid NOT NULL REFERENCES dena_provider_institute_collaborations(id) ON DELETE RESTRICT,
  client_request_id uuid NOT NULL,
  reference text NOT NULL CHECK (char_length(reference) BETWEEN 3 AND 160),
  share_basis text NOT NULL CHECK (share_basis IN ('institute_before_fee','institute_after_fee')),
  share_basis_points integer NOT NULL CHECK (share_basis_points BETWEEN 0 AND 10000),
  proposed_start date NOT NULL,
  proposed_end date,
  settlement_terms text NOT NULL CHECK (char_length(settlement_terms) BETWEEN 15 AND 1500),
  status text NOT NULL DEFAULT 'draft' CHECK (status = 'draft'),
  created_by uuid NOT NULL REFERENCES "user"(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (collaboration_id,client_request_id),
  CHECK (proposed_end IS NULL OR proposed_end >= proposed_start)
);
CREATE INDEX dena_provider_compensation_drafts_collaboration_idx
ON dena_provider_compensation_drafts (collaboration_id,created_at,id);
