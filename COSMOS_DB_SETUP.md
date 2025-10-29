# Azure Cosmos DB for PostgreSQL - Setup Guide

**Last Updated**: October 29, 2025  
**Status**: 🟢 Production Ready with Citus Sharding

---

## 📋 Overview

This guide covers migrating your SaaS platform from pg-mem (in-memory) to
**Azure Cosmos DB for PostgreSQL** with Citus extension for distributed
multi-tenant data management.

### Why Cosmos DB for PostgreSQL?

✅ **Fully Compatible** - PostgreSQL wire protocol, existing Drizzle queries
work as-is  
✅ **Multi-Tenant Sharding** - Citus distributes data by `tenant_id` for
isolation & scale  
✅ **No Code Rewrite** - Uses standard PostgreSQL (not NoSQL/Mongo API)  
✅ **Managed Service** - Auto-scaling, HA, backups, security built-in  
✅ **Global Distribution** - Optional geo-replication for low-latency worldwide
access

---

## 🎯 Compatibility Assessment

### ✅ Fully Supported Features

Your codebase uses **standard PostgreSQL features** that Cosmos DB for
PostgreSQL fully supports:

| Feature             | Usage in Codebase                  | Cosmos DB Support         |
| ------------------- | ---------------------------------- | ------------------------- |
| **UUID Generation** | `gen_random_uuid()` via pgcrypto   | ✅ Enabled by default     |
| **JSONB Columns**   | `enabledModules`, `moduleConfigs`  | ✅ Full support           |
| **UUID Arrays**     | `ARRAY[]` types                    | ✅ Full support           |
| **DO Blocks**       | Migration scripts                  | ✅ Full support           |
| **Foreign Keys**    | All tenant relationships           | ✅ Full support           |
| **Drizzle ORM**     | All queries in `server/storage.ts` | ✅ Works perfectly        |
| **pg Driver**       | Node.js PostgreSQL client          | ✅ Standard wire protocol |

**Files Analyzed:**

- ✅ `shared/schema.ts` (lines 68-287) - All schema definitions compatible
- ✅ `migrations/000_enable_pgcrypto.sql` - Extension enabled
- ✅ `migrations/002_normalize_admin_emails.sql` (line 15) - DO blocks supported
- ✅ `server/storage.ts` - All Drizzle queries compatible

### ❌ Avoid These Cosmos DB APIs

**DO NOT USE:**

- ❌ Cosmos DB NoSQL API (requires full rewrite)
- ❌ Cosmos DB MongoDB API (different query language)
- ❌ Cosmos DB Table API (key-value only)

**✅ USE ONLY:**

- ✅ **Cosmos DB for PostgreSQL** (wire protocol compatible)

---

## 🏗️ Architecture Overview

### Current State (pg-mem)

```
┌─────────────────┐
│   Application   │
│   (Express)     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│    pg-mem       │
│  (In-Memory)    │
│   No Sharding   │
└─────────────────┘
```

### After Cosmos DB Migration

```
┌─────────────────────────────────────┐
│         Application (Express)        │
└────────────────┬────────────────────┘
                 │
                 ▼
┌────────────────────────────────────┐
│  Cosmos DB for PostgreSQL Cluster  │
├────────────────────────────────────┤
│         Coordinator Node           │
│      (Query Router + Planner)      │
└────────┬───────────┬───────────────┘
         │           │
    ┌────▼─────┐ ┌──▼──────┐
    │ Worker 1 │ │ Worker 2│ ... Worker N
    │ (Shards) │ │ (Shards)│
    └──────────┘ └─────────┘
```

### Multi-Tenant Data Distribution

**Distributed Tables** (sharded by `tenant_id`):

- `users`, `sessions`, `roles`, `user_roles`, `permissions`
- `tenant_users`, `tenant_roles`, `tenant_user_roles`
- `tenant_notifications`, `email_logs`
- `system_logs`, `compliance_audit_logs`, `security_events`

**Reference Tables** (replicated to all nodes):

- `platform_admins` - Global admin access
- `permission_templates` - Shared RBAC templates
- `business_types` - Lookup data

**Distribution Key: `tenants.id`**

- All tenant data co-located on same shard
- Queries filtered by `tenant_id` stay within single worker (fast!)
- Cross-tenant queries scatter/gather (monitor these!)

---

## 🚀 Migration Plan

### Phase 1: Provision Cosmos DB Cluster

#### Option A: Using Bicep (Recommended)

