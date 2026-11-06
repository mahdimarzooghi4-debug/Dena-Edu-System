CREATE TABLE dena_service_refund_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL UNIQUE REFERENCES dena_institute_service_orders(id) ON DELETE RESTRICT,
  requested_by uuid NOT NULL REFERENCES "user"(id) ON DELETE RESTRICT,
  reason text NOT NULL CHECK (char_length(reason) BETWEEN 10 AND 1500),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  reviewed_by uuid REFERENCES "user"(id) ON DELETE RESTRICT,
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((status='pending' AND reviewed_by IS NULL AND reviewed_at IS NULL AND review_note IS NULL)
    OR (status IN ('approved','rejected') AND reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL
      AND review_note IS NOT NULL AND char_length(review_note) BETWEEN 10 AND 1500))
);
CREATE INDEX dena_service_refund_created_idx ON dena_service_refund_requests(created_at,id);
CREATE FUNCTION dena_protect_service_refund_review() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF ROW(NEW.id,NEW.order_id,NEW.requested_by,NEW.reason,NEW.created_at)
    IS DISTINCT FROM ROW(OLD.id,OLD.order_id,OLD.requested_by,OLD.reason,OLD.created_at) THEN
    RAISE EXCEPTION 'refund request identity and reason are immutable';
  END IF;
  IF OLD.status<>'pending' AND ROW(NEW.status,NEW.reviewed_by,NEW.reviewed_at,NEW.review_note)
    IS DISTINCT FROM ROW(OLD.status,OLD.reviewed_by,OLD.reviewed_at,OLD.review_note) THEN
    RAISE EXCEPTION 'refund review is immutable';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER dena_service_refund_review_immutable BEFORE UPDATE ON dena_service_refund_requests
FOR EACH ROW EXECUTE FUNCTION dena_protect_service_refund_review();
