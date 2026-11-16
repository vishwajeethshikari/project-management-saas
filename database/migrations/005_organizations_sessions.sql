-- Introduce an organization parent without changing existing workspace data.
BEGIN;

CREATE TABLE IF NOT EXISTS organizations (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  owner_id BIGINT NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS organization_members (
  organization_id BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL DEFAULT 'employee'
    CHECK (role IN ('owner','admin','manager','employee','viewer')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (organization_id,user_id)
);
CREATE INDEX IF NOT EXISTS idx_organization_members_user ON organization_members(user_id,organization_id);

CREATE TABLE IF NOT EXISTS organization_invitations (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  organization_id BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email VARCHAR(254) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'employee'
    CHECK (role IN ('admin','manager','employee','viewer')),
  invited_by BIGINT NOT NULL REFERENCES users(id),
  token_hash VARCHAR(64) NOT NULL UNIQUE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','accepted','revoked','expired')),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id,email,status)
);

ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS organization_id BIGINT;

-- Legacy workspaces become one-organization tenants, preserving every existing membership.
INSERT INTO organizations(id,name,owner_id) OVERRIDING SYSTEM VALUE
  SELECT id,name,owner_id FROM workspaces
  ON CONFLICT(id) DO NOTHING;
UPDATE workspaces SET organization_id=id WHERE organization_id IS NULL;
SELECT setval(pg_get_serial_sequence('organizations','id'),
  GREATEST(COALESCE((SELECT MAX(id) FROM organizations),1),1),
  EXISTS (SELECT 1 FROM organizations));
ALTER TABLE workspaces ALTER COLUMN organization_id SET NOT NULL;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='workspaces_organization_fk') THEN
    ALTER TABLE workspaces ADD CONSTRAINT workspaces_organization_fk
      FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_workspaces_organization ON workspaces(organization_id,id);

INSERT INTO organization_members(organization_id,user_id,role)
  SELECT w.organization_id,wm.user_id,
    CASE wm.role WHEN 'member' THEN 'employee' ELSE wm.role END
  FROM workspaces w JOIN workspace_members wm ON wm.workspace_id=w.id
  ON CONFLICT(organization_id,user_id) DO NOTHING;
INSERT INTO organization_members(organization_id,user_id,role)
  SELECT id,owner_id,'owner' FROM organizations
  ON CONFLICT(organization_id,user_id) DO UPDATE SET role='owner';

ALTER TABLE users ADD COLUMN IF NOT EXISTS token_version INTEGER NOT NULL DEFAULT 0;

COMMIT;
