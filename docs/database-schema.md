# Database schema

## Current checkout: PostgreSQL users table

The only checked-in SQL migration in the current
`vishwajeeth-user-auth-security` branch is
`database/migrations/001_create_users.sql`. It creates this table if missing:

| Column | SQL type | Constraints/default |
|---|---|---|
| `id` | `BIGINT` | Identity-generated, primary key, always generated. |
| `name` | `VARCHAR(100)` | Not null. |
| `email` | `VARCHAR(254)` | Not null, unique. |
| `password_hash` | `VARCHAR(60)` | Not null; stores the bcrypt hash, not the password. |
| `created_at` | `TIMESTAMPTZ` | Not null; defaults to `NOW()`. |
| `updated_at` | `TIMESTAMPTZ` | Not null; defaults to `NOW()`. |

The migration also creates a unique index on `LOWER(email)`, ensuring
case-insensitive uniqueness. Registration lowercases email before inserting
it. The migration uses `CREATE ... IF NOT EXISTS`; it does not drop or reset
existing data. It does not define a trigger to update `updated_at` on later
row changes.

There are no foreign keys or other tables in this branch's migration set.
Teams, team memberships, projects, tasks, comments, activity records, and
notifications are planned domain areas, not existing tables in this schema.

## Database access and test behavior

The API uses the `pg` connection pool. It accepts `DATABASE_URL`, or separate
`DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, and `DB_PASSWORD` settings. See
[Architecture](architecture.md) for configuration validation.

The backend auth tests replace the pool query method with an in-memory stub;
they do not require PostgreSQL. The separate manual connectivity check in
`backend/src/config/testDb.js` requires `TEST_DATABASE_URL` targeting a
dedicated test-named database and runs a read-only query. This describes test
design only; it does not report test execution results.

## Spring Boot `main` branch is separate

The `main` branch has a JPA `Project` entity with `id`, `name`,
`description`, and `status` fields. Its `application.properties` enables
Hibernate schema updates (`spring.jpa.hibernate.ddl-auto=update`). That entity
is not defined by the current branch's SQL migrations, and it must not be
assumed to exist alongside the Express users schema in a deployed database.
The team should confirm which backend/schema branch is canonical before
designing cross-branch migrations.

Related references: [Architecture](architecture.md) and
[API contracts](api-contracts.md).
