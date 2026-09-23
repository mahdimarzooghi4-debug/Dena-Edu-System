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
