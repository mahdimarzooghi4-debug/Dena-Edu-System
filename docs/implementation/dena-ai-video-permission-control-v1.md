# Dena AI video permission control v1

## Scope delivered

This change creates a database-backed, per-video institute decision log and a student-scoped source eligibility endpoint. A missing decision is a denial. A later revocation immediately removes the video from the eligibility response.

This is an authorization control plane. It does **not** ingest media, create transcripts or embeddings, train a model, retrieve content for an answer, spend quota, or enable the student AI response endpoint. That endpoint remains fail-closed with `AI_TUTOR_UNAVAILABLE`.

## Authority and limits

- A grant is accepted only for a ready video in a course owned by the responsible institute, and only from an active member of that same institute.
- Provider-owned and independent-educator-owned courses cannot receive an AI grant through this route. They need a separate owner authorization workflow before any AI processing can be enabled. The responsible institute can still record a revocation for its course.
- A grant requires a `rightsReviewRef`: a short reference to the institute's external rights review record. Dena validates and stores the reference but does not verify its truth, legal sufficiency, or copyright ownership. A reference is an audit pointer, not proof.
- Grants and revocations are insert-only events at the application layer. Every event records the authenticated actor, institute, course, asset, request ID, decision and timestamp. Replays with the same actor/request ID are idempotent; reuse for different data conflicts.
- Production database credentials must deny `UPDATE` and `DELETE` on `dena_ai_content_permission_events`. This privilege boundary is an operational release gate and is not created by this migration.

## Endpoints

### Institute

`GET /api/institute/courses/:courseId/ai-permissions` returns up to 100 asset IDs, titles, media status and the latest permission state to an active member of the responsible institute. It never returns the object storage key.

`POST /api/institute/courses/:courseId/ai-permissions` accepts one strict event:

- Grant: `{ decision: "granted", assetId, requestId, rightsReviewRef }`
- Revoke: `{ decision: "revoked", assetId, requestId, reason }`

Both operations require same-origin requests and a server-authenticated session. Client-supplied user or institute IDs are ignored.

### Student

`GET /api/student/ai-tutor/sources?courseId=...` requires an active student session and a current course entitlement. It returns only ready asset IDs and titles whose latest event is a grant. It excludes withdrawn videos, missing/ revoked permission, unpublished or unsupervised courses, and cancelled enrollments through the entitlement check.

The response is a point-in-time manifest. Any future retrieval pipeline must recheck entitlement, publication, supervision, media status and the latest permission immediately before reading derived content; it must also invalidate derived content after a revocation. This endpoint does not authorize byte access.

## Data and tests

Migration `0039_dena_ai_content_permission.sql` creates a scoped event table with composite foreign keys to the exact asset/course and course/institute pair, decision checks, an idempotency index and an asset history index. There are no backfilled grants, so existing videos remain unavailable to AI by default.

CI must pass schema generation/drift validation, typecheck, unit tests and the PostgreSQL integration suite. Before any future AI content processing can be enabled, add owner authorization for non-institute-owned courses, production DB append-only privileges, real rights-review operations, derived-content deletion/invalidation, and concurrency tests for grant/revoke races.
