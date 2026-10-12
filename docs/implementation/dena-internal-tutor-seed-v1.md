# Dena internal tutor starter v1

## Delivered
- The student tutor page now provides a chat form for enrolled students.
- The API still checks the authenticated student, active enrollment and active-exam block before responding.
- Responses come from a small Dena-authored Persian starter corpus for linear equations, fractions and percentages.
- Each supported answer returns its corpus item ID and corpus version.
- Questions outside that corpus return `STARTER_CONTENT_NOT_FOUND`; the system does not invent an answer or call an external model.
- Conversation text is not persisted.

## Current limits
This is deterministic keyword retrieval over curated examples, not a trained language model and not retrieval from course videos. Course selection is an access check only. The starter corpus is not personalized to a student's weak areas. Video processing remains disabled until rights evidence, database append-only enforcement, revocation invalidation, isolated per-student learning records and race handling are ready.

## Verification
The pure retrieval unit tests cover supported retrieval, Persian/Arabic character normalization and unknown-topic refusal. The PR CI run remains the integration gate for typecheck, lint, build and the existing database authorization tests.
