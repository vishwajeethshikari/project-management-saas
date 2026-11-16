# API contracts

The active API is Node.js/Express with a PostgreSQL database. The default API
base URL is `http://localhost:5000/api`; the frontend can override it with
`VITE_API_URL`. Requests and responses use JSON except for `GET /`, which is
plain text, and successful `204` delete responses.

## Health and readiness

| Method | Path | Authentication | Purpose |
|---|---|---|---|
| GET | `/` | None | Plain-text service name |
| GET | `/api/health` | None | Express process liveness |
| GET | `/api/ready` | None | Checks PostgreSQL with `SELECT 1` |

## Authentication

| Method | Path | Authentication | Purpose |
|---|---|---|---|
| POST | `/api/auth/register` | None | Creates a user after input validation and bcrypt hashing |
| POST | `/api/auth/login` | None | Verifies credentials and sets a JWT session cookie |
| POST | `/api/auth/logout` | None | Clears the JWT session cookie |
| POST | `/api/auth/password/forgot` | None | Starts single-use password recovery; response avoids account enumeration |
| POST | `/api/auth/password/reset` | None | Resets a password with a time-limited token |
| GET | `/api/auth/me` | Session cookie or bearer token | Returns the authenticated profile |
| PATCH | `/api/auth/me` | Session cookie or bearer token | Updates the user's name |

The login cookie is HttpOnly, SameSite=Lax, scoped to `/`, and Secure in
production. The browser API client includes credentials. Bearer-token requests
are accepted for clients that already have a token; the login response no
longer exposes one to browser JavaScript. Passwords must be at least 8
characters and at most 72 UTF-8 bytes; emails are normalized to lowercase.

## Workspaces and collaboration

Every workspace route requires an authenticated user. Workspace-specific
routes also verify membership.

## Organizations

Organization membership is checked independently from workspace membership.
Organization managers can create workspaces; owner/admin roles manage
organization details, members, and invitations.

| Method | Path | Minimum role | Purpose |
|---|---|---|---|
| GET/POST | `/api/organizations` | Authenticated user | List organizations or create an organization with owner membership |
| GET/PATCH | `/api/organizations/:organizationId` | Member / Admin | Read or rename an organization |
| GET | `/api/organizations/:organizationId/members` | Member | List organization members |
| GET | `/api/organizations/:organizationId/analytics` | Member | Read organization-wide task, deadline, completion, workload, and trend metrics |
| DELETE | `/api/organizations/:organizationId/members/:userId` | Admin | Remove a member from the organization and its workspaces |
| GET/POST | `/api/organizations/:organizationId/invitations` | Admin | List or issue seven-day organization invitations |
| POST | `/api/organizations/:organizationId/invitations/:invitationId/resend` | Admin | Rotate and resend a pending invitation token |
| PATCH | `/api/organizations/:organizationId/invitations/:invitationId/revoke` | Admin | Revoke a pending invitation |
| POST | `/api/organizations/invitations/accept` | Authenticated user | Accept an email-bound organization invitation |

