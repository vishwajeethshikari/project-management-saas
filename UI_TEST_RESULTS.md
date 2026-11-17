# UI Test Results

## Mocked Playwright suite

**PASS — 10 tests.** API requests are intercepted with fixtures in `frontend/e2e/routes.spec.js`.

- Direct page loads, including the 17 route variants used by the viewport matrix.
- Browser back/forward, not-found recovery, and unauthenticated route protection.
- Selected task/project/team/profile/inbox/time UI actions and request shapes.
- Console/page errors and failed requests on the selected route set.
- Responsive horizontal overflow check for every route variant at all six requested viewport sizes: 1920x1080, 1366x768, 1024x768, 768x1024, 390x844, and 360x800.

Inbox and Calendar overflow checks pass after the fix. The desktop shell now fixes sidebar flex basis; mobile task-view controls wrap and calendar columns use shrinkable tracks.

## Live-backend Playwright suite

**PASS — 2 tests.** `frontend/e2e/live-backend.spec.js` makes real requests to Express and the isolated PostgreSQL database; it does not install API route mocks.

- Admin login; project and task creation; assignment using the task-detail assignee selector; status update; comment creation; report navigation and analytics request; PostgreSQL persistence assertions.
- Manager login and project creation; Employee login and assignment notification; assigned-task status update; assignee editor disabled for Employee; employee project creation denied (403); outsider cross-organization workspace access denied (404).

The suite creates unique test users/organizations/workspaces and verifies its user fixtures are removed afterward.

## Visual review limits

**NOT TESTED:** full manual screenshot inspection at every page/viewport pair, pixel-diff comparison, color contrast, keyboard-only navigation, and screen-reader behavior. The viewport suite asserts page headings and horizontal bounds, not pixel-level fidelity.
