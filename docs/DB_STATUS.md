# Live Database Status

- **Inspected:** 2026-11-16T15:46:59.014Z
- **Database/schema:** `project_management_saas` / `public`
- **Method:** read-only catalog queries and exact `SELECT count(*)` queries; no migrations or other writes executed. Counts were taken sequentially and are not guaranteed to share one transaction snapshot.

## Summary

- 24 live base tables found across non-system schemas.
- Migration markers: 001, 002, 003, 004, 005, 006, 007, 008 appear applied; no migration markers are missing. This is inferred from schema objects, not a migration-history ledger.
- Missing migration-defined objects: 0 table(s), 0 column(s), 0 named index(es), 0 named constraint(s).
- Workspace members without matching organization membership: **0**.

## Migration markers

| Migration | Assessment | Markers | Missing markers |
| --- | --- | --- | --- |
| 001 | Appears applied | 2/2 schema markers present | — |
| 002 | Appears applied | 7/7 schema markers present | — |
| 003 | Appears applied | 8/8 schema markers present | — |
| 004 | Appears applied | 3/3 schema markers present | — |
| 005 | Appears applied | 5/5 schema markers present | — |
| 006 | Appears applied | 1/1 schema markers present | — |
| 007 | Appears applied | 3/3 schema markers present | — |
| 008 | Appears applied | 4/4 schema markers present | — |

## Tables and row counts

| Schema | Table | Rows |
| --- | --- | --- |
| public | activity_logs | 0 |
| public | labels | 0 |
| public | milestones | 0 |
| public | notification_preferences | 0 |
| public | notifications | 0 |
| public | organization_invitations | 2 |
| public | organization_members | 1 |
| public | organizations | 1 |
| public | password_reset_tokens | 0 |
| public | projects | 0 |
| public | recurring_tasks | 0 |
| public | subtasks | 0 |
| public | task_attachments | 0 |
| public | task_comments | 0 |
| public | task_dependencies | 0 |
| public | task_labels | 0 |
| public | tasks | 0 |
| public | team_members | 0 |
| public | teams | 0 |
| public | time_entries | 0 |
| public | users | 3 |
| public | workspace_invitations | 0 |
| public | workspace_members | 0 |
| public | workspaces | 0 |

## Columns