```bash
cd infra/cosmos

az deployment group create \
  --resource-group saas-framework-rg \
  --template-file main.bicep \
  --parameters \
    namePrefix=saas \
    adminLogin=cosadmin \
    adminPassword='<SecurePassword123!>' \
    nodeCount=3 \
    coordinatorSku=Standard_D8s_v5 \
    workerSku=Standard_D4s_v5
```

**SKU Recommendations:**

- **Coordinator**: `Standard_D8s_v5` (8 vCPU, 32GB RAM) for query routing
- **Workers**: `Standard_D4s_v5` (4 vCPU, 16GB RAM) × 3 nodes
- **Storage**: Start with 128GB per node, auto-scales to 2TB

#### Option B: Azure Portal

1. Navigate to **Azure Portal** → Create Resource
2. Search "Cosmos DB for PostgreSQL"
3. Configure:
   - Cluster name: `saas-cosmos-cluster`
   - Node count: 3 (HA enabled)
   - Coordinator: 8 vCPU / 32GB RAM
   - Workers: 4 vCPU / 16GB RAM each
   - PostgreSQL version: 14+
4. Enable **Zone Redundancy** for HA
5. Configure firewall rules (add your IP)

### Phase 2: Create Database & Application User

After cluster provisions, connect via Azure Cloud Shell or local psql:

```sql
-- Connect to default 'citus' database first
psql "postgresql://cosadmin@cluster:<password>@cluster.postgres.cosmos.azure.com:5432/citus?sslmode=require"

-- Create application database
CREATE DATABASE saas_platform;

-- Connect to new database
\c saas_platform

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS citus;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create least-privilege application user
CREATE USER saas_app WITH PASSWORD '<SecureAppPassword>';

-- Grant minimal necessary permissions
GRANT CONNECT ON DATABASE saas_platform TO saas_app;
GRANT USAGE ON SCHEMA public TO saas_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO saas_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO saas_app;

-- Grant default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO saas_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO saas_app;
```

### Phase 3: Build Connection String

**Format Requirements:**

```
postgresql://<user>%40<cluster>:<password>@<cluster>.postgres.cosmos.azure.com:5432/<database>?sslmode=require&options=--cluster%3D<cluster>
```

**Key Components:**

1. **User encoding**: `saas_app@cluster` → `saas_app%40cluster`
2. **SSL mode**: `sslmode=require` (mandatory)
3. **Cluster flag**: `options=--cluster%3Dcluster` (URL-encoded
   `--cluster=cluster`)

**Example:**

```env
# Cosmos DB for PostgreSQL connection
DATABASE_URL=postgresql://saas_app%40saas-cosmos:SecurePass123@saas-cosmos.postgres.cosmos.azure.com:5432/saas_platform?sslmode=require&options=--cluster%3Dsaas-cosmos
```

**Connection String Builder:**

```powershell
$cluster = "saas-cosmos"
$user = "saas_app"
$password = "SecurePass123"
$database = "saas_platform"

$connectionString = "postgresql://${user}%40${cluster}:${password}@${cluster}.postgres.cosmos.azure.com:5432/${database}?sslmode=require&options=--cluster%3D${cluster}"

Write-Host "DATABASE_URL=$connectionString"
```

### Phase 4: Store Connection String Securely

#### Option A: Azure Key Vault (Recommended for Production)

```bash
# Create Key Vault
az keyvault create \
  --name saas-keyvault \
  --resource-group saas-framework-rg

# Store connection string
az keyvault secret set \
  --vault-name saas-keyvault \
  --name cosmos-db-connection \
  --value "<your-connection-string>"

# Grant App Service managed identity access
az keyvault set-policy \
  --name saas-keyvault \
  --object-id <app-service-identity> \
  --secret-permissions get
```

#### Option B: Local .env (Development Only)

```env
DATABASE_URL=postgresql://saas_app%40cluster:password@cluster.postgres.cosmos.azure.com:5432/saas_platform?sslmode=require&options=--cluster%3Dcluster
COSMOS_DB=true
NODE_ENV=production

# Remove development bypasses
# BYPASS_ADMIN_AUTH=true  # REMOVED
# ALLOW_IN_MEMORY_DB=true # REMOVED
```

### Phase 5: Run Setup Script

**Automated Setup (Recommended):**

```powershell
.\setup-with-cosmos.ps1 -ConnectionString "postgresql://..."
```

**What the script does:**

