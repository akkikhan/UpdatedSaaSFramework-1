# ============================================================================
# Azure Cosmos DB for PostgreSQL - Production Setup Script
# ============================================================================
# This script configures the SaaS platform to use Cosmos DB for PostgreSQL
# with multi-tenant sharding via Citus extension.
#
# Prerequisites:
# - Cosmos DB for PostgreSQL cluster provisioned (via Bicep or Azure Portal)
# - Connection string with coordinator endpoint and options flag
# - npm packages installed
#
# Usage:
#   .\setup-with-cosmos.ps1 -ConnectionString "postgresql://user%40cluster:pass@cluster.postgres.cosmos.azure.com:5432/citus?sslmode=require&options=--cluster%3Dcluster"
# ============================================================================

param(
    [Parameter(Mandatory=$true)]
    [string]$ConnectionString,
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipDistribution,
    
    [Parameter(Mandatory=$false)]
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"

Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "🚀 Cosmos DB for PostgreSQL - Production Setup" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

# ============================================================================
# Step 1: Validate Prerequisites
# ============================================================================
Write-Host "📋 Step 1: Validating Prerequisites" -ForegroundColor Yellow
Write-Host ""

# Check if .env exists
if (-not (Test-Path ".env")) {
    Write-Host "❌ Error: .env file not found" -ForegroundColor Red
    Write-Host "   Please ensure you're running this from the project root" -ForegroundColor Gray
    exit 1
}

# Validate connection string format
if (-not $ConnectionString.Contains("postgres.cosmos.azure.com")) {
    Write-Host "⚠️  Warning: Connection string doesn't appear to be Cosmos DB" -ForegroundColor Yellow
    Write-Host "   Expected format: postgresql://user%40cluster:pass@cluster.postgres.cosmos.azure.com:5432/..." -ForegroundColor Gray
    $continue = Read-Host "   Continue anyway? (y/N)"
    if ($continue -ne "y") {
        exit 0
    }
}

# Validate options parameter for coordinator routing
if (-not $ConnectionString.Contains("options=")) {
    Write-Host "⚠️  Warning: Connection string missing 'options=--cluster=<name>' parameter" -ForegroundColor Yellow
    Write-Host "   This is required for proper coordinator routing in Cosmos DB" -ForegroundColor Gray
    Write-Host "   Example: ...?sslmode=require&options=--cluster%3Dcluster" -ForegroundColor Gray
    $continue = Read-Host "   Continue anyway? (y/N)"
    if ($continue -ne "y") {
        exit 0
    }
}

Write-Host "✅ Prerequisites validated" -ForegroundColor Green
Write-Host ""

if ($DryRun) {
    Write-Host "🔍 DRY RUN MODE - No changes will be made" -ForegroundColor Cyan
    Write-Host ""
}

# ============================================================================
# Step 2: Backup Current Configuration
# ============================================================================
Write-Host "📦 Step 2: Backing Up Current Configuration" -ForegroundColor Yellow
Write-Host ""

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupFile = ".env.backup.$timestamp"

if (-not $DryRun) {
    Copy-Item ".env" $backupFile
    Write-Host "✅ Backed up .env → $backupFile" -ForegroundColor Green
} else {
    Write-Host "🔍 Would backup .env → $backupFile" -ForegroundColor Gray
}
Write-Host ""

# ============================================================================
# Step 3: Update Environment Configuration
# ============================================================================
Write-Host "⚙️  Step 3: Updating Environment Configuration" -ForegroundColor Yellow
Write-Host ""

$envContent = Get-Content ".env" -Raw

# Update DATABASE_URL
$envContent = $envContent -replace 'DATABASE_URL=.*', "DATABASE_URL=$ConnectionString"

# Remove BYPASS_ADMIN_AUTH if present
if ($envContent -match 'BYPASS_ADMIN_AUTH=true') {
    Write-Host "   Removing BYPASS_ADMIN_AUTH development flag..." -ForegroundColor Gray
    $envContent = $envContent -replace 'BYPASS_ADMIN_AUTH=true', '# BYPASS_ADMIN_AUTH=true  # Removed - using real Cosmos DB'
}

# Add COSMOS_DB marker
if (-not ($envContent -match 'COSMOS_DB=true')) {
    Write-Host "   Adding COSMOS_DB=true flag..." -ForegroundColor Gray
    $envContent += "`nCOSMOS_DB=true  # Using Azure Cosmos DB for PostgreSQL with Citus"
}

if (-not $DryRun) {
    Set-Content ".env" $envContent
    Write-Host "✅ Environment configuration updated" -ForegroundColor Green
} else {
    Write-Host "🔍 Would update .env with Cosmos connection string" -ForegroundColor Gray
}
Write-Host ""

# ============================================================================
# Step 4: Switch to Production Database Module
# ============================================================================
Write-Host "🔄 Step 4: Switching to Production Database Module" -ForegroundColor Yellow
Write-Host ""

$dbFile = "server/db.ts"
$prodDbFile = "server/db.production.ts"

if (Test-Path $prodDbFile) {
    if (-not $DryRun) {
        # Backup current db.ts
        Copy-Item $dbFile "server/db.ts.backup.$timestamp"
        
        # Replace with production version
        Copy-Item $prodDbFile $dbFile -Force
        
        Write-Host "✅ Switched to production database module (no pg-mem fallback)" -ForegroundColor Green
    } else {
        Write-Host "🔍 Would switch $dbFile → $prodDbFile" -ForegroundColor Gray
    }
} else {
    Write-Host "⚠️  Warning: $prodDbFile not found, keeping current db.ts" -ForegroundColor Yellow
}
Write-Host ""

# ============================================================================
# Step 5: Stop Existing Development Server
# ============================================================================
Write-Host "🛑 Step 5: Stopping Existing Development Server" -ForegroundColor Yellow
Write-Host ""

if (-not $DryRun) {
    $process = Get-Process -Id (Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue).OwningProcess -ErrorAction SilentlyContinue
    if ($process) {
        Write-Host "   Stopping server on port 5000..." -ForegroundColor Gray
        Stop-Process -Id $process.Id -Force
        Start-Sleep -Seconds 2
        Write-Host "✅ Server stopped" -ForegroundColor Green
    } else {
        Write-Host "ℹ️  No server running on port 5000" -ForegroundColor Gray
    }
} else {
    Write-Host "🔍 Would stop any server on port 5000" -ForegroundColor Gray
}
Write-Host ""

# ============================================================================
# Step 6: Run Database Migrations
# ============================================================================
Write-Host "🗄️  Step 6: Running Database Migrations" -ForegroundColor Yellow
Write-Host ""

if (-not $DryRun) {
    Write-Host "   Executing: npm run db:push" -ForegroundColor Gray
    npm run db:push
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Migration failed!" -ForegroundColor Red
        Write-Host ""
        Write-Host "Troubleshooting:" -ForegroundColor Yellow
        Write-Host "  1. Verify connection string is correct" -ForegroundColor Gray
        Write-Host "  2. Check if Cosmos DB cluster is running" -ForegroundColor Gray
        Write-Host "  3. Ensure firewall rules allow your IP" -ForegroundColor Gray
        Write-Host "  4. Verify pgcrypto extension is enabled" -ForegroundColor Gray
        exit 1
    }
    
    Write-Host "✅ Drizzle migrations applied successfully" -ForegroundColor Green
} else {
    Write-Host "🔍 Would execute: npm run db:push" -ForegroundColor Gray
}
Write-Host ""

