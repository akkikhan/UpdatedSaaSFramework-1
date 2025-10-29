# Database Migration Options - Quick Decision Guide

**Last Updated**: October 29, 2025  
**Choose Your Production Database** 🎯

---

## 🎯 Quick Decision Matrix

| Criteria                  | Neon ⭐                      | Cosmos DB for PostgreSQL 🚀 | Azure PostgreSQL ⏳   |
| ------------------------- | ---------------------------- | --------------------------- | --------------------- |
| **Setup Time**            | 5 minutes                    | 25 minutes                  | Blocked (quota limit) |
| **Cost**                  | Free tier → $20/month        | $300-500/month              | ~$12/month            |
| **Scale Strategy**        | Vertical (bigger instance)   | Horizontal (add workers)    | Vertical              |
| **Multi-Tenant Sharding** | ❌ No                        | ✅ Yes (Citus)              | ❌ No                 |
| **High Availability**     | ✅ Yes                       | ✅ Zone redundant           | ✅ Zone redundant     |
| **Best For**              | Dev/Test, Small-Medium scale | Production, 100+ tenants    | Single-tenant apps    |
| **Azure Integration**     | External                     | Native Azure service        | Native Azure service  |
| **Code Changes**          | None                         | None                        | None                  |
| **Free Tier**             | ✅ 10GB storage              | ❌ No free tier             | ❌ Blocked currently  |

---

## 📊 Detailed Comparison

### Option A: Neon PostgreSQL ⭐

**✅ Advantages:**

- **Fastest Setup**: 5 minutes from signup to production
- **No Credit Card**: Free tier available immediately
- **Serverless**: Auto-scales, pay only for usage
- **Developer-Friendly**: Branch databases, time travel, instant clones
- **Global CDN**: Data caching for low latency
- **Zero Code Changes**: Standard PostgreSQL wire protocol

**❌ Disadvantages:**

- **No Built-In Sharding**: Must scale vertically (bigger instance)
- **External to Azure**: Not integrated with Azure monitoring/security
- **Scale Limits**: Single-node architecture limits max throughput
- **Data Residency**: Limited region choices compared to Azure

**When to Choose Neon:**

- ✅ Need to get started immediately (today!)
- ✅ Budget under $100/month
- ✅ Under 100 tenants expected
- ✅ Development, staging, or testing environments
- ✅ Flexible about cloud provider
- ✅ Want serverless auto-scaling

**Pricing:**

- **Free**: 10GB storage, 100 compute hours/month
- **Pro**: $20/month + usage (512GB storage, unlimited compute)
- **Enterprise**: Custom pricing

**Connection String Example:**

```
postgresql://user:pass@ep-xyz-123.us-east-2.aws.neon.tech/dbname?sslmode=require
```

---

### Option B: Azure Cosmos DB for PostgreSQL 🚀

**✅ Advantages:**

- **Horizontal Scaling**: Add worker nodes to increase capacity
- **Multi-Tenant Sharding**: Citus distributes data by `tenant_id`
- **Built-In HA**: Zone-redundant coordinator + workers
- **Query Monitoring**: `citus_stat_statements` for performance insights
- **Co-Located Data**: Tenant data stays on same shard (fast queries)
- **Azure Native**: Integrated with Azure Monitor, Key Vault, RBAC
- **Zero Code Changes**: Standard PostgreSQL + Citus extension

**❌ Disadvantages:**

- **Higher Cost**: $300-500/month minimum (3-node cluster)
- **Setup Complexity**: Requires cluster provisioning (~15 min)
- **Learning Curve**: Must understand distributed queries
- **Connection String**: Requires special encoding (`user%40cluster`,
  `options=--cluster`)
- **No Free Tier**: Must pay from day one

**When to Choose Cosmos DB:**

- ✅ Production deployment with 100+ tenants
- ✅ Need horizontal scalability (add more nodes)
- ✅ High availability requirements (SLA 99.95%+)
- ✅ Want built-in multi-tenant sharding
- ✅ Budget allows $300-500/month
- ✅ Azure-native architecture preferred
- ✅ Long-term production workload

**Architecture:**