1. ✅ Validates prerequisites
2. ✅ Backs up current configuration
3. ✅ Updates `.env` with Cosmos connection string
4. ✅ Removes development bypass flags
5. ✅ Switches to production database module
6. ✅ Stops existing development server
7. ✅ Runs Drizzle migrations (`npm run db:push`)
8. ✅ Configures Citus distribution (sharding setup)
9. ✅ Creates platform admin account
10. ✅ Validates connection

**Manual Setup (if needed):**

```bash
# 1. Update .env
nano .env  # Add Cosmos connection string

# 2. Switch to production DB module
cp server/db.production.ts server/db.ts

# 3. Run migrations
npm run db:push

# 4. Configure Citus sharding
psql "$DATABASE_URL" -f scripts/cosmos/configure-distribution.sql

# 5. Create platform admin
npm run setup:platform-admin

# 6. Start server
npm run dev
```

### Phase 6: Verify Citus Distribution

After setup, verify sharding configuration:

```sql
-- Check distributed tables
SELECT logicalrelid::text as table_name,
       colocationid,
       partmethod,
       partkey
FROM pg_dist_partition;

-- Expected output:
--   table_name   | colocationid | partmethod | partkey
-- ---------------+--------------+------------+---------
--  users         |            1 | h          | tenant_id
--  sessions      |            1 | h          | tenant_id
--  roles         |            1 | h          | tenant_id
--  ...

-- Check reference tables (replicated)
SELECT logicalrelid::text as table_name
FROM pg_dist_partition
WHERE partmethod = 'n';

-- Expected output:
--   table_name
-- ------------------
--  platform_admins
--  permission_templates
--  ...

-- Check shard distribution across workers
SELECT nodename, nodeport, COUNT(*) as shard_count
FROM pg_dist_shard_placement
GROUP BY nodename, nodeport;
```

---

## 🔧 Configuration Deep Dive

### Connection Pool Settings

**`server/db.production.ts` (lines 54-65):**

```typescript
const connectionConfig = {
  connectionString: DATABASE_URL,
  ssl: {
    rejectUnauthorized: false, // Cosmos uses self-signed certs
  },
  // Connection pooling for Cosmos
  max: 20, // Max connections (adjust based on coordinator capacity)
  min: 5, // Maintain 5 warm connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
  statement_timeout: 30000, // 30s query timeout
};
```

**Cosmos DB Connection Limits:**

- Coordinator node: Up to **300 connections** total
- Recommended per-app: **20-50 connections** max
- Consider **PgBouncer** if running multiple app instances

### Citus Distribution Configuration

**`scripts/cosmos/configure-distribution.sql` (lines 1-56):**

**Key Functions:**

- `create_distributed_table(table_name, partition_column)` - Shards table across
  workers
- `create_reference_table(table_name)` - Replicates table to all workers
- `citus_set_shard_replication_factor(n)` - Sets shard replica count (default 1)

**Adding New Tables:**

```sql
-- For tenant-scoped tables
SELECT create_distributed_table('new_tenant_table', 'tenant_id');

-- For global lookup tables
SELECT create_reference_table('global_config_table');
```

**Important:**

- Run `configure-distribution.sql` **after every schema migration** that adds
  tables
- Existing data can be distributed post-creation (Citus handles migration)

---

## ⚠️ Risks & Mitigations

### 1. Cross-Shard Queries (Scatter/Gather)

**Risk**: Queries without `tenant_id` filter hit all shards (slow!)

**Example Bad Query:**

```typescript
// ❌ BAD - Hits all shards
const allUsers = await db.select().from(users);

// ✅ GOOD - Single shard query
const tenantUsers = await db
  .select()
  .from(users)
  .where(eq(users.tenantId, tenantId));
```

**Mitigation:**

- **Code Review**: Audit `server/storage.ts` for missing `tenantId` filters
- **Monitoring**: Check `citus_stat_statements` for high execution times
- **Indexes**: Add composite indexes on `(tenant_id, <other_columns>)`

### 2. Extension Drift

**Risk**: New migrations add unsupported extensions

**Mitigation:**

```sql
-- Always use IF NOT EXISTS
CREATE EXTENSION IF NOT EXISTS <extension_name>;

-- Check supported extensions
SELECT * FROM pg_available_extensions WHERE name LIKE '%citus%';
```

**Cosmos DB Supported Extensions:**

