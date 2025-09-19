-- 003_structured_rbac_permissions.sql
-- Restructure tenant role permissions into JSON objects and add inheritance support

ALTER TABLE tenant_roles
  ALTER COLUMN permissions DROP DEFAULT;

ALTER TABLE tenant_roles
  ALTER COLUMN permissions TYPE jsonb
  USING COALESCE(
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'resource', NULLIF(split_part(value, '.', 1), ''),
          'action', COALESCE(NULLIF(split_part(value, '.', 2), ''), '*'),
          'scope', 'tenant',
          'conditions', '[]'::jsonb
        )
      )
      FROM unnest(COALESCE(tenant_roles.permissions, '{}'::text[])) AS value
    ),
    '[]'::jsonb
  );

ALTER TABLE tenant_roles
  ALTER COLUMN permissions SET DEFAULT '[]'::jsonb;

ALTER TABLE tenant_roles
  ALTER COLUMN permissions SET NOT NULL;

ALTER TABLE tenant_roles
  ADD COLUMN IF NOT EXISTS inherits_from uuid[] DEFAULT '{}'::uuid[];

ALTER TABLE tenant_roles
  ALTER COLUMN inherits_from SET NOT NULL;

ALTER TABLE tenant_roles
  ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

ALTER TABLE tenant_roles
  ALTER COLUMN metadata SET NOT NULL;