```
┌─────────────────────────────────────┐
│         Application                 │
└────────────────┬────────────────────┘
                 │
                 ▼
┌────────────────────────────────────┐
│  Cosmos DB for PostgreSQL Cluster  │
├────────────────────────────────────┤
│   Coordinator (Query Router)       │
└────────┬───────────┬───────────────┘
         │           │
    ┌────▼─────┐ ┌──▼──────┐
    │ Worker 1 │ │ Worker 2│ ... Worker N
    │ (Shards) │ │ (Shards)│
    └──────────┘ └─────────┘
```

**Sharding Strategy:**

- **Distribution Key**: `tenant_id` (all tables)
- **Distributed Tables**: `users`, `sessions`, `roles`, `logs`, etc.
- **Reference Tables**: `platform_admins`, `permission_templates` (replicated)
- **Query Optimization**: Filter by `tenant_id` = single-shard query (fast!)

**Pricing (Example 3-Node Cluster):**

- **Coordinator**: Standard_D8s_v5 (8 vCPU, 32GB) = ~$200/month
- **Workers (3x)**: Standard_D4s_v5 (4 vCPU, 16GB) = ~$100/month each
- **Storage**: 128GB/node included, $0.115/GB over
- **Total**: ~$500/month baseline

**Connection String Example:**

```
postgresql://app%40cluster:pass@cluster.postgres.cosmos.azure.com:5432/db?sslmode=require&options=--cluster%3Dcluster
```

---

### Option C: Azure PostgreSQL Flexible Server ⏳

**Status**: ❌ **Currently Blocked** - Azure Free Trial quota limitations

**When Available:**

- ✅ Native Azure service with full integration
- ✅ Flexible compute tiers (Burstable, General Purpose, Memory Optimized)
- ✅ Zone-redundant HA available
- ✅ Point-in-time restore (35 days retention)
- ✅ Vertical scaling only (no sharding)

**Current Blocker:**

```
Error: (LocationIsOfferRestricted) Subscriptions are restricted from
provisioning in location 'westus2'
```

**Resolution Options:**

1. Upgrade from Azure Free Trial to Pay-As-You-Go
2. Request quota increase: https://aka.ms/postgres-request-quota-increase
3. Try additional regions (canadacentral, uksouth, northeurope)

**Estimated Time**: Days to weeks for quota approval

**Pricing (When Available):**

- **Burstable**: Standard_B2s (2 vCPU, 4GB) = ~$12/month
- **General Purpose**: Standard_D4s_v3 (4 vCPU, 16GB) = ~$150/month

---

## 🚀 Setup Commands

### Neon Setup (5 minutes)

```powershell
# 1. Get connection string from https://neon.tech

# 2. Run setup
.\setup-with-neon.ps1 -ConnectionString "postgresql://user:pass@ep-xyz.neon.tech/db?sslmode=require"

# 3. Start server
npm run dev

# 4. Test at http://localhost:5000/admin/login
```

### Cosmos DB Setup (25 minutes)

```powershell
# 1. Provision cluster (via Bicep or Azure Portal)
cd infra/cosmos
az deployment group create \
  --resource-group saas-framework-rg \
  --template-file main.bicep \
  --parameters namePrefix=saas adminLogin=admin adminPassword='<pass>'

# 2. Create database and user
psql "postgresql://admin@cluster:<pass>@cluster.postgres.cosmos.azure.com:5432/citus?sslmode=require"
# Then run SQL from COSMOS_DB_SETUP.md

# 3. Build connection string (note encoding!)
$connectionString = "postgresql://app%40cluster:pass@cluster.postgres.cosmos.azure.com:5432/db?sslmode=require&options=--cluster%3Dcluster"

# 4. Run setup (includes Citus sharding)
.\setup-with-cosmos.ps1 -ConnectionString $connectionString

# 5. Start server
npm run dev

# 6. Verify distribution
psql "$connectionString" -c "SELECT * FROM pg_dist_partition;"
```

---

## 💡 Recommendations by Use Case

### Scenario 1: "I need to demo this to stakeholders next week"

**Recommendation**: **Neon** ⭐