| Method | Path | Minimum role | Purpose |
|---|---|---|---|
| GET | `/api/workspaces` | Any authenticated user | List accessible workspaces |
| POST | `/api/workspaces` | Any authenticated user | Create a workspace and become its owner |
| GET | `/api/workspaces/:workspaceId` | Member | Read a workspace |
| PATCH | `/api/workspaces/:workspaceId` | Admin | Update its name or description |
| DELETE | `/api/workspaces/:workspaceId` | Owner | Delete the workspace and cascading data |
| GET | `/api/workspaces/:workspaceId/members` | Member | List members |
| POST | `/api/workspaces/:workspaceId/invitations` | Admin | Create a seven-day invitation |
| POST | `/api/workspaces/invitations/accept` | Authenticated user | Accept an invitation tied to the user's email address |
| GET/POST | `/api/workspaces/:workspaceId/teams` | Member/Admin | List or create workspace teams |
| GET/PATCH/DELETE | `/api/workspaces/:workspaceId/teams/:teamId` | Member/Admin | Read, update, or delete a team |
| GET/POST | `/api/workspaces/:workspaceId/teams/:teamId/members` | Member/Admin | List or add workspace team members |
| DELETE | `/api/workspaces/:workspaceId/teams/:teamId/members/:userId` | Admin | Remove a team member |
| GET | `/api/workspaces/:workspaceId/dashboard` | Member | Read workspace metrics |
| GET | `/api/workspaces/:workspaceId/notifications` | Member | List the user's notifications |
| PATCH | `/api/workspaces/:workspaceId/notifications/:notificationId/read` | Member | Mark a notification read |
| GET/PATCH | `/api/workspaces/:workspaceId/notification-preferences` | Member | Read or update assignment, mention, and due-date notification preferences |
| GET | `/api/workspaces/:workspaceId/workload` | Member | Read task counts, deadlines, estimates, and tracked time per assignee |
| GET | `/api/workspaces/:workspaceId/analytics` | Member | Read workspace metrics, project summaries, workload, and monthly completion trend |
| GET | `/api/workspaces/:workspaceId/analytics/export.csv` | Member | Download a workspace-scoped CSV task report |
| GET | `/api/workspaces/:workspaceId/activity` | Member | Read recent workspace activity |

## Projects and tasks

| Method | Path | Minimum role | Purpose |
|---|---|---|---|
| GET | `/api/workspaces/:workspaceId/projects` | Member | List/search workspace projects |
| POST | `/api/workspaces/:workspaceId/projects` | Manager | Create a project |
| GET | `/api/workspaces/:workspaceId/projects/:projectId` | Member | Read a project |
| PATCH | `/api/workspaces/:workspaceId/projects/:projectId` | Manager | Update a project |
| DELETE | `/api/workspaces/:workspaceId/projects/:projectId` | Admin | Delete a project and its tasks |
| GET | `/api/workspaces/:workspaceId/projects/:projectId/timeline` | Member | Read project task dates, dependencies, progress, and milestones |
| GET | `/api/workspaces/:workspaceId/projects/:projectId/analytics` | Member | Read project metrics and completion trend |
| POST/PATCH/DELETE | `/api/workspaces/:workspaceId/projects/:projectId/milestones` | Manager | Create/update/delete project milestones |
| GET | `/api/workspaces/:workspaceId/teams/:teamId/productivity` | Member | Read team task, completion, estimate, and tracked-time metrics |
| GET | `/api/workspaces/:workspaceId/projects/:projectId/tasks` | Member | List/search/filter project tasks |
| POST | `/api/workspaces/:workspaceId/tasks` | Manager | Create a task in the body-specified project |
| GET | `/api/workspaces/:workspaceId/tasks/:taskId` | Member | Read a task |
| PATCH | `/api/workspaces/:workspaceId/tasks/:taskId` | Member | Update task fields |
| DELETE | `/api/workspaces/:workspaceId/tasks/:taskId` | Manager | Delete a task |
| GET/POST | `/api/workspaces/:workspaceId/tasks/:taskId/comments` | Member | List/create task comments |
| GET/POST | `/api/workspaces/:workspaceId/tasks/:taskId/subtasks` | Member | List/create subtasks |
| PATCH/DELETE | `/api/workspaces/:workspaceId/tasks/:taskId/subtasks/:subtaskId` | Member | Update/delete a subtask |
| GET/POST | `/api/workspaces/:workspaceId/tasks/:taskId/dependencies` | Member | List/add blocking dependencies; cycles are rejected |
| DELETE | `/api/workspaces/:workspaceId/tasks/:taskId/dependencies/:blockerId` | Member | Remove a dependency |
| GET | `/api/workspaces/:workspaceId/tasks/:taskId/attachments` | Member | List task attachment metadata |
| POST | `/api/workspaces/:workspaceId/tasks/:taskId/attachments` | Member | Upload one validated PDF or image (multipart field `file`, max 10 MB) |
| GET | `/api/workspaces/:workspaceId/tasks/:taskId/attachments/:attachmentId/download` | Member | Download a task attachment |
| DELETE | `/api/workspaces/:workspaceId/tasks/:taskId/attachments/:attachmentId` | Uploader or Manager+ | Delete the attachment and its stored file |

