# Roles and authorization policy

The API authorizes organization actions against `organization_members` and workspace actions against `workspace_members`. Workspace access also requires the matching organization membership. Migration 009 repairs older workspace memberships that are missing the organization row.

## Role mapping and rank

| Product role | Organization role | Workspace role | Rank | Meaning |
|---|---|---|---:|---|
| OWNER/ADMIN | `owner` or `admin` | `owner` or `admin` | 4 / 3 | Full administration. A few operations, such as deleting a workspace, require the actual owner. |
| MANAGER | `manager` | `manager` | 2 | Manages teams, projects, and task creation and can perform manager level edits. Cannot perform admin or owner actions. |
| EMPLOYEE | `employee` | `employee` or legacy `member` | 1 | Collaborates on workspace work. Can change status on tasks assigned to them. |
| Read-only legacy role | `viewer` | `viewer` | 0 | Can view authorized workspace or organization data. |

The shared rank is defined in `backend/src/security/roles.js` and is used by both organization and workspace membership middleware. `member` is an alias for `employee` at the same rank. Unknown roles have no permissions. The organization and workspace membership records are separate: having only one is insufficient for workspace access.

Creating an organization makes its creator an `owner`. Creating a workspace in an existing organization carries the creator's `owner`, `admin`, or `manager` role into the workspace. Accepting a workspace invitation creates both memberships in one transaction; `member` maps to organization `employee`, and other allowed invitation roles keep their name. An organization invitation grants organization membership only.

## Action matrix

`—` means the action is not exposed by the current API. “Member” means an authorized workspace member; it includes employees and managers, while viewer access is listed separately where it differs. Deleting an organization, editing or deleting comments, and project invitations are not currently exposed.

| Resource | View | Create | Edit | Delete | Invite | Remove member |
|---|---|---|---|---|---|---|
| Organizations | All organization roles | Signed-in user; creator becomes owner | OWNER/ADMIN | — | OWNER/ADMIN | OWNER/ADMIN; cannot remove the owner |
| Workspaces | All workspace roles | Organization OWNER/ADMIN/MANAGER | OWNER/ADMIN | Workspace OWNER only, and must match `workspaces.owner_id` | OWNER/ADMIN | OWNER/ADMIN through organization member removal; removes the member from every workspace in that organization |
| Teams | All workspace roles | OWNER/ADMIN/MANAGER | OWNER/ADMIN/MANAGER | OWNER/ADMIN/MANAGER | OWNER/ADMIN/MANAGER | OWNER/ADMIN/MANAGER |
| Projects | All workspace roles | OWNER/ADMIN/MANAGER | OWNER/ADMIN/MANAGER | OWNER/ADMIN | — | — |
| Tasks | All workspace roles | OWNER/ADMIN/MANAGER | OWNER/ADMIN/MANAGER for all fields; EMPLOYEE for status on own assigned tasks | OWNER/ADMIN/MANAGER | — | — |
| Comments | All workspace roles | OWNER/ADMIN/MANAGER/EMPLOYEE | — | — | — | — |
| Attachments | All workspace roles | OWNER/ADMIN/MANAGER/EMPLOYEE | — | OWNER/ADMIN/MANAGER or uploader | — | — |
| Notifications | Own notifications for all workspace roles | System generated | Mark own notification read | — | — | — |
| Analytics | All workspace roles | — | — | — | — | — |
| Exports | All workspace roles | All workspace roles (generate/download CSV) | — | — | — | — |

Team manager assignment, team membership, task and subtask assignment, and comment mentions are limited to users who belong to the same workspace. Project owner assignment is also checked against workspace membership. Cross-workspace resource IDs return not found; invalid numeric IDs return HTTP 400.

## Route coverage notes

- Workspace member removal is performed through `DELETE /api/organizations/:organizationId/members/:userId`; the member is removed from that organization's workspaces and their existing tokens are revoked.
- Task comments have list and create routes, but no edit or delete route. An unsupported comment deletion request returns 404.
- Attachment deletion is permitted for the uploader or manager and higher. Other employees cannot delete another member's attachment.
- Notifications and preferences are scoped to the current user as well as the workspace.
- Organization analytics are scoped to workspaces belonging to the authorized organization. Workspace, project, team, CSV export, activity, time, attachment, and task queries are scoped to the authorized workspace.
