# ProjectFlow live browser verification

Date: 17 November 2026  
Environment: local development backend, Vite frontend, seeded PostgreSQL demo workspace, Chromium via Playwright.

## Result summary

The live app accepted the demo Owner/Admin login and served database-backed project, task, team, comment, notification, and time-tracking data. Admin task editing, status changes, Kanban drag-and-drop, and status persistence after a browser refresh all succeeded. The frontend was stopped and restarted; logging in again showed the same seeded records.

One dashboard display difference remains: the dashboard visibly shows **3 total projects** and **9 active tasks**. Its dashboard API reports **15 total tasks**, including 6 completed tasks. The workspace task list visibly contains all 15 tasks, and Reports displays its database-backed task total. The dashboard does not label or display the total of 15 as a separate metric.

## Checks performed

| Check | Observed result |
|---|---|
| Admin login | Passed with `demo.admin@projectflow.local` |
| Dashboard totals | UI: 3 projects, 9 active tasks, 40% completion. API: 3 projects, 15 tasks, 6 completed, 4 TODO, 2 IN_PROGRESS, 3 IN_REVIEW |
| Project list | 3 seeded projects visible: Website Refresh, Mobile App Launch, Customer Insights Dashboard |
| Task list | 15 seeded task rows visible |
| App navigation | All 14 sidebar pages opened; project detail, task detail, and team detail also opened |
| Project creation | Admin UI create returned HTTP 201 |
| Task creation and editing | Admin UI create returned HTTP 201; title edit returned HTTP 200 |
| Status change | Task detail status control returned HTTP 200 |
| Kanban drag-and-drop | Dragged task into IN_REVIEW; API returned HTTP 200 |
| Kanban persistence | After page refresh the task remained in IN_REVIEW, confirmed in the database-backed task API and UI |
| Team and members | Product Delivery team showed its manager and 2 employees; workspace member page showed all 4 accounts |
| Comments | Seeded task comment rendered in task detail |
| Notifications | Admin inbox displayed 1 notification addressed to the Admin account |
| Time entries | A seeded time entry rendered for Audit current pages |
| Manager permissions | Manager login succeeded; project/task controls were enabled; Manager project creation returned HTTP 201 |
| Employee permissions | Employee login succeeded; project creation was disabled, task creation was unavailable, and API project/task creation plus status update on an unassigned task each returned HTTP 403 |
| Responsive layout | At 1440, 1024, 768, 390, and 360 px widths, the dashboard had no horizontal overflow |
| Browser issues | No page errors or failed network requests. One expected 401 from the initial unauthenticated `GET /api/auth/me` was logged before sign-in |
| Frontend restart | Vite restarted at port 5173; Admin signed in again and saw 3 projects and 15 task rows |

## Data safety and cleanup

The existing three demo projects, 15 seeded tasks, four members, and seed accounts were preserved. The browser checks created one temporary project and task plus a temporary Manager project to exercise creation and permissions. Those exact test records were removed afterward, along with their test-generated activity log entries. Final local counts were 3 projects, 15 tasks, 4 workspace members, 4 comments, and 5 time entries. No `Browser Check` projects or tasks remained.

## Local run URLs

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:5000/api`
- Backend health: `http://localhost:5000/api/health`
- Database readiness: `http://localhost:5000/api/ready`

## Not verified

- The dashboard itself does not visibly show the total task count of 15; only the API and workspace task list show that total. The visible dashboard task metric is 9 active tasks.
- Employee permissions were exercised with Employee 1; Employee 2 was not separately logged in during this browser run.
- Browser layout overflow was measured at the five viewport widths above on the dashboard. Other pages were navigated at desktop size but were not individually measured at every mobile width.
