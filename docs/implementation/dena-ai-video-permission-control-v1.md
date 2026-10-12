# Dena AI video permission control v1

## Scope delivered

This change creates a database-backed, per-video institute decision log and a student-scoped source eligibility endpoint. A missing decision is a denial. A later revocation immediately removes the video from the eligibility response.

This is an authorization control plane. It does **not** ingest media, create transcripts or embeddings, train a model, retrieve content for an answer, spend quota, or enable the student AI response endpoint. That endpoint remains fail-closed with `AI_TUTOR_UNAVAILABLE`.

## Authority and limits

- A grant is accepted for a ready video in an institute-owned course or a course whose independent educator currently has an approved affiliation and an approved supervision grant with that institute. The decision must come from an active member of the responsible institute.
- Verified-provider courses remain ineligible. An independent-educator-owned course is eligible only while the responsible institute's supervision decision and the educator affiliation are both approved; revocation or transfer removes the active independent-educator scope. A supervising institute may review the course's videos using the existing per-video rights reference.
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

The response is a point-in-time manifest and does not authorize byte access. The manual transcript path rechecks student entitlement, active institute supervision for an independent-educator-owned course, ready media and the latest permission before reading text. Permission revocation serializes on the video row and deletes its transcript chunks in the same transaction.

## Data and tests

Migration `0039_dena_ai_content_permission.sql` creates a scoped event table with composite foreign keys to the exact asset/course and course/institute pair, decision checks, an idempotency index and an asset history index. There are no backfilled grants, so existing videos remain unavailable to AI by default.

CI must pass schema generation/drift validation, typecheck, unit tests and the PostgreSQL integration suite. Before production AI content processing is enabled, complete real rights-review operations and verify production DB append-only privileges for the permission event log. Verified-provider-owned courses remain blocked. Supervised independent-educator courses are eligible only within the active institute affiliation and supervision scope. The code serializes transcript submission against permission events and removes chunks on revocation; production rollout still requires concurrency tests and operational verification.