| Table | Column / type / nullability |
| --- | --- |
| public.activity_logs | id bigint NOT NULL |
| public.activity_logs | workspace_id bigint NOT NULL |
| public.activity_logs | actor_id bigint NULL |
| public.activity_logs | resource_type character varying(30) NOT NULL |
| public.activity_logs | resource_id bigint NOT NULL |
| public.activity_logs | action character varying(50) NOT NULL |
| public.activity_logs | details jsonb NOT NULL |
| public.activity_logs | created_at timestamp with time zone NOT NULL |
| public.labels | id bigint NOT NULL |
| public.labels | workspace_id bigint NOT NULL |
| public.labels | name character varying(60) NOT NULL |
| public.labels | color character varying(20) NOT NULL |
| public.milestones | id bigint NOT NULL |
| public.milestones | workspace_id bigint NOT NULL |
| public.milestones | project_id bigint NOT NULL |
| public.milestones | name character varying(150) NOT NULL |
| public.milestones | due_date date NULL |
| public.milestones | completed_at timestamp with time zone NULL |
| public.milestones | created_at timestamp with time zone NOT NULL |
| public.milestones | updated_at timestamp with time zone NOT NULL |
| public.notification_preferences | workspace_id bigint NOT NULL |
| public.notification_preferences | user_id bigint NOT NULL |
| public.notification_preferences | assignment_enabled boolean NOT NULL |
| public.notification_preferences | mention_enabled boolean NOT NULL |
| public.notification_preferences | due_date_enabled boolean NOT NULL |
| public.notification_preferences | updated_at timestamp with time zone NOT NULL |
| public.notifications | id bigint NOT NULL |
| public.notifications | workspace_id bigint NOT NULL |
| public.notifications | user_id bigint NOT NULL |
| public.notifications | type character varying(50) NOT NULL |
| public.notifications | message text NOT NULL |
| public.notifications | resource_type character varying(30) NULL |
| public.notifications | resource_id bigint NULL |
| public.notifications | is_read boolean NOT NULL |
| public.notifications | created_at timestamp with time zone NOT NULL |
| public.notifications | dedupe_key character varying(200) NULL |
| public.organization_invitations | id bigint NOT NULL |
| public.organization_invitations | organization_id bigint NOT NULL |
| public.organization_invitations | email character varying(254) NOT NULL |
| public.organization_invitations | role character varying(20) NOT NULL |
| public.organization_invitations | invited_by bigint NOT NULL |
| public.organization_invitations | token_hash character varying(64) NOT NULL |
| public.organization_invitations | status character varying(20) NOT NULL |
| public.organization_invitations | expires_at timestamp with time zone NOT NULL |
| public.organization_invitations | created_at timestamp with time zone NOT NULL |
| public.organization_members | organization_id bigint NOT NULL |
| public.organization_members | user_id bigint NOT NULL |
| public.organization_members | role character varying(20) NOT NULL |
| public.organization_members | joined_at timestamp with time zone NOT NULL |
| public.organizations | id bigint NOT NULL |
| public.organizations | name character varying(120) NOT NULL |
| public.organizations | owner_id bigint NOT NULL |
| public.organizations | created_at timestamp with time zone NOT NULL |
| public.organizations | updated_at timestamp with time zone NOT NULL |
| public.password_reset_tokens | id bigint NOT NULL |
| public.password_reset_tokens | user_id bigint NOT NULL |
| public.password_reset_tokens | token_hash character varying(64) NOT NULL |
| public.password_reset_tokens | expires_at timestamp with time zone NOT NULL |
| public.password_reset_tokens | used_at timestamp with time zone NULL |
| public.password_reset_tokens | created_at timestamp with time zone NOT NULL |
| public.projects | id bigint NOT NULL |
| public.projects | workspace_id bigint NOT NULL |
| public.projects | name character varying(150) NOT NULL |
| public.projects | description text NULL |
| public.projects | status character varying(20) NOT NULL |
| public.projects | owner_id bigint NULL |
| public.projects | due_date date NULL |
| public.projects | created_at timestamp with time zone NOT NULL |
| public.projects | updated_at timestamp with time zone NOT NULL |
| public.recurring_tasks | id bigint NOT NULL |
| public.recurring_tasks | workspace_id bigint NOT NULL |
| public.recurring_tasks | project_id bigint NOT NULL |
| public.recurring_tasks | created_by bigint NOT NULL |
| public.recurring_tasks | title character varying(255) NOT NULL |
| public.recurring_tasks | description text NULL |
| public.recurring_tasks | priority character varying(20) NOT NULL |
| public.recurring_tasks | recurrence_rule character varying(100) NOT NULL |
| public.recurring_tasks | next_run_at timestamp with time zone NOT NULL |
| public.recurring_tasks | is_active boolean NOT NULL |
| public.recurring_tasks | created_at timestamp with time zone NOT NULL |
| public.recurring_tasks | updated_at timestamp with time zone NOT NULL |
| public.recurring_tasks | recurrence_unit character varying(10) NULL |
| public.recurring_tasks | interval_count integer NOT NULL |
| public.recurring_tasks | weekdays ARRAY NULL |
| public.recurring_tasks | month_day smallint NULL |
| public.recurring_tasks | ends_at timestamp with time zone NULL |
| public.recurring_tasks | paused_at timestamp with time zone NULL |
| public.recurring_tasks | assignee_id bigint NULL |
| public.recurring_tasks | due_offset_days integer NULL |
| public.subtasks | id bigint NOT NULL |
| public.subtasks | workspace_id bigint NOT NULL |
| public.subtasks | task_id bigint NOT NULL |
| public.subtasks | title character varying(255) NOT NULL |
| public.subtasks | is_completed boolean NOT NULL |
| public.subtasks | assignee_id bigint NULL |
| public.subtasks | due_date date NULL |
| public.subtasks | created_by bigint NOT NULL |
| public.subtasks | created_at timestamp with time zone NOT NULL |
| public.subtasks | updated_at timestamp with time zone NOT NULL |
| public.task_attachments | id bigint NOT NULL |
| public.task_attachments | organization_id bigint NOT NULL |
| public.task_attachments | workspace_id bigint NOT NULL |
| public.task_attachments | task_id bigint NOT NULL |
| public.task_attachments | uploaded_by bigint NOT NULL |
| public.task_attachments | original_name character varying(255) NOT NULL |
| public.task_attachments | storage_key uuid NOT NULL |
| public.task_attachments | mime_type character varying(100) NOT NULL |
| public.task_attachments | byte_size bigint NOT NULL |
| public.task_attachments | created_at timestamp with time zone NOT NULL |
| public.task_comments | id bigint NOT NULL |
| public.task_comments | workspace_id bigint NOT NULL |
| public.task_comments | task_id bigint NOT NULL |
| public.task_comments | user_id bigint NOT NULL |
| public.task_comments | body text NOT NULL |
| public.task_comments | created_at timestamp with time zone NOT NULL |
| public.task_comments | updated_at timestamp with time zone NOT NULL |
| public.task_dependencies | workspace_id bigint NOT NULL |
| public.task_dependencies | task_id bigint NOT NULL |
| public.task_dependencies | depends_on_task_id bigint NOT NULL |
| public.task_dependencies | created_by bigint NOT NULL |
| public.task_dependencies | created_at timestamp with time zone NOT NULL |
| public.task_labels | workspace_id bigint NOT NULL |
| public.task_labels | task_id bigint NOT NULL |
| public.task_labels | label_id bigint NOT NULL |
| public.tasks | id bigint NOT NULL |
| public.tasks | workspace_id bigint NOT NULL |
| public.tasks | project_id bigint NOT NULL |
| public.tasks | title character varying(255) NOT NULL |
| public.tasks | description text NULL |
| public.tasks | status character varying(20) NOT NULL |
| public.tasks | priority character varying(20) NOT NULL |
| public.tasks | assignee_id bigint NULL |
| public.tasks | due_date date NULL |
| public.tasks | created_by bigint NOT NULL |
| public.tasks | created_at timestamp with time zone NOT NULL |
| public.tasks | updated_at timestamp with time zone NOT NULL |
| public.tasks | start_date date NULL |
| public.tasks | archived_at timestamp with time zone NULL |
| public.tasks | recurrence_id bigint NULL |
| public.tasks | recurrence_run_at timestamp with time zone NULL |
| public.tasks | estimated_minutes integer NULL |
| public.tasks | completed_at timestamp with time zone NULL |
| public.team_members | workspace_id bigint NOT NULL |
| public.team_members | team_id bigint NOT NULL |
| public.team_members | user_id bigint NOT NULL |
| public.team_members | role character varying(20) NOT NULL |
| public.team_members | joined_at timestamp with time zone NOT NULL |
| public.teams | id bigint NOT NULL |
| public.teams | workspace_id bigint NOT NULL |
| public.teams | name character varying(100) NOT NULL |
| public.teams | description text NULL |
| public.teams | manager_id bigint NULL |
| public.teams | created_by bigint NOT NULL |
| public.teams | created_at timestamp with time zone NOT NULL |
| public.teams | updated_at timestamp with time zone NOT NULL |
| public.time_entries | id bigint NOT NULL |
| public.time_entries | workspace_id bigint NOT NULL |
| public.time_entries | task_id bigint NOT NULL |
| public.time_entries | user_id bigint NOT NULL |
| public.time_entries | started_at timestamp with time zone NOT NULL |
| public.time_entries | ended_at timestamp with time zone NULL |
| public.time_entries | duration_seconds integer NULL |
| public.time_entries | note text NULL |
| public.time_entries | created_at timestamp with time zone NOT NULL |
| public.users | id bigint NOT NULL |
| public.users | name character varying(100) NOT NULL |
| public.users | email character varying(254) NOT NULL |
| public.users | password_hash character varying(60) NOT NULL |
| public.users | created_at timestamp with time zone NOT NULL |
| public.users | updated_at timestamp with time zone NOT NULL |
| public.users | token_version integer NOT NULL |
| public.workspace_invitations | id bigint NOT NULL |
| public.workspace_invitations | workspace_id bigint NOT NULL |
| public.workspace_invitations | email character varying(254) NOT NULL |
| public.workspace_invitations | role character varying(20) NOT NULL |
| public.workspace_invitations | invited_by bigint NOT NULL |
| public.workspace_invitations | token_hash character varying(64) NOT NULL |
| public.workspace_invitations | status character varying(20) NOT NULL |
| public.workspace_invitations | expires_at timestamp with time zone NOT NULL |
| public.workspace_invitations | created_at timestamp with time zone NOT NULL |
| public.workspace_members | workspace_id bigint NOT NULL |
| public.workspace_members | user_id bigint NOT NULL |
| public.workspace_members | role character varying(20) NOT NULL |
| public.workspace_members | joined_at timestamp with time zone NOT NULL |
| public.workspaces | id bigint NOT NULL |
| public.workspaces | name character varying(100) NOT NULL |
| public.workspaces | description text NULL |
| public.workspaces | owner_id bigint NOT NULL |
| public.workspaces | created_at timestamp with time zone NOT NULL |
| public.workspaces | updated_at timestamp with time zone NOT NULL |
| public.workspaces | organization_id bigint NOT NULL |

## Primary keys, foreign keys, unique and check constraints

