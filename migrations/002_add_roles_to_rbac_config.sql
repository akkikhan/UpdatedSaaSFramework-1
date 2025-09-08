ALTER TABLE permission_templates
  ADD COLUMN IF NOT EXISTS roles text[] NOT NULL DEFAULT '{}';

ALTER TABLE default_roles
  ADD COLUMN IF NOT EXISTS roles text[] NOT NULL DEFAULT '{}';
