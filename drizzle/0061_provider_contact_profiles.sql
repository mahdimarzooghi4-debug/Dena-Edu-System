CREATE TABLE dena_provider_contact_profiles (
  provider_id uuid PRIMARY KEY REFERENCES dena_verified_entities(id) ON DELETE RESTRICT,
  brand_name text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  city text NOT NULL DEFAULT '',
  categories text[] NOT NULL DEFAULT '{}',
  revision integer NOT NULL DEFAULT 0 CHECK (revision >= 0),
  updated_by uuid NOT NULL REFERENCES "user"(id) ON DELETE RESTRICT,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (char_length(brand_name) <= 120 AND char_length(phone) <= 40 AND char_length(email) <= 254 AND char_length(city) <= 100),
  CHECK (categories <@ ARRAY['consultation','content','learning_support','assessment']::text[])
);
