# PostgreSQL database

## Existing databases

For databases that already contain application data, inspect the current
schema and apply the ordered migrations in `migrations/` only after review.
The psql script `schema.sql` includes migrations 001 through 010:

1. `001_create_users.sql`
2. `002_create_workspace_domain.sql`
3. `003_expand_task_workflows.sql`
4. `004_teams_and_account_recovery.sql`
5. `005_organizations_sessions.sql`
6. `006_task_attachments.sql`
7. `007_time_reporting_recurring_rules.sql`
8. `008_workload_analytics_notifications.sql`
9. `009_backfill_organization_memberships.sql`
10. `010_project_members_and_enhancements.sql`

From the repository root:

```powershell
psql -U <db_user> -d <db_name> -f database/schema.sql
```

The migrations are additive and do not drop tables, but `CREATE TABLE IF NOT
EXISTS` does not reconcile a pre-existing table with different columns. Check
an existing database's schema before applying the migrations.

`CREATE TABLE IF NOT EXISTS` does not reconcile a pre-existing table with
different columns or types. Do not use the incremental migrations as a fresh
database initializer without checking the schema first. `queries.sql` contains
examples for the active schema.

## New, empty database

[`fresh-install.sql`](./fresh-install.sql) defines the application schema for a
new, empty PostgreSQL database. It includes all current application tables,
uses BIGINT consistently for identifiers, and adds composite constraints to
prevent rows from referring across organizations or workspaces. It contains
no demo records and does not drop or truncate data.

Run it only after confirming the target is a newly created, empty database.
It is transactional and intentionally fails rather than overwriting existing
objects:

From the repository root, after setting `DATABASE_URL` in the current
PowerShell session:

```powershell
psql "$env:DATABASE_URL" -v ON_ERROR_STOP=1 -f database/fresh-install.sql
```

This command is a manual setup instruction; the backend does not run schema
initialization automatically. Do not point it at the existing Railway database.

`seed.sql` deliberately does not create accounts with placeholder password
hashes; create users through the registration API so passwords are hashed by
bcrypt. The demo seed script is for local/demo environments only.

## Connection configuration

The backend pool reads `DATABASE_URL` or the individual `DB_HOST`, `DB_PORT`,
`DB_NAME`, `DB_USER`, and `DB_PASSWORD` values from `backend/.env`. Production
requires `DATABASE_URL`. Set `DATABASE_SSL_MODE=disable` for Railway private
networking, `require` for the public TCP proxy, or `verify-full` when the
endpoint has a trusted certificate. A TLS mode already present in the URL is
used as-is and must not be combined with `DATABASE_SSL_MODE`.

## Database tests

Use only a dedicated test-named database in `TEST_DATABASE_URL`. The backend
test database guard rejects the configured application database and
production-marked targets. Current unit tests use an in-memory query stub and
do not require PostgreSQL.
