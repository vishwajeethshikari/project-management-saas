-- Useful Database Queries for Backend API Integration

-- 1. Get All Projects in a Specific Workspace
SELECT 
    p.project_id, 
    p.name AS project_name, 
    p.description, 
    COUNT(t.task_id) AS total_tasks
FROM projects p
LEFT JOIN tasks t ON p.project_id = t.project_id
WHERE p.workspace_id = 1
GROUP BY p.project_id;

-- 2. Fetch Tasks for a Project with Assigned User Info
SELECT 
    t.task_id, 
    t.title, 
    t.status, 
    u.full_name AS assigned_user, 
    u.email AS assigned_email
FROM tasks t
LEFT JOIN users u ON t.assigned_to = u.user_id
WHERE t.project_id = 1
ORDER BY t.created_at DESC;

-- 3. Calculate Task Status Counts for Project Dashboard Metrics
SELECT 
    status, 
    COUNT(*) AS task_count
FROM tasks
WHERE project_id = 1
GROUP BY status;

-- 4. Get Task Comments with Author Details
SELECT 
    c.comment_id, 
    c.comment_text, 
    c.created_at, 
    u.full_name AS author_name
FROM task_comments c
JOIN users u ON c.user_id = u.user_id
WHERE c.task_id = 1
ORDER BY c.created_at ASC;

-- 5. Fetch Unread Notifications for a User
SELECT 
    notification_id, 
    message, 
    created_at
FROM notifications
WHERE user_id = 1 AND is_read = FALSE
ORDER BY created_at DESC;