# Database schema

## Source of truth

The PostgreSQL schema is defined by the migrations under
`database/migrations/`, applied in filename order:

1. `001_create_users.sql` creates `users` with identity `id`, `name`, unique
   `email`, bcrypt `password_hash`, and timestamps.
2. `002_create_workspace_domain.sql` creates workspaces, memberships,
   invitations, projects, tasks, task comments, notifications, constraints,
   and indexes.
3. `003_expand_task_workflows.sql` adds task workflow values and dates,
   subtasks, dependencies, activity history, milestones, labels, time entries,
   and recurring task definitions.
4. `004_teams_and_account_recovery.sql` adds workspace teams and team
   membership, manager/employee role values, and single-use password reset tokens.
5. `005_organizations_sessions.sql` adds organizations, organization members
   and invitations, associates existing workspaces with organizations, and adds
   token-version support for revocable sessions.
6. `006_task_attachments.sql` adds organization/workspace/task-scoped attachment
   metadata with uploader attribution and a private storage key.
7. `007_time_reporting_recurring_rules.sql` adds time-reporting indexes and
   recurrence configuration and occurrence-deduplication fields.
8. `008_workload_analytics_notifications.sql` adds task estimate/completion
   fields, deduplication keys, and per-workspace notification preferences.

From the repository root, apply the migrations to the intended database with:

```powershell
psql -U <db_user> -d <db_name> -f database/schema.sql
```

`database/schema.sql` includes all versioned migrations using psql's `\ir`.
The migration statements are additive and use `IF NOT EXISTS`; that does not
repair a pre-existing table with incompatible columns. Inspect an existing
database before applying them. Do not apply a legacy schema over user data.

The Express pool uses `DATABASE_URL` when present, otherwise the individual
`DB_*` settings. `database/db.js` reuses that same pool configuration.

## Relationships and domain values

- An organization has an owner and organization memberships. A workspace belongs
  to one organization and retains its own membership and access checks.
- Organization roles are `owner`, `admin`, `manager`, and `employee`; workspace
  roles include the legacy `member` role plus `manager`, `employee`, and `viewer`.
- Projects belong to workspaces and have status `in_progress`, `completed`,
  or `archived`.
- Tasks belong to a workspace and project, may be assigned to a user, and use
  status `todo`, `in_progress`, or `completed` and priority `low`, `medium`,
  or `high`.
- Comments reference a task and author. Notifications are scoped to a
  workspace and recipient.
- Task attachment metadata records the organization, workspace, task, uploader,
  original name, validated MIME type, size, and a non-public storage key.
  Attachment bytes are kept in the configured private filesystem directory.
- Foreign keys cascade workspace/project/task-owned data where appropriate.

See the SQL migrations for the complete column definitions and constraints.
`database/queries.sql` contains examples using the canonical column names.
`database/seed.sql` intentionally adds no default accounts or placeholder
password hashes; register users through the API.

## Test database safety

`backend/src/config/testDb.js` only accepts `TEST_DATABASE_URL` with a
test-named database and rejects the configured application database and
production-marked targets. The current unit tests stub database queries;
live database tests must use this dedicated test URL.
