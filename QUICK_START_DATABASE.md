# 🚀 Quick Start - Choose Your Database

**Last Updated**: October 29, 2025

---

## ⚡ 5-Minute Setup - Neon (Recommended for Testing)

```powershell
# 1. Get connection string from https://neon.tech (free, no credit card)

# 2. Run setup
.\setup-with-neon.ps1 -ConnectionString "postgresql://user:pass@ep-xyz.neon.tech/db?sslmode=require"

# 3. Start server
npm run dev

# ✅ Done! Visit http://localhost:5000/admin/login
```

**Use Neon if:**

- ✅ Need to start immediately
- ✅ Budget < $100/month
- ✅ Under 100 tenants
- ✅ Dev/test/staging environment

---

## 🏢 Production Setup - Cosmos DB (Best for Scale)

```powershell
# 1. Provision Cosmos DB cluster (15 minutes)
cd infra/cosmos
az deployment group create \
  --resource-group saas-framework-rg \
  --template-file main.bicep \
  --parameters namePrefix=saas adminLogin=admin adminPassword='SecurePass123!'

# 2. Create database (via psql or Azure Cloud Shell)
psql "postgresql://admin@cluster:pass@cluster.postgres.cosmos.azure.com:5432/citus?sslmode=require"
# Run SQL from COSMOS_DB_SETUP.md (create database, user, extensions)

# 3. Build connection string (note special encoding!)
$cluster = "saas-cosmos"
$user = "saas_app"
$password = "SecurePass123"
$database = "saas_platform"
$connectionString = "postgresql://${user}%40${cluster}:${password}@${cluster}.postgres.cosmos.azure.com:5432/${database}?sslmode=require&options=--cluster%3D${cluster}"

# 4. Run setup (includes Citus sharding)
.\setup-with-cosmos.ps1 -ConnectionString $connectionString

# 5. Start server
npm run dev

# ✅ Done! Visit http://localhost:5000/admin/login
```

**Use Cosmos DB if:**

- ✅ Production workload
- ✅ 100+ tenants expected
- ✅ Need horizontal scaling
- ✅ Budget allows $300-500/month

---

## 📊 Quick Comparison

| Feature      | Neon ⭐       | Cosmos DB 🚀   |
| ------------ | ------------- | -------------- |
| **Setup**    | 5 min         | 25 min         |
| **Cost**     | Free → $20/mo | $300-500/mo    |
| **Scale**    | Vertical      | Horizontal     |
| **Sharding** | ❌ No         | ✅ Yes (Citus) |
| **Best For** | Dev/Small     | Production     |

---

## 📚 Documentation

- **DATABASE_OPTIONS_GUIDE.md** - Full comparison & decision guide
- **COSMOS_DB_SETUP.md** - Complete Cosmos migration guide
- **PRODUCTION_SETUP_SUMMARY.md** - General setup overview

---

## ⚠️ Connection String Formats

### Neon (Standard PostgreSQL)

```
postgresql://user:password@ep-xyz-123.region.aws.neon.tech/dbname?sslmode=require
```

### Cosmos DB (Requires Special Encoding!)

```
postgresql://user%40cluster:password@cluster.postgres.cosmos.azure.com:5432/db?sslmode=require&options=--cluster%3Dcluster
```

**⚠️ Cosmos DB Requirements:**

- User: `saas_app@cluster` → `saas_app%40cluster`
- Must include: `options=--cluster%3Dcluster` (URL-encoded)
- SSL required: `sslmode=require`

---

## ✅ What Gets Configured

Both scripts automatically:

- ✅ Update `.env` with connection string
- ✅ Remove `BYPASS_ADMIN_AUTH` flag
- ✅ Switch to production database module
- ✅ Run Drizzle migrations
- ✅ Create platform admin account
- ✅ Stop old development server

**Cosmos script additionally:**

- ✅ Configure Citus distribution (multi-tenant sharding)
- ✅ Validate worker node configuration
- ✅ Set up performance monitoring

---

## 🐛 Quick Troubleshooting

### Error: "DATABASE_URL required"

**Fix**: Connection string not set correctly

```powershell
# Check .env file
cat .env | Select-String "DATABASE_URL"
```

### Error: "Connection refused"

**Fix**: Firewall rules not configured

```bash
# Add your IP to firewall
az postgres flexible-server firewall-rule create --start-ip-address $(curl -s ifconfig.me)
```

### Error: "SSL connection required"

**Fix**: Add `?sslmode=require` to connection string

### Slow tenant queries (Cosmos only)

**Fix**: Missing `tenant_id` filter

```typescript
// ❌ BAD - Hits all shards
const users = await db.select().from(users);

// ✅ GOOD - Single shard
const users = await db.select().from(users).where(eq(users.tenantId, tenantId));
```

---

## 🎯 Decision Tree

```
Need database immediately?
├─ Yes → Neon (5 min setup)
└─ No  → Continue

Budget < $100/month?
├─ Yes → Neon
└─ No  → Continue

100+ tenants expected?
├─ Yes → Cosmos DB
└─ No  → Neon

Need horizontal scaling?
├─ Yes → Cosmos DB
└─ No  → Neon
```

---

## 📞 Support

- **Neon**: https://neon.tech/docs
- **Cosmos DB**: https://learn.microsoft.com/azure/cosmos-db/postgresql/
- **Citus**: https://docs.citusdata.com/

---

**Ready to start?** Pick your database and run the setup script! 🚀

_Both options work with your existing code - no rewrites needed._
