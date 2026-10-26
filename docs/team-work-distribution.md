# Team work distribution

Use this page as the editable team assignment register. The repository does
not identify confirmed member-to-feature assignments, so no names or
responsibilities are prefilled. The team lead should replace the placeholders
and update the status as work is agreed and completed.

## Team roster and responsibilities

| Member name | Assigned area/responsibility | Branch | Status / notes |
|---|---|---|---|
| [Add member name] | [Add agreed responsibilities] | [Add branch] | [Add status or notes] |
| [Add member name] | [Add agreed responsibilities] | [Add branch] | [Add status or notes] |
| [Add member name] | [Add agreed responsibilities] | [Add branch] | [Add status or notes] |
| [Add member name] | [Add agreed responsibilities] | [Add branch] | [Add status or notes] |

Add or remove rows to match the actual team. Do not mark work complete until
the team verifies it in the integrated branch.

## Candidate work areas

These areas reflect the checked-out code and the planned scope described by
the repository; they are not assignments:

| Area | Current evidence/status | Owner |
|---|---|---|
| Backend framework and branch reconciliation | **Decision required:** Express authentication is on the current branch; Spring Boot project CRUD is on `main`. | [Assign after team decision] |
| Frontend dashboard and API integration | The current checkout contains a Vite starter page. Dashboard UI work is on `origin/keerthi-dashboard`; integration status requires team review. | [Unassigned] |
| Authentication and account lifecycle | Registration, login, current-user lookup, PostgreSQL user migration, and backend tests are present in the current branch. Further authorization work is not evidenced. | [Assign/confirm] |
| Project APIs and persistence | Project CRUD exists in the Spring Boot `main` branch, not in the current Express implementation. Porting or retaining it depends on the framework decision. | [Assign after team decision] |
| Teams, memberships, tasks, comments, activity, notifications | Planned; not implemented in the current checkout. | [Assign when prioritized] |
| Integration, review, and documentation | Coordinate branch integration and keep this documentation accurate as decisions are made. | [Assign/confirm] |

For exact implemented API and schema details, see
[API contracts](api-contracts.md) and [Database schema](database-schema.md).
For branch and merge practices, see [Git workflow](git-workflow.md).
