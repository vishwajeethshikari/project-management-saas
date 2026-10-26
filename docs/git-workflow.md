# Git workflow

## What the repository shows

The repository has a `main` branch and feature/workstream branches. Observed
refs at documentation time include:

- `main`: Spring Boot project implementation.
- `origin/keerthi-dashboard`: dashboard frontend work.
- `vishwajeeth-user-auth-security` (current checkout and matching remote
  branch): Express authentication work.

GitHub shows two feature branches integrated into `main` through merged pull
requests: `feature/projects-ui` and `feature/create-project` (both merged on
October 25, 2026). Those pull requests contained two and four commits,
respectively. The visible commit history also includes `feat:` and `chore:`
prefixes and descriptive plain-language subjects. No pull-request review
submissions were returned for those two PRs, so review requirements or
approvals cannot be confirmed from that evidence.

The branch and pull-request evidence supports feature-branch work followed by
pull-request integration into `main`. It does not prove a required daily
commit cadence, branch protection, or mandatory approval/test gates.

## Suggested day-to-day branch cycle

Use this as the shared working procedure unless the team confirms a different
policy:

1. Start a scoped work branch from the latest agreed integration branch.
   Keep work on that branch; avoid committing unfinished feature work directly
   to `main`.
2. During each workday, commit completed, reviewable slices rather than
   accumulating a large unreviewed change. Use descriptive commit subjects;
   the visible history includes `feat:` and `chore:` prefixes, but no mandatory
   commit format is documented. A daily-commit requirement needs team
   confirmation; the observed PR commit counts do not establish one.
3. Push the branch regularly so the work is visible to teammates. Before
   requesting integration, synchronize with the agreed integration branch and
   resolve conflicts on the feature branch.
4. Request teammate review before merging. The reviewer should check behavior,
   tests, configuration/secrets, and relevant documentation. Record and resolve
   review feedback before integration. A mandatory approval count is not
   evidenced in the inspected PR history.
5. Open a pull request into the agreed integration branch; merged PRs into
   `main` are the observed integration mechanism. After integration, verify
   the combined application and update branch-specific status documentation.
   Do not describe a feature as integrated merely because its feature branch
   exists.

The daily cadence, branch naming convention, review count/approval, and test
gate above are recommendations to confirm—not verified repository policies.
Feature branches and pull-request merges into `main` are evidenced; review
approval and required checks are not.

## Current integration blocker

The backend diverges across branches: this checkout uses Express and includes
authentication; `main` uses Spring Boot and includes project CRUD. The
dashboard work is on a separate branch. These are not yet documented as one
integrated stack. Before merging backend work, the team must confirm which
framework is canonical and choose whether to migrate the project CRUD,
authentication, or both. See [Architecture](architecture.md),
[API contracts](api-contracts.md), and
[Team work distribution](team-work-distribution.md).
