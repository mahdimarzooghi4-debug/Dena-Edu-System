# Dena #44 + #45 migration and integration checkpoint

Inspection: 2026-11-08. Development-only: no approved merge, Stage, QA gate, Production or real-money processing.

Verified heads: main cd0e18a05b2e9282cf109aae243868abb8d016af; Draft #44 1adebbb61399d4dec48506ad22bb2403fa362b59; Draft #45 a2eae8e5e02cff4da53ee0d5d7d4cfdc2d081c39; stacked Draft Android #46 36f60efdcd6e25aa0e4d7c058d3d4a0bbca1f832. Exact-head CI green for all three PRs.

## Hard migration collision — BLOCKS integration

#44 adds SQL and snapshots 0058_dena_service_order_communications and 0059_dena_service_call_no_show. #45 independently adds 0058_organization_contact_profiles through 0068_dena_schema_snapshot_sync, with its own journal and latest snapshot.

Do not concatenate the two journals or silently rename an applied migration, and do not copy the #44 snapshots into #45. Reconcile in a separate Draft branch based on #45 by generating new sequential migration SQL and combined snapshots after 0068; inspect the actual SQL and run disposable PostgreSQL migration plus Drizzle generated-drift checking. Preserve the #45 history.

This change adds a fail-closed automated guard for duplicate numeric IDs, journal order, exact SQL/journal mapping, duplicate or missing entries. It does not itself perform migration rebasing or prove SQL correctness.

## All 14 overlapping file paths

- drizzle/meta/_journal.json — confirmed numbering/history conflict
- src/app/institute/service-orders/page.tsx — review divergent UI
- src/app/student/courses/page.tsx — overlapping edits, course access and Figma navigation
- src/app/student/services/orders/page.tsx — overlapping edits, order lifecycle
- src/components/assessments/exam-creation-form.tsx — overlapping edits, validation
- src/components/assessments/exam-report.tsx — overlapping edits, report scoping
- src/components/institute/institute-shell.tsx — overlapping edits, navigation
- src/components/support/support-notifications.tsx — overlapping edits, scoped notices
- src/components/support/ticket-create-form.tsx — overlapping edits, form semantics
- src/db/schema.ts — different hunks, must align with combined migrations
- src/server/admin/audit.ts — different hunks, retain audit lineage
- src/server/assessments/exam-management.ts — different hunks, preserve domain checks
- src/server/student/service-orders.ts — different hunks, preserve authorization
- tests/e2e/course-supervision-db.spec.ts — different hunks, full regression required

Overlapping diff ranges do not alone establish a Git merge conflict. UI/security code needs actual three-way review and tests.

## Next gates

1. Construct combined Draft web/backend branch and resolve all 14 files, with regenerated migration chain.
2. Require migration guard, Drizzle schema drift, real temporary PostgreSQL migrations, typecheck, lint, unit and browser E2E green on exact HEAD.
3. Refresh stacked Android #46 relative to combined backend, preserve app behavior and rerun Android CI/emulator tests.
4. Independent technical review, visual Figma QA, explicit approval before any merge or release.

Scope: iOS excluded. Real SMS and gateway integrations await owner-provided provider details; test mocks are not real integrations.
