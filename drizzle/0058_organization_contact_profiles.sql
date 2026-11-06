CREATE TABLE dena_organization_contact_profiles (
  organization_id uuid PRIMARY KEY REFERENCES dena_verified_entities(id) ON DELETE RESTRICT,
  phone text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  address text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  revision integer NOT NULL DEFAULT 0,
  updated_by uuid NOT NULL REFERENCES "user"(id) ON DELETE RESTRICT,
  updated_at timestamptz NOT NULL DEFAULT now()
);