- ✅ `citus` (distributed queries)
- ✅ `pgcrypto` (UUID generation)
- ✅ `uuid-ossp` (UUID functions)
- ✅ `pg_stat_statements` (query monitoring)
- ✅ `hstore` (key-value pairs)
- ✅ `btree_gin`, `btree_gist` (indexing)

**Verify Before Adding:**

```sql
SELECT * FROM pg_available_extensions WHERE name = '<extension_name>';
```

### 3. Connection Pool Pressure

**Risk**: Coordinator node connection exhaustion

**Symptoms:**

- "Too many connections" errors
- High coordinator CPU usage
- Slow query response times

**Mitigation:**

- **PgBouncer**: Deploy connection pooler for multiple app instances
- **Pool Tuning**: Adjust `max` connections based on load testing
- **Monitoring**: Use `pg_stat_activity` to track active connections

```sql
-- Check current connections
SELECT datname, count(*)
FROM pg_stat_activity
GROUP BY datname;

-- Kill idle connections (if needed)
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE state = 'idle'
  AND state_change < NOW() - INTERVAL '5 minutes';
```

### 4. Tooling Parity with Neon

**Risk**: Setup scripts assume Neon-style connection strings

**Mitigation:**

- Use `setup-with-cosmos.ps1` (Cosmos-specific)
- **NOT** `setup-with-neon.ps1` (incompatible)

**Key Differences:** | Feature | Neon | Cosmos DB |
|---------|------|-----------| | Connection Format | Standard PostgreSQL |
Requires `options=--cluster=` | | User Encoding | Standard | Requires
`user%40cluster` | | SSL Mode | Optional | Mandatory (`sslmode=require`) | |
Extensions | Auto-enabled | Explicit `CREATE EXTENSION` |

### 5. Testing Coverage

**Risk**: No integration tests for distributed queries

**Mitigation:** Create integration test suite:

```typescript
// tests/cosmos-integration.test.ts
import { db } from "../server/db";
import { tenants, users, sessions } from "../shared/schema";

describe("Cosmos DB Integration", () => {
  it("should create tenant and co-locate data", async () => {
    // Create tenant
    const tenant = await db
      .insert(tenants)
      .values({
        orgId: "test-org",
        name: "Test Org",
        adminEmail: "admin@test.com",
      })
      .returning();

    // Create user (should be on same shard)
    const user = await db
      .insert(users)
      .values({
        tenantId: tenant[0].id,
        email: "user@test.com",
        passwordHash: "hash",
      })
      .returning();

    // Verify single-shard query
    const tenantUsers = await db
      .select()
      .from(users)
      .where(eq(users.tenantId, tenant[0].id));

    expect(tenantUsers.length).toBe(1);
    expect(tenantUsers[0].id).toBe(user[0].id);
  });

  it("should verify Citus distribution", async () => {
    // Check users table is distributed
    const result = await db.execute(sql`
      SELECT * FROM pg_dist_partition 
      WHERE logicalrelid = 'users'::regclass
    `);

    expect(result.rows.length).toBeGreaterThan(0);
    expect(result.rows[0].partmethod).toBe("h"); // Hash distribution
  });
});
```

**Run Tests:**

```bash
npm test -- cosmos-integration.test.ts
```

---

## 📊 Monitoring & Performance

### Query Performance Dashboard

**1. Citus Query Stats:**

```sql
-- Top 10 slowest queries
SELECT query, calls, mean_exec_time, max_exec_time
FROM citus_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Queries hitting multiple shards (scatter/gather)
SELECT query, calls
FROM citus_stat_statements
WHERE partition_key IS NULL
ORDER BY calls DESC;
```

**2. Connection Pool Health:**

```sql
-- Active connections
SELECT count(*), state
FROM pg_stat_activity
GROUP BY state;

-- Long-running queries
SELECT pid, now() - query_start as duration, query
FROM pg_stat_activity
WHERE state != 'idle'
  AND now() - query_start > interval '30 seconds';
```

**3. Shard Distribution:**

```sql
-- Shard balance across workers
SELECT nodename, nodeport,
       COUNT(*) as shard_count,
       SUM(size) / (1024*1024) as total_mb
FROM citus_shards
GROUP BY nodename, nodeport
ORDER BY shard_count DESC;
```

### Azure Monitor Integration

**Metrics to Track:**

- CPU utilization (coordinator & workers)
- Memory usage
- Storage usage per node
- Connection count
- Query latency (p50, p95, p99)
- Replication lag (if using HA)

**Alert Thresholds:**

