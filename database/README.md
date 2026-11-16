# PostgreSQL database

## Canonical schema

Apply the ordered migrations in `migrations/`. The psql script
`schema.sql` includes:

1. `001_create_users.sql`
2. `002_create_workspace_domain.sql`
3. `003_expand_task_workflows.sql`
4. `004_teams_and_account_recovery.sql`
5. `005_organizations_sessions.sql`
6. `006_task_attachments.sql`
7. `007_time_reporting_recurring_rules.sql`
8. `008_workload_analytics_notifications.sql`

From the repository root:

```powershell
psql -U <db_user> -d <db_name> -f database/schema.sql
```

The migrations are additive and do not drop tables, but `CREATE TABLE IF NOT
EXISTS` does not reconcile a pre-existing table with different columns. Check
an existing database's schema before applying the migrations.

`queries.sql` contains examples for the active schema. `seed.sql` deliberately
does not create accounts with placeholder password hashes; create users
through the registration API so passwords are hashed by bcrypt.

## Connection configuration

The backend pool reads `DATABASE_URL` or the individual `DB_HOST`, `DB_PORT`,
`DB_NAME`, `DB_USER`, and `DB_PASSWORD` values from `backend/.env`.
`database/db.js` reuses that pool configuration.

## Database tests

Use only a dedicated test-named database in `TEST_DATABASE_URL`. The backend
test database guard rejects the configured application database and
production-marked targets. Current unit tests use an in-memory query stub and
do not require PostgreSQL.
