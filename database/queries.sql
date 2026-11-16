-- Queries for the canonical schema in migrations/001, 002, and 003.

-- 1. Projects and task counts in a workspace.
SELECT p.id, p.name, p.description, COUNT(t.id)::int AS task_count
FROM projects p
LEFT JOIN tasks t ON t.project_id = p.id
WHERE p.workspace_id = 1
GROUP BY p.id
ORDER BY p.created_at DESC;

-- 2. Tasks with project and assignee details.
SELECT t.id, t.title, t.status, t.priority, p.name AS project_name,
       u.name AS assignee_name, u.email AS assignee_email
FROM tasks t
JOIN projects p ON p.id = t.project_id
LEFT JOIN users u ON u.id = t.assignee_id
WHERE t.project_id = 1
ORDER BY t.created_at DESC;

-- 3. Task counts by status for a workspace.
SELECT status, COUNT(*)::int AS task_count
FROM tasks
WHERE workspace_id = 1
GROUP BY status;

-- 4. Task comments with author details.
SELECT c.id, c.body, c.created_at, u.name AS author_name
FROM task_comments c
JOIN users u ON u.id = c.user_id
WHERE c.task_id = 1
ORDER BY c.created_at;

-- 5. Unread notifications for a workspace member.
SELECT id, type, message, created_at
FROM notifications
WHERE workspace_id = 1 AND user_id = 1 AND is_read = FALSE
ORDER BY created_at DESC;
