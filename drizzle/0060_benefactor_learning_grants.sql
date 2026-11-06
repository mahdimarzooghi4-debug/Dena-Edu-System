CREATE TABLE dena_benefactor_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  benefactor_id uuid NOT NULL REFERENCES dena_verified_entities(id) ON DELETE RESTRICT,
  student_user_id uuid NOT NULL REFERENCES "user"(id) ON DELETE RESTRICT,
  UNIQUE (benefactor_id, student_user_id)
);
CREATE TABLE dena_benefactor_learning_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id uuid NOT NULL REFERENCES dena_benefactor_recipients(id) ON DELETE RESTRICT,
  enrollment_id uuid NOT NULL REFERENCES dena_student_enrollments(id) ON DELETE RESTRICT,
  payment_reference text NOT NULL CHECK (char_length(btrim(payment_reference)) BETWEEN 3 AND 200),
  confirmed_by uuid NOT NULL REFERENCES "user"(id) ON DELETE RESTRICT,
  confirmed_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  revoked_by uuid REFERENCES "user"(id) ON DELETE RESTRICT,
  UNIQUE (recipient_id, enrollment_id),
  CHECK ((revoked_at IS NULL) = (revoked_by IS NULL))
);
CREATE INDEX dena_benefactor_recipient_grants_idx ON dena_benefactor_learning_grants(recipient_id);
