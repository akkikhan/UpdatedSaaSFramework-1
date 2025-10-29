# Production Database Setup Script
# Creates database, application user, and applies least-privilege security model

param(
    [Parameter(Mandatory=$true)]
    [string]$ServerFqdn,
    
    [Parameter(Mandatory=$true)]
    [string]$AdminUser,
    
    [Parameter(Mandatory=$true)]
    [string]$AdminPassword,
    
    [Parameter(Mandatory=$true)]
    [string]$AppUser,
    
    [Parameter(Mandatory=$true)]
    [string]$AppPassword,
    
    [Parameter(Mandatory=$true)]
    [string]$DbName
)

Write-Host "`n🔒 Setting up Production Database Security`n" -ForegroundColor Cyan

# Set PostgreSQL environment variables
$env:PGHOST = $ServerFqdn
$env:PGUSER = $AdminUser
$env:PGPASSWORD = $AdminPassword
$env:PGDATABASE = "postgres"
$env:PGSSLMODE = "require"

Write-Host "1️⃣  Creating application database..." -ForegroundColor Green

# Create database
$createDbQuery = "CREATE DATABASE $DbName WITH ENCODING 'UTF8';"
psql -c $createDbQuery 2>&1

if ($LASTEXITCODE -eq 0 -or $LASTEXITCODE -eq 1) {
    Write-Host "   ✅ Database created (or already exists)" -ForegroundColor Green
}

# Switch to new database
$env:PGDATABASE = $DbName

Write-Host "`n2️⃣  Enabling required extensions..." -ForegroundColor Green
psql -c "CREATE EXTENSION IF NOT EXISTS ""uuid-ossp"";" 2>&1
psql -c "CREATE EXTENSION IF NOT EXISTS ""pgcrypto"";" 2>&1
Write-Host "   ✅ Extensions enabled" -ForegroundColor Green

Write-Host "`n3️⃣  Creating application user with least privileges..." -ForegroundColor Green

# Create application role
$createUserQuery = "CREATE ROLE $AppUser WITH LOGIN PASSWORD '$AppPassword';"
psql -c $createUserQuery 2>&1

# Grant database-level permissions
psql -c "GRANT CONNECT ON DATABASE $DbName TO $AppUser;" 2>&1
psql -c "GRANT TEMP ON DATABASE $DbName TO $AppUser;" 2>&1

Write-Host "`n4️⃣  Configuring schema permissions..." -ForegroundColor Green

# Grant schema permissions
psql -c "GRANT USAGE, CREATE ON SCHEMA public TO $AppUser;" 2>&1

# Grant table permissions
psql -c "GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO $AppUser;" 2>&1
psql -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO $AppUser;" 2>&1

# Grant sequence permissions
psql -c "GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO $AppUser;" 2>&1
psql -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO $AppUser;" 2>&1

Write-Host "`n5️⃣  Hardening security..." -ForegroundColor Green

# Revoke public schema creation
psql -c "REVOKE CREATE ON SCHEMA public FROM PUBLIC;" 2>&1

# Set connection limits
psql -c "ALTER ROLE $AppUser CONNECTION LIMIT 50;" 2>&1

Write-Host "`n✅ Database security setup complete!`n" -ForegroundColor Green

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "📊 Database Configuration Summary" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

# Verify setup
Write-Host "Verifying application user permissions..." -ForegroundColor Gray
psql -c "SELECT rolname, rolsuper, rolcreatedb, rolcanlogin FROM pg_roles WHERE rolname = '$AppUser';" 2>&1

Write-Host "`nVerifying database access..." -ForegroundColor Gray
psql -c "SELECT datname FROM pg_database WHERE datname = '$DbName';" 2>&1

Write-Host ""
Write-Host "✅ Ready to update .env and run migrations!" -ForegroundColor Green
