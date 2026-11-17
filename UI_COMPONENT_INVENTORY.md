# UI Component Inventory

The existing React experience is a single authenticated workspace application in `frontend/src/App.jsx`, styled by `frontend/src/App.css`.

| Area | Current components and capabilities |
| --- | --- |
| Authentication | Sign in, registration, forgot/reset password, request feedback, password visibility |
| Application shell | Organization/workspace selectors, responsive/collapsible sidebar, breadcrumb, search/command entry, theme switcher, inbox, profile and sign out |
| Workspace overview | API-backed project/task/completion metrics and recent activity |
| My Work | Assigned-work counts for overdue, due today, completed; quick status changes |
| Projects | Project selector/list, create, rename/delete by role, task-derived health indicator |
| Tasks | Task creation, list/status updates, board, calendar, timeline, comments, attachments and time tracking |
| Teams and members | Team selection and membership management; workspace and organization member/invitation controls |
| Reports | Organization/project analytics, team productivity, workload and CSV export where available |
| Notifications | Polled notification feed, read state and preference controls |
| Shared patterns | Semantic labels, status/priority styling, confirmation flows, error/success notices, empty states |

The project intentionally reuses this existing application structure and API layer. There is no separate router or standalone screen component per sidebar item yet; several views are controls or panels within the workspace page.
