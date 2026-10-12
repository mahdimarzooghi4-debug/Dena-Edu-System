# Dena private tutor topic profile v1

## Behavior
- Students may opt in, per question, to save its matched starter-corpus topic.
- The database stores only the authenticated student ID, a checked topic ID, a bounded question count, and first/last asked timestamps. Free-text prompts and answers are never stored.
- The tutor page shows the signed-in student's own topic counts. It does not call these counts mastery or assessment results.
- Unchecked questions do not create or update profile rows.
- A student can inspect and clear their own rows. The delete endpoint requires same-origin and student authentication; it never accepts a target student ID.
- Topic IDs are constrained to the current Dena starter corpus. The record is not shared with institutes or other students.

## Limits
This profile does not yet change tutor answers or train a model. It is a private, opt-in signal that can later support a reviewed personalization feature. Video content is still not processed.

## Verification
The database-backed browser test covers opt-in, default-off behavior, cross-student isolation, same-origin deletion and successful deletion. Migration 0040_dena_student_ai_tutor_topics.sql is included with a Drizzle snapshot.
