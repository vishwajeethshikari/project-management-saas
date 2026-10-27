

-- Seed Data for Project Management SaaS

INSERT INTO users (full_name, email, password_hash) VALUES
('Surabhi Yadav', 'surabhi@example.com', 'hashed_pass_1'),
('Vishwajeet Shikari', 'vishwajeet@example.com', 'hashed_pass_2');

INSERT INTO workspaces (name, owner_id) VALUES
('Tech Team Workspace', 1);

INSERT INTO workspace_members (workspace_id, user_id, role) VALUES
(1, 1, 'admin'),
(1, 2, 'developer');

INSERT INTO projects (workspace_id, name, description) VALUES
(1, 'SaaS Core Platform', 'Main development project for SaaS tool');

INSERT INTO tasks (project_id, title, status, assigned_to) VALUES
(1, 'Set up PostgreSQL schema', 'completed', 1),
(1, 'Configure database pool connection', 'in_progress', 1);