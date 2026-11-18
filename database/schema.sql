-- Apply the canonical schema from the versioned migrations.
-- Run from any working directory with psql:
--   psql -U <db_user> -d <db_name> -f database/schema.sql
\ir migrations/001_create_users.sql
\ir migrations/002_create_workspace_domain.sql
\ir migrations/003_expand_task_workflows.sql
\ir migrations/004_teams_and_account_recovery.sql
\ir migrations/005_organizations_sessions.sql
\ir migrations/006_task_attachments.sql
\ir migrations/007_time_reporting_recurring_rules.sql
\ir migrations/008_workload_analytics_notifications.sql
\ir migrations/009_backfill_organization_memberships.sql
\ir migrations/010_project_members_and_enhancements.sql
\ir migrations/011_repair_production_schema.sql
