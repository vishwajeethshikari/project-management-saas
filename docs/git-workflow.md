# Git workflow

The integration work is being done on `feature/full-stack-integration`.
Keep changes on the current feature branch and integrate them through the
repository's normal review process. Do not treat other feature branches or
local review snapshots as part of this checkout's runtime.

Recommended workflow:

1. Keep changes scoped to the feature and preserve unrelated work already in
   the worktree.
2. Run focused backend and frontend checks before requesting review.
3. Review schema changes against the target database before applying them;
   use a dedicated test database for integration checks.
4. Update the API and database documentation when contracts or schema change.
5. Commit and merge only through the team's agreed process.

This page describes a recommended procedure, not branch-protection or
approval requirements.