| Schema | Table | Type | Name | Columns | References | Definition |
| --- | --- | --- | --- | --- | --- | --- |
| public | activity_logs | n | activity_logs_action_not_null | action | — | NOT NULL action |
| public | activity_logs | Foreign key | activity_logs_actor_id_fkey | actor_id | public.users (id) | FOREIGN KEY (actor_id) REFERENCES users(id) |
| public | activity_logs | n | activity_logs_created_at_not_null | created_at | — | NOT NULL created_at |
| public | activity_logs | n | activity_logs_details_not_null | details | — | NOT NULL details |
| public | activity_logs | n | activity_logs_id_not_null | id | — | NOT NULL id |
| public | activity_logs | Primary key | activity_logs_pkey | id | — | PRIMARY KEY (id) |
| public | activity_logs | n | activity_logs_resource_id_not_null | resource_id | — | NOT NULL resource_id |
| public | activity_logs | n | activity_logs_resource_type_not_null | resource_type | — | NOT NULL resource_type |
| public | activity_logs | Foreign key | activity_logs_workspace_id_fkey | workspace_id | public.workspaces (id) | FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE |
| public | activity_logs | n | activity_logs_workspace_id_not_null | workspace_id | — | NOT NULL workspace_id |
| public | labels | n | labels_color_not_null | color | — | NOT NULL color |
| public | labels | n | labels_id_not_null | id | — | NOT NULL id |
| public | labels | n | labels_name_not_null | name | — | NOT NULL name |
| public | labels | Primary key | labels_pkey | id | — | PRIMARY KEY (id) |
| public | labels | Foreign key | labels_workspace_id_fkey | workspace_id | public.workspaces (id) | FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE |
| public | labels | Unique | labels_workspace_id_name_key | workspace_id, name | — | UNIQUE (workspace_id, name) |
| public | labels | n | labels_workspace_id_not_null | workspace_id | — | NOT NULL workspace_id |
| public | milestones | n | milestones_created_at_not_null | created_at | — | NOT NULL created_at |
| public | milestones | n | milestones_id_not_null | id | — | NOT NULL id |
| public | milestones | n | milestones_name_not_null | name | — | NOT NULL name |
| public | milestones | Primary key | milestones_pkey | id | — | PRIMARY KEY (id) |
| public | milestones | Foreign key | milestones_project_id_fkey | project_id | public.projects (id) | FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE |
| public | milestones | n | milestones_project_id_not_null | project_id | — | NOT NULL project_id |
| public | milestones | n | milestones_updated_at_not_null | updated_at | — | NOT NULL updated_at |
| public | milestones | Foreign key | milestones_workspace_id_fkey | workspace_id | public.workspaces (id) | FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE |
| public | milestones | n | milestones_workspace_id_not_null | workspace_id | — | NOT NULL workspace_id |
| public | notification_preferences | n | notification_preferences_assignment_enabled_not_null | assignment_enabled | — | NOT NULL assignment_enabled |
| public | notification_preferences | n | notification_preferences_due_date_enabled_not_null | due_date_enabled | — | NOT NULL due_date_enabled |
| public | notification_preferences | n | notification_preferences_mention_enabled_not_null | mention_enabled | — | NOT NULL mention_enabled |
| public | notification_preferences | Primary key | notification_preferences_pkey | workspace_id, user_id | — | PRIMARY KEY (workspace_id, user_id) |
| public | notification_preferences | n | notification_preferences_updated_at_not_null | updated_at | — | NOT NULL updated_at |
| public | notification_preferences | Foreign key | notification_preferences_user_id_fkey | user_id | public.users (id) | FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE |
| public | notification_preferences | n | notification_preferences_user_id_not_null | user_id | — | NOT NULL user_id |
| public | notification_preferences | Foreign key | notification_preferences_workspace_id_fkey | workspace_id | public.workspaces (id) | FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE |
| public | notification_preferences | n | notification_preferences_workspace_id_not_null | workspace_id | — | NOT NULL workspace_id |
| public | notifications | n | notifications_created_at_not_null | created_at | — | NOT NULL created_at |
| public | notifications | n | notifications_id_not_null | id | — | NOT NULL id |
| public | notifications | n | notifications_is_read_not_null | is_read | — | NOT NULL is_read |
| public | notifications | n | notifications_message_not_null | message | — | NOT NULL message |
| public | notifications | Primary key | notifications_pkey | id | — | PRIMARY KEY (id) |
| public | notifications | n | notifications_type_not_null | type | — | NOT NULL type |
| public | notifications | Foreign key | notifications_user_id_fkey | user_id | public.users (id) | FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE |
| public | notifications | n | notifications_user_id_not_null | user_id | — | NOT NULL user_id |
| public | notifications | Foreign key | notifications_workspace_id_fkey | workspace_id | public.workspaces (id) | FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE |
| public | notifications | n | notifications_workspace_id_not_null | workspace_id | — | NOT NULL workspace_id |
| public | organization_invitations | n | organization_invitations_created_at_not_null | created_at | — | NOT NULL created_at |
| public | organization_invitations | n | organization_invitations_email_not_null | email | — | NOT NULL email |
| public | organization_invitations | n | organization_invitations_expires_at_not_null | expires_at | — | NOT NULL expires_at |
| public | organization_invitations | n | organization_invitations_id_not_null | id | — | NOT NULL id |
| public | organization_invitations | Foreign key | organization_invitations_invited_by_fkey | invited_by | public.users (id) | FOREIGN KEY (invited_by) REFERENCES users(id) |
| public | organization_invitations | n | organization_invitations_invited_by_not_null | invited_by | — | NOT NULL invited_by |
| public | organization_invitations | Unique | organization_invitations_organization_id_email_status_key | organization_id, email, status | — | UNIQUE (organization_id, email, status) |
| public | organization_invitations | Foreign key | organization_invitations_organization_id_fkey | organization_id | public.organizations (id) | FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE |
| public | organization_invitations | n | organization_invitations_organization_id_not_null | organization_id | — | NOT NULL organization_id |
| public | organization_invitations | Primary key | organization_invitations_pkey | id | — | PRIMARY KEY (id) |
| public | organization_invitations | Check | organization_invitations_role_check | role | — | CHECK (role::text = ANY (ARRAY['admin'::character varying, 'manager'::character varying, 'employee'::character varying, 'viewer'::character varying]::text[])) |
| public | organization_invitations | n | organization_invitations_role_not_null | role | — | NOT NULL role |
| public | organization_invitations | Check | organization_invitations_status_check | status | — | CHECK (status::text = ANY (ARRAY['pending'::character varying, 'accepted'::character varying, 'revoked'::character varying, 'expired'::character varying]::text[])) |
| public | organization_invitations | n | organization_invitations_status_not_null | status | — | NOT NULL status |
| public | organization_invitations | Unique | organization_invitations_token_hash_key | token_hash | — | UNIQUE (token_hash) |
| public | organization_invitations | n | organization_invitations_token_hash_not_null | token_hash | — | NOT NULL token_hash |
| public | organization_members | n | organization_members_joined_at_not_null | joined_at | — | NOT NULL joined_at |
| public | organization_members | Foreign key | organization_members_organization_id_fkey | organization_id | public.organizations (id) | FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE |
| public | organization_members | n | organization_members_organization_id_not_null | organization_id | — | NOT NULL organization_id |
| public | organization_members | Primary key | organization_members_pkey | organization_id, user_id | — | PRIMARY KEY (organization_id, user_id) |
| public | organization_members | Check | organization_members_role_check | role | — | CHECK (role::text = ANY (ARRAY['owner'::character varying, 'admin'::character varying, 'manager'::character varying, 'employee'::character varying, 'viewer'::character varying]::text[])) |
| public | organization_members | n | organization_members_role_not_null | role | — | NOT NULL role |
| public | organization_members | Foreign key | organization_members_user_id_fkey | user_id | public.users (id) | FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE |
| public | organization_members | n | organization_members_user_id_not_null | user_id | — | NOT NULL user_id |
| public | organizations | n | organizations_created_at_not_null | created_at | — | NOT NULL created_at |
| public | organizations | n | organizations_id_not_null | id | — | NOT NULL id |
| public | organizations | n | organizations_name_not_null | name | — | NOT NULL name |
| public | organizations | Foreign key | organizations_owner_id_fkey | owner_id | public.users (id) | FOREIGN KEY (owner_id) REFERENCES users(id) |
| public | organizations | n | organizations_owner_id_not_null | owner_id | — | NOT NULL owner_id |
| public | organizations | Primary key | organizations_pkey | id | — | PRIMARY KEY (id) |
| public | organizations | n | organizations_updated_at_not_null | updated_at | — | NOT NULL updated_at |
| public | password_reset_tokens | n | password_reset_tokens_created_at_not_null | created_at | — | NOT NULL created_at |
| public | password_reset_tokens | n | password_reset_tokens_expires_at_not_null | expires_at | — | NOT NULL expires_at |
| public | password_reset_tokens | n | password_reset_tokens_id_not_null | id | — | NOT NULL id |
| public | password_reset_tokens | Primary key | password_reset_tokens_pkey | id | — | PRIMARY KEY (id) |
| public | password_reset_tokens | Unique | password_reset_tokens_token_hash_key | token_hash | — | UNIQUE (token_hash) |
| public | password_reset_tokens | n | password_reset_tokens_token_hash_not_null | token_hash | — | NOT NULL token_hash |
| public | password_reset_tokens | Foreign key | password_reset_tokens_user_id_fkey | user_id | public.users (id) | FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE |
| public | password_reset_tokens | n | password_reset_tokens_user_id_not_null | user_id | — | NOT NULL user_id |
| public | projects | n | projects_created_at_not_null | created_at | — | NOT NULL created_at |
| public | projects | n | projects_id_not_null | id | — | NOT NULL id |
| public | projects | n | projects_name_not_null | name | — | NOT NULL name |
| public | projects | Foreign key | projects_owner_id_fkey | owner_id | public.users (id) | FOREIGN KEY (owner_id) REFERENCES users(id) |
| public | projects | Primary key | projects_pkey | id | — | PRIMARY KEY (id) |
| public | projects | Check | projects_status_check | status | — | CHECK (status::text = ANY (ARRAY['in_progress'::character varying, 'completed'::character varying, 'archived'::character varying]::text[])) |
| public | projects | n | projects_status_not_null | status | — | NOT NULL status |
| public | projects | n | projects_updated_at_not_null | updated_at | — | NOT NULL updated_at |
| public | projects | Foreign key | projects_workspace_id_fkey | workspace_id | public.workspaces (id) | FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE |
| public | projects | n | projects_workspace_id_not_null | workspace_id | — | NOT NULL workspace_id |
| public | recurring_tasks | Foreign key | recurring_tasks_assignee_id_fkey | assignee_id | public.users (id) | FOREIGN KEY (assignee_id) REFERENCES users(id) |
| public | recurring_tasks | n | recurring_tasks_created_at_not_null | created_at | — | NOT NULL created_at |
| public | recurring_tasks | Foreign key | recurring_tasks_created_by_fkey | created_by | public.users (id) | FOREIGN KEY (created_by) REFERENCES users(id) |
| public | recurring_tasks | n | recurring_tasks_created_by_not_null | created_by | — | NOT NULL created_by |
| public | recurring_tasks | Check | recurring_tasks_due_offset_check | due_offset_days | — | CHECK (due_offset_days IS NULL OR due_offset_days >= 0 AND due_offset_days <= 3650) |
| public | recurring_tasks | n | recurring_tasks_id_not_null | id | — | NOT NULL id |
| public | recurring_tasks | Check | recurring_tasks_interval_check | interval_count | — | CHECK (interval_count >= 1 AND interval_count <= 365) |
| public | recurring_tasks | n | recurring_tasks_interval_count_not_null | interval_count | — | NOT NULL interval_count |
| public | recurring_tasks | n | recurring_tasks_is_active_not_null | is_active | — | NOT NULL is_active |
| public | recurring_tasks | Check | recurring_tasks_month_day_check | month_day | — | CHECK (month_day IS NULL OR month_day >= 1 AND month_day <= 31) |
| public | recurring_tasks | n | recurring_tasks_next_run_at_not_null | next_run_at | — | NOT NULL next_run_at |
| public | recurring_tasks | Primary key | recurring_tasks_pkey | id | — | PRIMARY KEY (id) |
| public | recurring_tasks | Check | recurring_tasks_priority_check | priority | — | CHECK (priority::text = ANY (ARRAY['low'::character varying, 'medium'::character varying, 'high'::character varying, 'critical'::character varying]::text[])) |
| public | recurring_tasks | n | recurring_tasks_priority_not_null | priority | — | NOT NULL priority |
| public | recurring_tasks | Foreign key | recurring_tasks_project_id_fkey | project_id | public.projects (id) | FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE |
| public | recurring_tasks | n | recurring_tasks_project_id_not_null | project_id | — | NOT NULL project_id |
| public | recurring_tasks | n | recurring_tasks_recurrence_rule_not_null | recurrence_rule | — | NOT NULL recurrence_rule |
| public | recurring_tasks | n | recurring_tasks_title_not_null | title | — | NOT NULL title |
| public | recurring_tasks | Check | recurring_tasks_unit_check | recurrence_unit | — | CHECK (recurrence_unit IS NULL OR (recurrence_unit::text = ANY (ARRAY['daily'::character varying, 'weekly'::character varying, 'monthly'::character varying, 'custom'::character varying]::text[]))) |
| public | recurring_tasks | n | recurring_tasks_updated_at_not_null | updated_at | — | NOT NULL updated_at |
| public | recurring_tasks | Foreign key | recurring_tasks_workspace_id_fkey | workspace_id | public.workspaces (id) | FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE |
| public | recurring_tasks | n | recurring_tasks_workspace_id_not_null | workspace_id | — | NOT NULL workspace_id |
| public | subtasks | Foreign key | subtasks_assignee_id_fkey | assignee_id | public.users (id) | FOREIGN KEY (assignee_id) REFERENCES users(id) |
| public | subtasks | n | subtasks_created_at_not_null | created_at | — | NOT NULL created_at |
| public | subtasks | Foreign key | subtasks_created_by_fkey | created_by | public.users (id) | FOREIGN KEY (created_by) REFERENCES users(id) |
| public | subtasks | n | subtasks_created_by_not_null | created_by | — | NOT NULL created_by |
| public | subtasks | n | subtasks_id_not_null | id | — | NOT NULL id |
| public | subtasks | n | subtasks_is_completed_not_null | is_completed | — | NOT NULL is_completed |
| public | subtasks | Primary key | subtasks_pkey | id | — | PRIMARY KEY (id) |
| public | subtasks | Foreign key | subtasks_task_id_fkey | task_id | public.tasks (id) | FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE |
| public | subtasks | n | subtasks_task_id_not_null | task_id | — | NOT NULL task_id |
| public | subtasks | n | subtasks_title_not_null | title | — | NOT NULL title |
| public | subtasks | n | subtasks_updated_at_not_null | updated_at | — | NOT NULL updated_at |
| public | subtasks | Foreign key | subtasks_workspace_id_fkey | workspace_id | public.workspaces (id) | FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE |
| public | subtasks | n | subtasks_workspace_id_not_null | workspace_id | — | NOT NULL workspace_id |
| public | task_attachments | Check | task_attachments_byte_size_check | byte_size | — | CHECK (byte_size > 0) |
| public | task_attachments | n | task_attachments_byte_size_not_null | byte_size | — | NOT NULL byte_size |
| public | task_attachments | n | task_attachments_created_at_not_null | created_at | — | NOT NULL created_at |
| public | task_attachments | n | task_attachments_id_not_null | id | — | NOT NULL id |
| public | task_attachments | n | task_attachments_mime_type_not_null | mime_type | — | NOT NULL mime_type |
| public | task_attachments | Foreign key | task_attachments_organization_id_fkey | organization_id | public.organizations (id) | FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE |
| public | task_attachments | n | task_attachments_organization_id_not_null | organization_id | — | NOT NULL organization_id |
| public | task_attachments | n | task_attachments_original_name_not_null | original_name | — | NOT NULL original_name |
| public | task_attachments | Primary key | task_attachments_pkey | id | — | PRIMARY KEY (id) |
| public | task_attachments | Unique | task_attachments_storage_key_key | storage_key | — | UNIQUE (storage_key) |
| public | task_attachments | n | task_attachments_storage_key_not_null | storage_key | — | NOT NULL storage_key |
| public | task_attachments | Foreign key | task_attachments_task_id_fkey | task_id | public.tasks (id) | FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE |
| public | task_attachments | n | task_attachments_task_id_not_null | task_id | — | NOT NULL task_id |
| public | task_attachments | Foreign key | task_attachments_uploaded_by_fkey | uploaded_by | public.users (id) | FOREIGN KEY (uploaded_by) REFERENCES users(id) |
| public | task_attachments | n | task_attachments_uploaded_by_not_null | uploaded_by | — | NOT NULL uploaded_by |
| public | task_attachments | Foreign key | task_attachments_workspace_id_fkey | workspace_id | public.workspaces (id) | FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE |
| public | task_attachments | n | task_attachments_workspace_id_not_null | workspace_id | — | NOT NULL workspace_id |
| public | task_comments | n | task_comments_body_not_null | body | — | NOT NULL body |
| public | task_comments | n | task_comments_created_at_not_null | created_at | — | NOT NULL created_at |
| public | task_comments | n | task_comments_id_not_null | id | — | NOT NULL id |
| public | task_comments | Primary key | task_comments_pkey | id | — | PRIMARY KEY (id) |
| public | task_comments | n | task_comments_task_id_not_null | task_id | — | NOT NULL task_id |
| public | task_comments | n | task_comments_updated_at_not_null | updated_at | — | NOT NULL updated_at |
| public | task_comments | Foreign key | task_comments_user_id_fkey | user_id | public.users (id) | FOREIGN KEY (user_id) REFERENCES users(id) |
| public | task_comments | n | task_comments_user_id_not_null | user_id | — | NOT NULL user_id |
| public | task_comments | Foreign key | task_comments_workspace_id_fkey | workspace_id | public.workspaces (id) | FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE |
| public | task_comments | n | task_comments_workspace_id_not_null | workspace_id | — | NOT NULL workspace_id |
| public | task_dependencies | Check | task_dependencies_check | task_id, depends_on_task_id | — | CHECK (task_id <> depends_on_task_id) |
| public | task_dependencies | n | task_dependencies_created_at_not_null | created_at | — | NOT NULL created_at |
| public | task_dependencies | Foreign key | task_dependencies_created_by_fkey | created_by | public.users (id) | FOREIGN KEY (created_by) REFERENCES users(id) |
| public | task_dependencies | n | task_dependencies_created_by_not_null | created_by | — | NOT NULL created_by |
| public | task_dependencies | Foreign key | task_dependencies_depends_on_task_id_fkey | depends_on_task_id | public.tasks (id) | FOREIGN KEY (depends_on_task_id) REFERENCES tasks(id) ON DELETE CASCADE |
| public | task_dependencies | n | task_dependencies_depends_on_task_id_not_null | depends_on_task_id | — | NOT NULL depends_on_task_id |
| public | task_dependencies | Primary key | task_dependencies_pkey | task_id, depends_on_task_id | — | PRIMARY KEY (task_id, depends_on_task_id) |
| public | task_dependencies | Foreign key | task_dependencies_task_id_fkey | task_id | public.tasks (id) | FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE |
| public | task_dependencies | n | task_dependencies_task_id_not_null | task_id | — | NOT NULL task_id |
| public | task_dependencies | Foreign key | task_dependencies_workspace_id_fkey | workspace_id | public.workspaces (id) | FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE |
| public | task_dependencies | n | task_dependencies_workspace_id_not_null | workspace_id | — | NOT NULL workspace_id |
| public | task_labels | Foreign key | task_labels_label_id_fkey | label_id | public.labels (id) | FOREIGN KEY (label_id) REFERENCES labels(id) ON DELETE CASCADE |
| public | task_labels | n | task_labels_label_id_not_null | label_id | — | NOT NULL label_id |
| public | task_labels | Primary key | task_labels_pkey | task_id, label_id | — | PRIMARY KEY (task_id, label_id) |
| public | task_labels | Foreign key | task_labels_task_id_fkey | task_id | public.tasks (id) | FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE |
| public | task_labels | n | task_labels_task_id_not_null | task_id | — | NOT NULL task_id |
| public | task_labels | Foreign key | task_labels_workspace_id_fkey | workspace_id | public.workspaces (id) | FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE |
| public | task_labels | n | task_labels_workspace_id_not_null | workspace_id | — | NOT NULL workspace_id |
| public | tasks | Foreign key | tasks_assignee_id_fkey | assignee_id | public.users (id) | FOREIGN KEY (assignee_id) REFERENCES users(id) |
| public | tasks | n | tasks_created_at_not_null | created_at | — | NOT NULL created_at |
| public | tasks | Foreign key | tasks_created_by_fkey | created_by | public.users (id) | FOREIGN KEY (created_by) REFERENCES users(id) |
| public | tasks | n | tasks_created_by_not_null | created_by | — | NOT NULL created_by |
| public | tasks | Check | tasks_estimated_minutes_check | estimated_minutes | — | CHECK (estimated_minutes IS NULL OR estimated_minutes >= 0 AND estimated_minutes <= 525600) |
| public | tasks | n | tasks_id_not_null | id | — | NOT NULL id |
| public | tasks | Primary key | tasks_pkey | id | — | PRIMARY KEY (id) |
| public | tasks | Check | tasks_priority_check | priority | — | CHECK (priority::text = ANY (ARRAY['low'::character varying, 'medium'::character varying, 'high'::character varying, 'critical'::character varying]::text[])) |
| public | tasks | n | tasks_priority_not_null | priority | — | NOT NULL priority |
| public | tasks | Foreign key | tasks_project_id_fkey | project_id | public.projects (id) | FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE |
| public | tasks | n | tasks_project_id_not_null | project_id | — | NOT NULL project_id |
| public | tasks | Foreign key | tasks_project_workspace_fk | workspace_id, project_id | public.projects (workspace_id, id) | FOREIGN KEY (workspace_id, project_id) REFERENCES projects(workspace_id, id) NOT VALID |
| public | tasks | Foreign key | tasks_recurrence_id_fkey | recurrence_id | public.recurring_tasks (id) | FOREIGN KEY (recurrence_id) REFERENCES recurring_tasks(id) ON DELETE SET NULL |
| public | tasks | Check | tasks_status_check | status | — | CHECK (status::text = ANY (ARRAY['todo'::character varying, 'in_progress'::character varying, 'in_review'::character varying, 'completed'::character varying]::text[])) |
| public | tasks | n | tasks_status_not_null | status | — | NOT NULL status |
| public | tasks | n | tasks_title_not_null | title | — | NOT NULL title |
| public | tasks | n | tasks_updated_at_not_null | updated_at | — | NOT NULL updated_at |
| public | tasks | Foreign key | tasks_workspace_id_fkey | workspace_id | public.workspaces (id) | FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE |
| public | tasks | n | tasks_workspace_id_not_null | workspace_id | — | NOT NULL workspace_id |
| public | team_members | n | team_members_joined_at_not_null | joined_at | — | NOT NULL joined_at |
| public | team_members | Primary key | team_members_pkey | team_id, user_id | — | PRIMARY KEY (team_id, user_id) |
| public | team_members | Check | team_members_role_check | role | — | CHECK (role::text = ANY (ARRAY['manager'::character varying, 'employee'::character varying]::text[])) |
| public | team_members | n | team_members_role_not_null | role | — | NOT NULL role |
| public | team_members | n | team_members_team_id_not_null | team_id | — | NOT NULL team_id |
| public | team_members | n | team_members_user_id_not_null | user_id | — | NOT NULL user_id |
| public | team_members | n | team_members_workspace_id_not_null | workspace_id | — | NOT NULL workspace_id |
| public | team_members | Foreign key | team_members_workspace_id_team_id_fkey | workspace_id, team_id | public.teams (workspace_id, id) | FOREIGN KEY (workspace_id, team_id) REFERENCES teams(workspace_id, id) ON DELETE CASCADE |
| public | team_members | Foreign key | team_members_workspace_id_user_id_fkey | workspace_id, user_id | public.workspace_members (workspace_id, user_id) | FOREIGN KEY (workspace_id, user_id) REFERENCES workspace_members(workspace_id, user_id) ON DELETE CASCADE |
| public | teams | n | teams_created_at_not_null | created_at | — | NOT NULL created_at |
| public | teams | Foreign key | teams_created_by_fkey | created_by | public.users (id) | FOREIGN KEY (created_by) REFERENCES users(id) |
| public | teams | n | teams_created_by_not_null | created_by | — | NOT NULL created_by |
| public | teams | n | teams_id_not_null | id | — | NOT NULL id |
| public | teams | Foreign key | teams_manager_id_fkey | manager_id | public.users (id) | FOREIGN KEY (manager_id) REFERENCES users(id) ON DELETE SET NULL |
| public | teams | n | teams_name_not_null | name | — | NOT NULL name |
| public | teams | Primary key | teams_pkey | id | — | PRIMARY KEY (id) |
| public | teams | n | teams_updated_at_not_null | updated_at | — | NOT NULL updated_at |
| public | teams | Foreign key | teams_workspace_id_fkey | workspace_id | public.workspaces (id) | FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE |
| public | teams | Unique | teams_workspace_id_id_key | workspace_id, id | — | UNIQUE (workspace_id, id) |
| public | teams | Unique | teams_workspace_id_name_key | workspace_id, name | — | UNIQUE (workspace_id, name) |
| public | teams | n | teams_workspace_id_not_null | workspace_id | — | NOT NULL workspace_id |
| public | time_entries | n | time_entries_created_at_not_null | created_at | — | NOT NULL created_at |
| public | time_entries | Check | time_entries_duration_seconds_check | duration_seconds | — | CHECK (duration_seconds IS NULL OR duration_seconds >= 0) |
| public | time_entries | n | time_entries_id_not_null | id | — | NOT NULL id |
| public | time_entries | Primary key | time_entries_pkey | id | — | PRIMARY KEY (id) |
| public | time_entries | n | time_entries_started_at_not_null | started_at | — | NOT NULL started_at |
| public | time_entries | Foreign key | time_entries_task_id_fkey | task_id | public.tasks (id) | FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE |
| public | time_entries | n | time_entries_task_id_not_null | task_id | — | NOT NULL task_id |
| public | time_entries | Foreign key | time_entries_user_id_fkey | user_id | public.users (id) | FOREIGN KEY (user_id) REFERENCES users(id) |
| public | time_entries | n | time_entries_user_id_not_null | user_id | — | NOT NULL user_id |
| public | time_entries | Foreign key | time_entries_workspace_id_fkey | workspace_id | public.workspaces (id) | FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE |
| public | time_entries | n | time_entries_workspace_id_not_null | workspace_id | — | NOT NULL workspace_id |
| public | users | n | users_created_at_not_null | created_at | — | NOT NULL created_at |
| public | users | Unique | users_email_key | email | — | UNIQUE (email) |
| public | users | n | users_email_not_null | email | — | NOT NULL email |
| public | users | n | users_id_not_null | id | — | NOT NULL id |
| public | users | n | users_name_not_null | name | — | NOT NULL name |
| public | users | n | users_password_hash_not_null | password_hash | — | NOT NULL password_hash |
| public | users | Primary key | users_pkey | id | — | PRIMARY KEY (id) |
| public | users | n | users_token_version_not_null | token_version | — | NOT NULL token_version |
| public | users | n | users_updated_at_not_null | updated_at | — | NOT NULL updated_at |
| public | workspace_invitations | n | workspace_invitations_created_at_not_null | created_at | — | NOT NULL created_at |
| public | workspace_invitations | n | workspace_invitations_email_not_null | email | — | NOT NULL email |
| public | workspace_invitations | n | workspace_invitations_expires_at_not_null | expires_at | — | NOT NULL expires_at |
| public | workspace_invitations | n | workspace_invitations_id_not_null | id | — | NOT NULL id |
| public | workspace_invitations | Foreign key | workspace_invitations_invited_by_fkey | invited_by | public.users (id) | FOREIGN KEY (invited_by) REFERENCES users(id) |
| public | workspace_invitations | n | workspace_invitations_invited_by_not_null | invited_by | — | NOT NULL invited_by |
| public | workspace_invitations | Primary key | workspace_invitations_pkey | id | — | PRIMARY KEY (id) |
| public | workspace_invitations | Check | workspace_invitations_role_check | role | — | CHECK (role::text = ANY (ARRAY['admin'::character varying, 'manager'::character varying, 'member'::character varying, 'employee'::character varying, 'viewer'::character varying]::text[])) |
| public | workspace_invitations | n | workspace_invitations_role_not_null | role | — | NOT NULL role |
| public | workspace_invitations | Check | workspace_invitations_status_check | status | — | CHECK (status::text = ANY (ARRAY['pending'::character varying, 'accepted'::character varying, 'revoked'::character varying, 'expired'::character varying]::text[])) |
| public | workspace_invitations | n | workspace_invitations_status_not_null | status | — | NOT NULL status |
| public | workspace_invitations | Unique | workspace_invitations_token_hash_key | token_hash | — | UNIQUE (token_hash) |
| public | workspace_invitations | n | workspace_invitations_token_hash_not_null | token_hash | — | NOT NULL token_hash |
| public | workspace_invitations | Unique | workspace_invitations_workspace_id_email_status_key | workspace_id, email, status | — | UNIQUE (workspace_id, email, status) |
| public | workspace_invitations | Foreign key | workspace_invitations_workspace_id_fkey | workspace_id | public.workspaces (id) | FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE |
| public | workspace_invitations | n | workspace_invitations_workspace_id_not_null | workspace_id | — | NOT NULL workspace_id |
| public | workspace_members | n | workspace_members_joined_at_not_null | joined_at | — | NOT NULL joined_at |
| public | workspace_members | Primary key | workspace_members_pkey | workspace_id, user_id | — | PRIMARY KEY (workspace_id, user_id) |
| public | workspace_members | Check | workspace_members_role_check | role | — | CHECK (role::text = ANY (ARRAY['owner'::character varying, 'admin'::character varying, 'manager'::character varying, 'member'::character varying, 'employee'::character varying, 'viewer'::character varying]::text[])) |
| public | workspace_members | n | workspace_members_role_not_null | role | — | NOT NULL role |
| public | workspace_members | Foreign key | workspace_members_user_id_fkey | user_id | public.users (id) | FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE |
| public | workspace_members | n | workspace_members_user_id_not_null | user_id | — | NOT NULL user_id |
| public | workspace_members | Foreign key | workspace_members_workspace_id_fkey | workspace_id | public.workspaces (id) | FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE |
| public | workspace_members | n | workspace_members_workspace_id_not_null | workspace_id | — | NOT NULL workspace_id |
| public | workspaces | n | workspaces_created_at_not_null | created_at | — | NOT NULL created_at |
| public | workspaces | n | workspaces_id_not_null | id | — | NOT NULL id |
| public | workspaces | n | workspaces_name_not_null | name | — | NOT NULL name |
| public | workspaces | Foreign key | workspaces_organization_fk | organization_id | public.organizations (id) | FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE |
| public | workspaces | n | workspaces_organization_id_not_null | organization_id | — | NOT NULL organization_id |
| public | workspaces | Foreign key | workspaces_owner_id_fkey | owner_id | public.users (id) | FOREIGN KEY (owner_id) REFERENCES users(id) |
| public | workspaces | n | workspaces_owner_id_not_null | owner_id | — | NOT NULL owner_id |
| public | workspaces | Primary key | workspaces_pkey | id | — | PRIMARY KEY (id) |
| public | workspaces | n | workspaces_updated_at_not_null | updated_at | — | NOT NULL updated_at |

