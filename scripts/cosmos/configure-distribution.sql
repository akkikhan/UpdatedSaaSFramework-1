-- Create required extensions (idempotent)
CREATE EXTENSION IF NOT EXISTS citus;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Distribute tenant-scoped tables across shards using tenant identifiers
DO $$
DECLARE
  table_name text;
  partition_key text;
BEGIN
  FOR table_name, partition_key IN SELECT * FROM (
    VALUES
      ('tenants', 'id'),
      ('users', 'tenant_id'),
      ('sessions', 'tenant_id'),
      ('roles', 'tenant_id'),
      ('user_roles', 'tenant_id'),
      ('permissions', 'tenant_id'),
      ('tenant_users', 'tenant_id'),
      ('tenant_roles', 'tenant_id'),
      ('tenant_user_roles', 'tenant_id'),
      ('tenant_notifications', 'tenant_id'),
      ('email_logs', 'tenant_id'),
      ('system_logs', 'tenant_id'),
      ('compliance_audit_logs', 'tenant_id'),
      ('security_events', 'tenant_id')
  ) AS t(name, key)
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_dist_partition WHERE logicalrelid = table_name::regclass
    ) THEN
      PERFORM create_distributed_table(table_name, partition_key);
    END IF;
  END LOOP;
END $$;

-- Reference tables stay replicated across nodes for global lookups
DO $$
DECLARE
  table_name text;
BEGIN
  FOR table_name IN SELECT * FROM (
    VALUES
      ('platform_admins'),
      ('permission_templates'),
      ('business_types'),
      ('default_roles')
  ) AS ref(name)
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_dist_partition WHERE logicalrelid = table_name::regclass
    ) THEN
      PERFORM create_reference_table(table_name);
    END IF;
  END LOOP;
END $$;

-- Optional: set shard replication factor for HA (adjust as needed)
-- SELECT citus_set_shard_replication_factor(2);
