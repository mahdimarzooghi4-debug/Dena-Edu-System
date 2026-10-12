# Admin Dashboard + Audit Log

## Scope

Admin control-plane only. Dena remains a recorded-learning platform and does not become a formal school system.

## Admin dashboard

Route:

- `/admin`

Allowed role:

- `admin`

Metrics:

- users grouped by platform role
- course counts
- supervision states
- exercise states
- recent audit events

The dashboard must not expose:

- OTP values
- session tokens
- media object keys
- student private notes
- student answers

## Audit log

Table:

- `dena_audit_logs`

Fields:

- actor
- role snapshot
- action
- entity type
- entity id
- timestamp

Audit records are append-only from application flows.

## Implemented slice — migration 0017

- `/admin` and `GET /api/admin/overview` show role membership counts, total
  courses, supervision states, one-question practice review states, learning
  assessment review states, and up to 10 of the latest audit events.
- `/admin/audit` and `GET /api/admin/audit` show up to 50 recent events. Both
  APIs require an active admin membership and return `private, no-store` data.
- Current audited decisions are role-application review, course supervision,
  practice review, and learning-assessment review. Audit actions come from a
  fixed allowlist; free-form reasons and applicant evidence are not copied.
- Migration `0017_dena_admin_audit_logs.sql` registers the table in the Drizzle
  schema/journal. The earlier unregistered `0011_dena_audit_logs.sql` draft was
  removed because its migration number collided with the live journal and its
  entity enum no longer matched the product contract.
- Application code only inserts audit rows. There is no purge job or retention
  duration in this slice; production must set least-privilege DB permissions to
  deny `UPDATE`/`DELETE` and complete the legal retention review.

The dashboard reports counts from persisted membership and workflow rows; it
does not expose student answers, video notes, OTP/session values, media object
keys, reviewer reasons, or role-application evidence.