Use the Zod domain schemas for allowed project/task statuses and priorities.
All numeric path identifiers are validated before database access.
Attachment access is scoped to the authorized organization and workspace.
Only PDF, GIF, JPEG, PNG, and WebP files whose content signatures match their
declared MIME type are accepted. Files are stored outside the static web root;
`ATTACHMENT_STORAGE_DIR` can select a private storage directory.

## Time tracking

| Method | Path | Minimum role | Purpose |
|---|---|---|---|
| GET | `/api/workspaces/:workspaceId/time-entries/active` | Member | Read the current user's active workspace timer |
| POST | `/api/workspaces/:workspaceId/time-entries/start` | Member | Start a timer for `{ "taskId": 123 }`; rejects a second active timer in the workspace |
| GET | `/api/workspaces/:workspaceId/tasks/:taskId/time-entries` | Member | List task time entries and its total |
| POST | `/api/workspaces/:workspaceId/tasks/:taskId/time-entries` | Member | Create a manual entry with ISO `startedAt`, `endedAt`, and optional `note` |
| POST | `/api/workspaces/:workspaceId/tasks/:taskId/time-entries/:entryId/stop` | Member | Stop an active timer |
| PATCH | `/api/workspaces/:workspaceId/tasks/:taskId/time-entries/:entryId` | Member | Edit a completed entry; owner or manager+ |
| DELETE | `/api/workspaces/:workspaceId/tasks/:taskId/time-entries/:entryId` | Member | Delete a completed entry; owner or manager+ |
| GET | `/api/workspaces/:workspaceId/projects/:projectId/time-summary` | Member | Read project task/entry counts and total tracked seconds |
| GET | `/api/workspaces/:workspaceId/time-reports` | Member | Daily, weekly, and project totals; accepts optional `fromDate` and `toDate` |
| GET | `/api/workspaces/:workspaceId/recurring-tasks` | Member | List workspace recurring task rules |
| POST | `/api/workspaces/:workspaceId/recurring-tasks` | Manager | Create a daily, weekly, monthly, or interval-based recurrence |
| POST | `/api/workspaces/:workspaceId/recurring-tasks/:recurringTaskId/pause` | Manager | Pause an active recurrence |
| POST | `/api/workspaces/:workspaceId/recurring-tasks/:recurringTaskId/resume` | Manager | Resume a paused recurrence |
| DELETE | `/api/workspaces/:workspaceId/recurring-tasks/:recurringTaskId` | Manager | Delete a recurrence rule |

Recurring task generation and due-date reminders run in the backend process.
Occurrence keys and notification dedupe keys prevent duplicate generation when
the scheduled jobs are retried. Notification polling in the frontend refreshes
the inbox every 30 seconds; reminders are generated for assigned tasks due
today or tomorrow.

## Error behavior

Validation errors return `400` with `success: false`, a message, and field
details. Missing or invalid authentication returns `401`; insufficient role
returns `403`; unavailable resources return `404`; duplicate account email
returns `409`. Unexpected failures return a generic `500` response.

The database schema source is the ordered migrations in
`database/migrations/`; see [Database schema](database-schema.md).

Invitation and recovery email delivery uses the Resend HTTP API when both
`EMAIL_API_KEY` and `EMAIL_FROM` are set. In non-production environments
without email credentials, invitation URLs and reset tokens are returned for
local development; they are never exposed by those endpoints in production.
