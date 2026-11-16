-- Restore the organization membership required by each legacy workspace membership.
INSERT INTO organization_members (organization_id, user_id, role)
SELECT w.organization_id, wm.user_id,
       CASE WHEN wm.role = 'member' THEN 'employee' ELSE wm.role END
FROM workspace_members wm
JOIN workspaces w ON w.id = wm.workspace_id
WHERE NOT EXISTS (
  SELECT 1
  FROM organization_members om
  WHERE om.organization_id = w.organization_id
    AND om.user_id = wm.user_id
);
