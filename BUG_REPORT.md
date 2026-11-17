# Bug Report

## Resolved

### BUG-UI-001: Inbox/calendar horizontal overflow

- **Status:** FIXED / PASS
- **Cause:** Sidebar flex sizing could consume the full desktop row, while compact task-view controls did not wrap on narrow screens.
- **Fix:** Set explicit desktop sidebar flex bases (260px expanded, 72px collapsed), reset flex basis for the stacked mobile layout, allow task-view controls to wrap, and use shrinkable calendar grid tracks. The app no longer depends on a remote font request.
- **Verification:** Mocked Playwright viewport matrix passed for 17 route variants at 1920x1080, 1366x768, 1024x768, 768x1024, 390x844, and 360x800. No horizontal overflow was detected.

### BUG-API-001: Project-member creation returned 500

- **Status:** FIXED / PASS
- **Cause:** Project-member handler attempted to create notification type `project_member`, which was not mapped to a preference column.
- **Fix:** Route project-member notifications through the existing assignment preference.
- **Verification:** PostgreSQL integration tests create project members, verify the membership row, and remove it.

### BUG-TEST-001: PostgreSQL integration schema omitted migration 010

- **Status:** FIXED / PASS
- **Cause:** Test setup applied only migrations 001–009, although active controllers read fields added by migration 010.
- **Fix:** Guarded integration runners apply 001–010; migration 010 ensures project members have `joined_at` idempotently.
- **Verification:** Both database integration/isolation tests pass against `project_management_test`.

## Open product/API limits (not test failures)

- Workspace member removal has no backend endpoint. Organization-member, team-member, and project-member removal endpoints are present.
- PDF export is unsupported; CSV export is tested.
- No complete manual accessibility or pixel-level screenshot audit was run.
- Browser tests do not submit every settings, attachment, and calendar control; see [FEATURE_TEST_RESULTS.md](FEATURE_TEST_RESULTS.md) for the specific untested UI actions.