- CPU > 80% for 5 minutes
- Memory > 90%
- Connection count > 250
- Query latency p95 > 1 second

---

## 🐛 Troubleshooting

### Issue: "relation does not exist"

**Cause**: Migrations not run or Citus distribution not configured

**Fix:**

```bash
# Run migrations
npm run db:push

# Configure distribution
psql "$DATABASE_URL" -f scripts/cosmos/configure-distribution.sql
```

### Issue: "connection refused" or "ECONNREFUSED"

**Cause**: Firewall rules not configured

**Fix:**

```bash
# Get your public IP
curl ifconfig.me

# Add firewall rule
az postgres flexible-server firewall-rule create \
  --resource-group saas-framework-rg \
  --name saas-cosmos \
  --rule-name AllowMyIP \
  --start-ip-address <your-ip> \
  --end-ip-address <your-ip>
```

### Issue: "SSL connection required"

**Cause**: Missing `sslmode=require` in connection string

**Fix:**

```env
# Add to connection string
DATABASE_URL=postgresql://...?sslmode=require&options=--cluster%3Dcluster
```

### Issue: "function gen_random_uuid() does not exist"

**Cause**: `pgcrypto` extension not enabled

**Fix:**

```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;
```

### Issue: Slow queries on tenant-scoped data

**Cause**: Missing `tenant_id` filter causing scatter/gather

**Fix:**

```typescript
// Always include tenant filter
const data = await db.select().from(table).where(eq(table.tenantId, tenantId)); // ✅ Single-shard query
```

### Issue: "Too many connections"

**Cause**: Connection pool exhausted

**Fix:**

```typescript
// Reduce pool size in server/db.production.ts
max: 10,  // Was 20, reduce if needed

// OR deploy PgBouncer
```

---

## 📚 Additional Resources

### Official Documentation

- [Cosmos DB for PostgreSQL Docs](https://learn.microsoft.com/azure/cosmos-db/postgresql/)
- [Citus Multi-Tenant Tutorial](https://docs.citusdata.com/en/stable/sharding/multi_tenant.html)
- [Citus Performance Tuning](https://docs.citusdata.com/en/stable/performance/performance_tuning.html)

### Codebase References

- Distribution setup: `scripts/cosmos/configure-distribution.sql`
- Bicep template: `infra/cosmos/main.bicep`
- Schema definition: `shared/schema.ts` (lines 68-287)
- Migrations: `migrations/*.sql`
- Connection config: `server/db.production.ts`

### Pricing Estimator

- [Azure Cosmos DB Pricing](https://azure.microsoft.com/pricing/details/cosmos-db/)
- Estimate: ~$300-500/month for 3-node cluster (D4s workers)

---

## ✅ Success Checklist

After running `setup-with-cosmos.ps1`, verify:

- [ ] Cosmos DB cluster provisioned with 2+ worker nodes
- [ ] Extensions enabled: `citus`, `pgcrypto`, `uuid-ossp`
- [ ] Application database created (`saas_platform`)
- [ ] Least-privilege user created (`saas_app`)
- [ ] Connection string includes `options=--cluster=<name>`
- [ ] `.env` updated with Cosmos connection string
- [ ] `BYPASS_ADMIN_AUTH` removed from `.env`
- [ ] Drizzle migrations applied (`npm run db:push`)
- [ ] Citus distribution configured (`configure-distribution.sql`)
- [ ] Platform admin account created
- [ ] Server starts without errors
- [ ] Azure AD login works (no bypass flags)
- [ ] Tenant creation works
- [ ] Verify distributed tables: `SELECT * FROM pg_dist_partition`
- [ ] Check shard balance: `SELECT * FROM citus_shards`
- [ ] Monitor query performance: `SELECT * FROM citus_stat_statements`

---

## 🎉 Migration Complete!

Your SaaS platform is now running on **Azure Cosmos DB for PostgreSQL** with:

✅ Multi-tenant sharding via Citus  
✅ Production-grade database (no pg-mem)  
✅ Horizontal scalability across worker nodes  
✅ High availability with zone redundancy  
✅ Managed backups and security  
✅ Query monitoring and performance insights

**Next Steps:**

1. Monitor query performance via `citus_stat_statements`
2. Set up Azure Monitor alerts
3. Configure automated backups (7-day retention default)
4. Plan capacity scaling based on tenant growth
5. Review cross-shard queries and add indexes

---

_Generated: October 29, 2025_  
_Last Updated: After Cosmos DB for PostgreSQL assessment_