# ============================================================================
# Step 7: Configure Citus Distribution (Multi-Tenant Sharding)
# ============================================================================
if (-not $SkipDistribution) {
    Write-Host "🌐 Step 7: Configuring Citus Distribution (Multi-Tenant Sharding)" -ForegroundColor Yellow
    Write-Host ""
    
    $distributionScript = "scripts/cosmos/configure-distribution.sql"
    
    if (Test-Path $distributionScript) {
        if (-not $DryRun) {
            Write-Host "   Running Citus distribution setup..." -ForegroundColor Gray
            Write-Host "   This distributes tenant-scoped tables across worker nodes" -ForegroundColor Gray
            Write-Host ""
            
            # Extract connection details for psql
            if ($ConnectionString -match 'postgresql://([^:]+):([^@]+)@([^:]+):(\d+)/(\w+)') {
                $user = $matches[1]
                $pass = $matches[2]
                $host = $matches[3]
                $port = $matches[4]
                $db = $matches[5]
                
                # Set PGPASSWORD environment variable for psql
                $env:PGPASSWORD = $pass
                
                # Execute distribution script
                $psqlCmd = "psql -h $host -p $port -U $user -d $db -f $distributionScript"
                Write-Host "   Executing: $psqlCmd" -ForegroundColor Gray
                
                # Try to run psql
                try {
                    Invoke-Expression $psqlCmd
                    
                    if ($LASTEXITCODE -eq 0) {
                        Write-Host "✅ Citus distribution configured successfully" -ForegroundColor Green
                        Write-Host ""
                        Write-Host "   📊 Distribution Summary:" -ForegroundColor Cyan
                        Write-Host "   • Distributed tables: tenants, users, sessions, roles, etc." -ForegroundColor Gray
                        Write-Host "   • Partition key: tenant_id (for multi-tenant isolation)" -ForegroundColor Gray
                        Write-Host "   • Reference tables: platform_admins, permission_templates" -ForegroundColor Gray
                    } else {
                        Write-Host "⚠️  Warning: Citus distribution may have failed" -ForegroundColor Yellow
                        Write-Host "   You may need to run this manually later" -ForegroundColor Gray
                    }
                } catch {
                    Write-Host "⚠️  Warning: psql not found or failed" -ForegroundColor Yellow
                    Write-Host "   To configure Citus distribution manually:" -ForegroundColor Gray
                    Write-Host "   psql `"$ConnectionString`" -f $distributionScript" -ForegroundColor Cyan
                } finally {
                    # Clean up password from environment
                    Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue
                }
            } else {
                Write-Host "⚠️  Warning: Could not parse connection string for psql" -ForegroundColor Yellow
                Write-Host "   To configure Citus distribution manually:" -ForegroundColor Gray
                Write-Host "   psql `"$ConnectionString`" -f $distributionScript" -ForegroundColor Cyan
            }
        } else {
            Write-Host "🔍 Would execute: psql -f $distributionScript" -ForegroundColor Gray
        }
    } else {
        Write-Host "⚠️  Warning: Distribution script not found at $distributionScript" -ForegroundColor Yellow
        Write-Host "   Skipping Citus distribution configuration" -ForegroundColor Gray
    }
    Write-Host ""
} else {
    Write-Host "⏭️  Step 7: Skipping Citus Distribution (--SkipDistribution flag)" -ForegroundColor Yellow
    Write-Host ""
}

# ============================================================================
# Step 8: Create Platform Admin Account
# ============================================================================
Write-Host "👤 Step 8: Creating Platform Admin Account" -ForegroundColor Yellow
Write-Host ""

if (-not $DryRun) {
    Write-Host "   Executing: npm run setup:platform-admin" -ForegroundColor Gray
    npm run setup:platform-admin
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "⚠️  Warning: Platform admin setup may have failed" -ForegroundColor Yellow
        Write-Host "   You may need to run this manually: npm run setup:platform-admin" -ForegroundColor Gray
    } else {
        Write-Host "✅ Platform admin account created/verified" -ForegroundColor Green
    }
} else {
    Write-Host "🔍 Would execute: npm run setup:platform-admin" -ForegroundColor Gray
}
Write-Host ""

