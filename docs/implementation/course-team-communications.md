# Course Team Communications

Status: implementation slice on `feat/student-course-team-communications`

## Product contract

A course is the educational container. Its educational team may contain:

- `teacher` — مدرس
- `academic_supporter` — پشتیبان تحصیلی
- `counselor` — مشاور

These are **course assignments**, not global Dena account roles. A single account
may therefore be a student in one context and hold an explicitly assigned
educational role in another course.

The institute responsible for the course owns these assignments.

## Student communication

Student communication is course-scoped and currently enabled only for:

- academic supporter
- counselor

Teacher direct messaging is intentionally **not enabled** until a separate
product rule explicitly allows it.

A conversation is uniquely bound to:

`student + course-team assignment`

The student cannot create a global DM or contact another student.

No phone number, personal email, authentication data, OTP data or private
learning note is selected by the course-team communication readers.

## Academic supporter sessions

Problem-solving sessions belong only to `academic_supporter` assignments.

The institute can enable or disable student session requests per supporter
assignment. When disabled, the student cannot submit a request.

Supported student-visible request states:

- submitted
- under_review
- scheduled
- declined

Supported session states:

- scheduled
- held
- cancelled

No meeting provider, duration, physical location or attendance policy is
invented by this slice.

## Authorization

Every student read/write requires a current student entitlement for the exact
course. That entitlement includes:

- active student membership
- active enrollment
- published course
- approved supervision
- active provider/institute scope
- ready private course content

Every course-team read/write requires an active assignment owned by the current
authenticated user.

Message writes re-check the active assignment inside their database
transaction so a concurrent assignment deactivation cannot be used as a stale
authorization token.

Institute mutations derive the institute scope from the authenticated
membership; clients never choose an institute ID.

All state-changing HTTP endpoints enforce same-origin requests.

## Privacy boundaries

Course-team communication does **not** grant access to:

- student private video notes
- authentication/security information
- phone numbers or personal email
- unrelated courses
- unrelated students
- benefactor or organization reporting data

Technical support remains a separate product capability.

## Scaling notes

Conversation and inbox queries are bounded. Current thread reads return at most
100 recent messages and inboxes return at most 100 conversations.

The current implementation is suitable for the product slice, but large-scale
production should add cursor pagination before long-lived threads become
unbounded in practice. Realtime delivery is deliberately not assumed yet;
websocket/SSE infrastructure should be selected only when the product requires
live delivery.

## Database migrations

- `0014_first_sebastian_shaw.sql`: course team + scoped conversations
- `0015_living_peter_quill.sql`: problem-solving requests/sessions and
  per-supporter request policy

Both migrations are generated from the Drizzle schema and tracked in the
Drizzle journal/snapshots.

## Verification

Coverage includes:

- institute-only assignment
- no global role granted to course-team members
- sanitized student course-team payloads
- exact-assignment conversation scope
- same-origin protection
- two-way supporter/student messaging
- counselor communication
- teacher messaging denied
- supporter-only problem-solving workflow
- institute-controlled request enablement
- deactivation immediately closing communication/session capability
- student conversation list excluding unsupported teacher threads
