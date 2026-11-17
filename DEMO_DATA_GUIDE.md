# ProjectFlow local demo data

The demo seed uses the existing PostgreSQL tables, bcrypt authentication, and workspace/project relationships. Dashboard counts and analytics come from the workspace's persisted projects, tasks, memberships, and time entries through the existing API.

## Demo accounts

| Role | Email | Initial password |
|---|---|---|
| Owner / Admin | `demo.admin@projectflow.local` | `DemoAdmin!2026` |
| Manager | `demo.manager@projectflow.local` | `DemoManager!2026` |
| Employee | `demo.employee1@projectflow.local` | `DemoEmployee1!2026` |
| Employee | `demo.employee2@projectflow.local` | `DemoEmployee2!2026` |

Use only with a local development database. Change these passwords after a demonstration if the database is retained. If a matching email already exists, the seed reuses that account and leaves its name and password hash untouched.

## Seed

1. Configure `backend/.env` with the local database connection and a strong `JWT_SECRET`.
2. Apply the canonical schema once from the repository root: `psql -U <db_user> -d <db_name> -f database/schema.sql`.
3. In PowerShell, run:

```powershell
Set-Location backend
$env:NODE_ENV = "development"
$env:DEMO_SEED_ENABLED = "true"
npm run seed:demo
```

The seed is transactional and idempotent. It adds one demo organization and workspace, four demo users, one team, three projects, 15 tasks across all four workflow states, memberships, comments, notifications, and completed time entries. It will refuse production or any run without the explicit demo flag. It does not touch existing administrator credentials. Keep the explicit flag out of production configuration.

## Safe demo reset

The seed deliberately does not delete or reset records. To remove only demo workspace data, first confirm the target in `psql`:

```sql
SELECT w.id, w.name, o.name AS organization_name, u.email AS owner_email
FROM workspaces w
JOIN organizations o ON o.id = w.organization_id
JOIN users u ON u.id = w.owner_id
WHERE w.name = 'ProjectFlow Demo Workspace'
  AND o.name = 'ProjectFlow Demo Organization'
  AND u.email = 'demo.admin@projectflow.local';
```

If and only if that returns the intended local demo workspace, remove that workspace and its owned child records with:

```sql
BEGIN;
DELETE FROM workspaces w
USING organizations o, users u
WHERE w.organization_id = o.id
  AND w.owner_id = u.id
  AND w.name = 'ProjectFlow Demo Workspace'
  AND o.name = 'ProjectFlow Demo Organization'
  AND u.email = 'demo.admin@projectflow.local';
COMMIT;
```

This preserves users, the organization, other workspaces, and all non-demo records. Remove the demo organization only after verifying it has no remaining workspaces or other data you want to retain. Do not use broad table truncation or database reset commands.

## Run locally

From the repository root, after PostgreSQL and schema setup:

```powershell
Set-Location backend
npm install
npm run dev
```

In a second PowerShell terminal:

```powershell
Set-Location frontend
npm install
npm run dev
```

Open `http://localhost:5173` and sign in using the Owner / Admin account above. The API is at `http://localhost:5000/api`; health checks are `http://localhost:5000/api/health` and `http://localhost:5000/api/ready`. Vite uses port 5173 by default, and the backend uses port 5000 by default.
