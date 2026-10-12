# Dena topic-based tutor practice v1

## Behavior
- A student with an opted-in topic profile can request one short practice question for their latest saved topic.
- The topic selection comes from the authenticated student's own profile. The client cannot supply another topic.
- The question response contains its prompt and options only; the answer key stays on the server.
- Answer submission rechecks student role, course entitlement, the latest saved topic and active-exam status. It returns correctness and a brief explanation.
- Practice answers and results are not persisted and are not treated as course grades or mastery measurements.

## Limits
This is deterministic, reviewed practice content associated with the internal seed corpus. It does not learn from videos, change the language tutor's responses, or train a model.
