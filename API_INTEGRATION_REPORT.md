# API Integration Report

## Live browser/API integration

**PASS.** `npm run test:e2e:live` starts Express with `DATABASE_URL` set to the guarded `project_management_test` target and starts Vite on localhost. The test suite makes no `/api/**` mocks. It registers unique accounts via the real auth API, seeds role/organization memberships in the isolated test database, logs in through the UI, exercises the real UI/API, and checks persisted rows with SQL.

Verified live workflows:

- Admin login, project create, task create, task assignment through the task-detail UI selector, task status update, comment create, notifications, reports/analytics.
- Manager login and project create.
- Employee login, assignment notification, assigned-task status update, forbidden project-create response (403).
- Outsider login and cross-organization workspace access response (404).

## PostgreSQL CRUD and security integration

**PASS.** `node scripts/run-safe-pg-integration.js` passed 2 tests against `project_management_test` (0 failures, 0 skips). Coverage includes authentication, project CRUD, project membership, milestones, task CRUD/status/assignment, subtasks, team CRUD/membership, organization/workspace membership and invitations, comments, notifications/preferences, attachments, time entries/timers, reports, analytics/CSV, JWT revocation, role authorization, file access, IDOR checks, and organization isolation.

The integration tests query PostgreSQL after writes to verify rows/fields and after deletes to confirm removal. They clean up only generated fixture IDs.

## Safety and schema setup

The safe runners derive or accept `TEST_DATABASE_URL`, validate it using `backend/src/config/testDb.js`, and require local `localhost:5432/project_management_test`. They check the configured application database identity with a read-only query and refuse an identical target. They never drop or reset a database. Migrations are additive/idempotent; tests use unique fixture IDs and clean up only those fixtures. Application records were not changed.

The normal `backend npm test` command still reports the two DB tests as skipped when no `TEST_DATABASE_URL` is exported. The dedicated safe runner supplies it in-process and passed both.

## Issues found and fixed

- Integration setup omitted migration 010; runners now apply 001–010. This restored project manager/avatar/project-member fields.
- Migration 010 now ensures `project_members.joined_at` exists idempotently.
- Project-member creation attempted unsupported notification type `project_member`. Notification preferences now map it to the existing assignment preference.
- An authorization test expected 404 when an employee deleted their own comment. The existing policy allows comment authors to delete their own comments; the test now asserts 204 and the database suite verifies it.

## Existing API limits

- Workspace member listing exists, but no direct workspace-membership removal endpoint was found. Organization-member and team/project membership operations are supported.
- CSV export exists; no PDF export endpoint was found.
- Analytics ranges are server-defined; arbitrary date-range support is not exposed by the observed analytics API.
- Project activity uses the workspace activity feed; complete task-associated project activity is not confirmed by a dedicated endpoint contract.