## Indexes

| Table | Index | Definition |
| --- | --- | --- |
| public.activity_logs | activity_logs_pkey | CREATE UNIQUE INDEX activity_logs_pkey ON public.activity_logs USING btree (id) |
| public.activity_logs | idx_activity_resource | CREATE INDEX idx_activity_resource ON public.activity_logs USING btree (workspace_id, resource_type, resource_id, created_at DESC) |
| public.labels | labels_pkey | CREATE UNIQUE INDEX labels_pkey ON public.labels USING btree (id) |
| public.labels | labels_workspace_id_name_key | CREATE UNIQUE INDEX labels_workspace_id_name_key ON public.labels USING btree (workspace_id, name) |
| public.milestones | idx_milestones_project | CREATE INDEX idx_milestones_project ON public.milestones USING btree (workspace_id, project_id) |
| public.milestones | milestones_pkey | CREATE UNIQUE INDEX milestones_pkey ON public.milestones USING btree (id) |
| public.notification_preferences | notification_preferences_pkey | CREATE UNIQUE INDEX notification_preferences_pkey ON public.notification_preferences USING btree (workspace_id, user_id) |
| public.notifications | idx_notifications_dedupe | CREATE UNIQUE INDEX idx_notifications_dedupe ON public.notifications USING btree (dedupe_key) WHERE (dedupe_key IS NOT NULL) |
| public.notifications | idx_notifications_user | CREATE INDEX idx_notifications_user ON public.notifications USING btree (user_id, is_read) |
| public.notifications | notifications_pkey | CREATE UNIQUE INDEX notifications_pkey ON public.notifications USING btree (id) |
| public.organization_invitations | organization_invitations_organization_id_email_status_key | CREATE UNIQUE INDEX organization_invitations_organization_id_email_status_key ON public.organization_invitations USING btree (organization_id, email, status) |
| public.organization_invitations | organization_invitations_pkey | CREATE UNIQUE INDEX organization_invitations_pkey ON public.organization_invitations USING btree (id) |
| public.organization_invitations | organization_invitations_token_hash_key | CREATE UNIQUE INDEX organization_invitations_token_hash_key ON public.organization_invitations USING btree (token_hash) |
| public.organization_members | idx_organization_members_user | CREATE INDEX idx_organization_members_user ON public.organization_members USING btree (user_id, organization_id) |
| public.organization_members | organization_members_pkey | CREATE UNIQUE INDEX organization_members_pkey ON public.organization_members USING btree (organization_id, user_id) |
| public.organizations | organizations_pkey | CREATE UNIQUE INDEX organizations_pkey ON public.organizations USING btree (id) |
| public.password_reset_tokens | idx_password_reset_user | CREATE INDEX idx_password_reset_user ON public.password_reset_tokens USING btree (user_id, expires_at DESC) |
| public.password_reset_tokens | password_reset_tokens_pkey | CREATE UNIQUE INDEX password_reset_tokens_pkey ON public.password_reset_tokens USING btree (id) |
| public.password_reset_tokens | password_reset_tokens_token_hash_key | CREATE UNIQUE INDEX password_reset_tokens_token_hash_key ON public.password_reset_tokens USING btree (token_hash) |
| public.projects | idx_projects_workspace | CREATE INDEX idx_projects_workspace ON public.projects USING btree (workspace_id) |
| public.projects | projects_pkey | CREATE UNIQUE INDEX projects_pkey ON public.projects USING btree (id) |
| public.projects | projects_workspace_id_id_unique | CREATE UNIQUE INDEX projects_workspace_id_id_unique ON public.projects USING btree (workspace_id, id) |
| public.recurring_tasks | idx_recurring_tasks_active_due | CREATE INDEX idx_recurring_tasks_active_due ON public.recurring_tasks USING btree (next_run_at, id) WHERE ((is_active = true) AND (paused_at IS NULL)) |
| public.recurring_tasks | idx_recurring_tasks_due | CREATE INDEX idx_recurring_tasks_due ON public.recurring_tasks USING btree (next_run_at) WHERE (is_active = true) |
| public.recurring_tasks | recurring_tasks_pkey | CREATE UNIQUE INDEX recurring_tasks_pkey ON public.recurring_tasks USING btree (id) |
| public.subtasks | idx_subtasks_task | CREATE INDEX idx_subtasks_task ON public.subtasks USING btree (workspace_id, task_id) |
| public.subtasks | subtasks_pkey | CREATE UNIQUE INDEX subtasks_pkey ON public.subtasks USING btree (id) |
| public.task_attachments | idx_task_attachments_task | CREATE INDEX idx_task_attachments_task ON public.task_attachments USING btree (organization_id, workspace_id, task_id, created_at) |
| public.task_attachments | task_attachments_pkey | CREATE UNIQUE INDEX task_attachments_pkey ON public.task_attachments USING btree (id) |
| public.task_attachments | task_attachments_storage_key_key | CREATE UNIQUE INDEX task_attachments_storage_key_key ON public.task_attachments USING btree (storage_key) |
| public.task_comments | idx_comments_task | CREATE INDEX idx_comments_task ON public.task_comments USING btree (task_id) |
| public.task_comments | task_comments_pkey | CREATE UNIQUE INDEX task_comments_pkey ON public.task_comments USING btree (id) |
| public.task_dependencies | idx_task_dependencies_blocker | CREATE INDEX idx_task_dependencies_blocker ON public.task_dependencies USING btree (workspace_id, depends_on_task_id) |
| public.task_dependencies | task_dependencies_pkey | CREATE UNIQUE INDEX task_dependencies_pkey ON public.task_dependencies USING btree (task_id, depends_on_task_id) |
| public.task_labels | task_labels_pkey | CREATE UNIQUE INDEX task_labels_pkey ON public.task_labels USING btree (task_id, label_id) |
| public.tasks | idx_tasks_assignee | CREATE INDEX idx_tasks_assignee ON public.tasks USING btree (assignee_id) |
| public.tasks | idx_tasks_project | CREATE INDEX idx_tasks_project ON public.tasks USING btree (project_id) |
| public.tasks | idx_tasks_recurring_occurrence | CREATE UNIQUE INDEX idx_tasks_recurring_occurrence ON public.tasks USING btree (recurrence_id, recurrence_run_at) WHERE ((recurrence_id IS NOT NULL) AND (recurrence_run_at IS NOT NULL)) |
| public.tasks | idx_tasks_workspace | CREATE INDEX idx_tasks_workspace ON public.tasks USING btree (workspace_id) |
| public.tasks | tasks_pkey | CREATE UNIQUE INDEX tasks_pkey ON public.tasks USING btree (id) |
| public.team_members | idx_team_members_user | CREATE INDEX idx_team_members_user ON public.team_members USING btree (workspace_id, user_id) |
| public.team_members | team_members_pkey | CREATE UNIQUE INDEX team_members_pkey ON public.team_members USING btree (team_id, user_id) |
| public.teams | teams_pkey | CREATE UNIQUE INDEX teams_pkey ON public.teams USING btree (id) |
| public.teams | teams_workspace_id_id_key | CREATE UNIQUE INDEX teams_workspace_id_id_key ON public.teams USING btree (workspace_id, id) |
| public.teams | teams_workspace_id_name_key | CREATE UNIQUE INDEX teams_workspace_id_name_key ON public.teams USING btree (workspace_id, name) |
| public.time_entries | idx_time_entries_completed | CREATE INDEX idx_time_entries_completed ON public.time_entries USING btree (workspace_id, ended_at, started_at) WHERE (ended_at IS NOT NULL) |
| public.time_entries | idx_time_entries_task | CREATE INDEX idx_time_entries_task ON public.time_entries USING btree (workspace_id, task_id, started_at DESC) |
| public.time_entries | idx_time_entries_user_started | CREATE INDEX idx_time_entries_user_started ON public.time_entries USING btree (workspace_id, user_id, started_at DESC) |
| public.time_entries | time_entries_pkey | CREATE UNIQUE INDEX time_entries_pkey ON public.time_entries USING btree (id) |
| public.users | users_email_key | CREATE UNIQUE INDEX users_email_key ON public.users USING btree (email) |
| public.users | users_email_lower_unique | CREATE UNIQUE INDEX users_email_lower_unique ON public.users USING btree (lower((email)::text)) |
| public.users | users_pkey | CREATE UNIQUE INDEX users_pkey ON public.users USING btree (id) |
| public.workspace_invitations | workspace_invitations_pkey | CREATE UNIQUE INDEX workspace_invitations_pkey ON public.workspace_invitations USING btree (id) |
| public.workspace_invitations | workspace_invitations_token_hash_key | CREATE UNIQUE INDEX workspace_invitations_token_hash_key ON public.workspace_invitations USING btree (token_hash) |
| public.workspace_invitations | workspace_invitations_workspace_id_email_status_key | CREATE UNIQUE INDEX workspace_invitations_workspace_id_email_status_key ON public.workspace_invitations USING btree (workspace_id, email, status) |
| public.workspace_members | idx_workspace_members_user | CREATE INDEX idx_workspace_members_user ON public.workspace_members USING btree (user_id) |
| public.workspace_members | workspace_members_pkey | CREATE UNIQUE INDEX workspace_members_pkey ON public.workspace_members USING btree (workspace_id, user_id) |
| public.workspaces | idx_workspaces_organization | CREATE INDEX idx_workspaces_organization ON public.workspaces USING btree (organization_id, id) |
| public.workspaces | workspaces_pkey | CREATE UNIQUE INDEX workspaces_pkey ON public.workspaces USING btree (id) |

## Workspace membership isolation check

Count of `workspace_members` rows without a matching `organization_members` row for the workspace's organization: **0**.

_None._

## Migration mismatches

Comparison is against objects parsed from the migration `CREATE TABLE`, `ALTER TABLE ADD COLUMN/CONSTRAINT`, and `CREATE INDEX` statements in the current schema. Extra live objects are not treated as a mismatch. Definitions that differ despite matching names, inline constraints not parsed as named objects, data backfills, and unsupported SQL constructs require manual review.

- Missing tables: none
- Missing columns: none
- Missing named indexes: none
- Missing named constraints: none

## Reproduction

Run `node scripts/db-inspect.js --write-report` from the repository root. The script uses the backend pool configuration and emits no connection credentials or table row values.