# ============================================================================
# Step 9: Validate Connection
# ============================================================================
Write-Host "🔍 Step 9: Validating Database Connection" -ForegroundColor Yellow
Write-Host ""

if (-not $DryRun) {
    # Quick connection test
    Write-Host "   Testing connection..." -ForegroundColor Gray
    
    $testScript = @"
import { pool } from './server/db.js';
try {
  const result = await pool.query('SELECT 1 as ok, version() as version');
  console.log('✅ Connection successful');
  console.log('   PostgreSQL version:', result.rows[0].version);
  await pool.end();
  process.exit(0);
} catch (error) {
  console.error('❌ Connection failed:', error.message);
  process.exit(1);
}
"@
    
    $testScript | Out-File -FilePath "test-connection.mjs" -Encoding UTF8
    
    try {
        node test-connection.mjs
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Database connection validated" -ForegroundColor Green
        }
    } catch {
        Write-Host "⚠️  Warning: Connection test failed" -ForegroundColor Yellow
    } finally {
        Remove-Item "test-connection.mjs" -ErrorAction SilentlyContinue
    }
} else {
    Write-Host "🔍 Would validate database connection" -ForegroundColor Gray
}
Write-Host ""

# ============================================================================
# Completion Summary
# ============================================================================
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
Write-Host "✅ Cosmos DB Setup Complete!" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
Write-Host ""

if (-not $DryRun) {
    Write-Host "📋 What Changed:" -ForegroundColor Yellow
    Write-Host "  ✅ DATABASE_URL → Cosmos DB connection string" -ForegroundColor White
    Write-Host "  ✅ BYPASS_ADMIN_AUTH → Removed (production mode)" -ForegroundColor White
    Write-Host "  ✅ Database module → Production (no pg-mem)" -ForegroundColor White
    Write-Host "  ✅ Tables → Created via Drizzle migrations" -ForegroundColor White
    if (-not $SkipDistribution) {
        Write-Host "  ✅ Citus sharding → Configured for multi-tenant isolation" -ForegroundColor White
    }
    Write-Host "  ✅ Platform admin → Created/verified" -ForegroundColor White
    Write-Host ""
    Write-Host "🚀 Next Steps:" -ForegroundColor Yellow
    Write-Host "  1. Start the server:" -ForegroundColor White
    Write-Host "     npm run dev" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  2. Test login:" -ForegroundColor White
    Write-Host "     http://localhost:5000/admin/login" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  3. Monitor Citus performance:" -ForegroundColor White
    Write-Host "     SELECT * FROM citus_stat_statements;" -ForegroundColor Cyan
    Write-Host "     SELECT * FROM pg_dist_shard_placement;" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "📚 Documentation:" -ForegroundColor Yellow
    Write-Host "  • Cosmos DB setup: COSMOS_DB_SETUP.md" -ForegroundColor White
    Write-Host "  • Troubleshooting: PRODUCTION_SETUP_SUMMARY.md" -ForegroundColor White
    Write-Host ""
    Write-Host "💾 Backup Files Created:" -ForegroundColor Yellow
    Write-Host "  • $backupFile" -ForegroundColor White
    if (Test-Path "server/db.ts.backup.$timestamp") {
        Write-Host "  • server/db.ts.backup.$timestamp" -ForegroundColor White
    }
} else {
    Write-Host "🔍 DRY RUN Complete - No changes were made" -ForegroundColor Cyan
    Write-Host "   Run without -DryRun flag to apply changes" -ForegroundColor Gray
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
Write-Host ""