- Setup in 5 minutes
- Free tier sufficient for demos
- Easy to migrate to Cosmos later if needed

### Scenario 2: "We're launching with 10 pilot customers, expect 100+ in 6 months"

**Recommendation**: **Cosmos DB** 🚀

- Built-in sharding handles growth
- No migration needed when scaling
- Worth the upfront cost to avoid future replatforming

### Scenario 3: "We're a bootstrapped startup, need to minimize costs"

**Recommendation**: **Neon** ⭐

- Free tier + Pro plan ($20/month) covers early stage
- Migrate to Cosmos when revenue supports it
- Can scale vertically to ~100 tenants

### Scenario 4: "We need Azure-native for compliance/security"

**Recommendation**: **Cosmos DB** 🚀

- Integrated with Azure Monitor, Key Vault, RBAC
- Data residency guaranteed (Azure region selection)
- Managed identity for App Service
- Wait for Azure PostgreSQL quota if budget constrained

### Scenario 5: "This is for internal tooling/testing only"

**Recommendation**: **Neon** ⭐

- Free tier sufficient
- No credit card needed
- Easy to tear down when done

---

## 📚 Documentation References

### Neon Setup

- Setup script: `setup-with-neon.ps1`
- Documentation: https://neon.tech/docs
- Dashboard: https://console.neon.tech

### Cosmos DB Setup

- Setup script: `setup-with-cosmos.ps1`
- Full guide: `COSMOS_DB_SETUP.md`
- Distribution config: `scripts/cosmos/configure-distribution.sql`
- Bicep template: `infra/cosmos/main.bicep`
- Azure docs: https://learn.microsoft.com/azure/cosmos-db/postgresql/

### General

- Main summary: `PRODUCTION_SETUP_SUMMARY.md`
- Database module: `server/db.production.ts`
- Schema definition: `shared/schema.ts`

---

## ❓ FAQ

### Can I migrate from Neon to Cosmos DB later?

**Yes!** Both use standard PostgreSQL. Migration process:

1. Export Neon data: `pg_dump "$NEON_URL" > backup.sql`
2. Provision Cosmos DB cluster
3. Import data: `psql "$COSMOS_URL" < backup.sql`
4. Run Citus distribution:
   `psql "$COSMOS_URL" -f scripts/cosmos/configure-distribution.sql`
5. Update `.env` and restart

### Do I need to change my code for Cosmos DB?

**No!** Citus is a PostgreSQL extension. Your existing Drizzle queries work
as-is. The only difference is better performance due to sharding.

### What if I choose wrong?

**Low risk!** Both options use standard PostgreSQL. Switching costs:

- **Time**: 1-2 hours to migrate data
- **Downtime**: ~15 minutes (maintenance window)
- **Code changes**: None (just update connection string)

### How do I know if I need sharding?

**Use Cosmos DB if:**

- ✅ 100+ tenants expected
- ✅ Tenants have large datasets (millions of rows each)
- ✅ Need to scale horizontally (add nodes)
- ✅ Want query performance guarantees per tenant

**Neon is fine if:**

- ❌ Under 100 tenants
- ❌ Moderate data sizes (under 1TB total)
- ❌ Can scale vertically (bigger single instance)
- ❌ Budget under $100/month

---

## 🎯 Decision Summary

**Choose Neon if:**

- Speed of setup is priority
- Budget < $100/month
- Under 100 tenants
- Development/staging/testing

**Choose Cosmos DB if:**

- Production workload
- 100+ tenants expected
- Need horizontal scaling
- Budget allows $300-500/month
- Azure-native required

**Wait for Azure PostgreSQL if:**

- Blocked by Free Trial quota
- Can wait days/weeks for quota
- Don't need Citus sharding
- Want lower cost than Cosmos

---

**Need help deciding?** Run:

```powershell
# Dry run to see what each script does
.\setup-with-neon.ps1 -ConnectionString "test" -DryRun
.\setup-with-cosmos.ps1 -ConnectionString "test" -DryRun
```

---

_Generated: October 29, 2025_  
_All options maintain 100% code compatibility - no rewrites needed!_
