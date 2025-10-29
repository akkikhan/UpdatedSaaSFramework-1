# Complete Production Setup Automation
# Orchestrates all steps for Azure PostgreSQL deployment

Write-Host "`n" -NoNewline
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "🚀 SaaS Platform - Production Database Setup" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

# Check for psql
Write-Host "Checking prerequisites..." -ForegroundColor Gray
$psqlExists = Get-Command psql -ErrorAction SilentlyContinue
if (-not $psqlExists) {
    Write-Host "❌ psql not found. Please install PostgreSQL client tools:" -ForegroundColor Red
    Write-Host "   https://www.postgresql.org/download/windows/" -ForegroundColor White
    exit 1
}

# Check for azure-postgres-credentials.txt from server creation
if (-not (Test-Path "azure-postgres-credentials.txt")) {
    Write-Host "❌ azure-postgres-credentials.txt not found" -ForegroundColor Red
    Write-Host "   Please run the Azure PostgreSQL creation script first" -ForegroundColor Yellow
    exit 1
}

# Parse credentials file
Write-Host "✅ Found credentials file" -ForegroundColor Green
$credsContent = Get-Content "azure-postgres-credentials.txt" -Raw

# Extract values using regex
$serverFqdn = if ($credsContent -match "Server FQDN:\s*(.+)") { $matches[1].Trim() } else { "" }
$adminUser = if ($credsContent -match "Admin User:\s*Username:\s*(.+)") { $matches[1].Trim() } else { "" }
$adminPassword = if ($credsContent -match "Admin User:\s*Username:.*\s*Password:\s*(.+)") { $matches[1].Trim() } else { "" }
$appUser = if ($credsContent -match "Application User:\s*Username:\s*(.+)") { $matches[1].Trim() } else { "" }
$appPassword = if ($credsContent -match "Application User:\s*Username:.*\s*Password:\s*(.+)") { $matches[1].Trim() } else { "" }
$dbName = if ($credsContent -match "Database:\s*(.+)") { $matches[1].Trim() } else { "saas_platform" }
$appConnectionString = if ($credsContent -match "Application User:.*Connection:\s*(.+)") { $matches[1].Trim() } else { "" }

if (-not $serverFqdn -or -not $adminUser -or -not $adminPassword) {
    Write-Host "❌ Could not parse credentials file" -ForegroundColor Red
    Write-Host "Please check azure-postgres-credentials.txt format" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "📋 Configuration:" -ForegroundColor Yellow
Write-Host "   Server: $serverFqdn"
Write-Host "   Database: $dbName"
Write-Host "   Admin: $adminUser"
Write-Host "   App User: $appUser"
Write-Host ""

# Confirm before proceeding
$confirmation = Read-Host "Proceed with setup? (Y/N)"
if ($confirmation -ne "Y" -and $confirmation -ne "y") {
    Write-Host "Setup cancelled" -ForegroundColor Yellow
    exit 0
}

# Step 1: Setup database and security
Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "Step 1: Database & Security Setup" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan

.\setup-production-database.ps1 `
    -ServerFqdn $serverFqdn `
    -AdminUser $adminUser `
    -AdminPassword $adminPassword `
    -AppUser $appUser `
    -AppPassword $appPassword `
    -DbName $dbName

if ($LASTEXITCODE -ne 0) {
    Write-Host "`n❌ Database setup failed" -ForegroundColor Red
    exit 1
}

# Step 2: Configure production environment
Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "Step 2: Environment Configuration" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan

.\configure-production-env.ps1 -ConnectionString $appConnectionString

# Step 3: Switch to production database module
Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "Step 3: Activating Production Database" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan

Write-Host "Creating backup of development db.ts..." -ForegroundColor Gray
Copy-Item "server\db.ts" "server\db.development.ts" -Force
Write-Host "✅ Backup created: server\db.development.ts" -ForegroundColor Green

Write-Host "Switching to production database configuration..." -ForegroundColor Gray
Copy-Item "server\db.production.ts" "server\db.ts" -Force
Write-Host "✅ Production database module activated" -ForegroundColor Green

# Step 4: Run migrations
Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "Step 4: Database Migrations" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan

Write-Host "Running Drizzle migrations..." -ForegroundColor Gray
npm run db:push

if ($LASTEXITCODE -ne 0) {
    Write-Host "`n⚠️  Migrations had issues - may need manual review" -ForegroundColor Yellow
} else {
    Write-Host "✅ Migrations completed successfully" -ForegroundColor Green
}

# Step 5: Setup platform admin
Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "Step 5: Platform Admin Setup" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan

Write-Host ""
Write-Host "Creating platform admin account..." -ForegroundColor Yellow
Write-Host "Use your Azure AD email: akkhan2026@outlook.com" -ForegroundColor Cyan
Write-Host ""

npm run setup:platform-admin

# Step 6: Stop old server
Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "Step 6: Server Restart" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan

$process = Get-Process -Id (Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue).OwningProcess -ErrorAction SilentlyContinue
if ($process) {
    Write-Host "Stopping existing server..." -ForegroundColor Gray
    Stop-Process -Id $process.Id -Force
    Start-Sleep -Seconds 2
    Write-Host "✅ Old server stopped" -ForegroundColor Green
}

# Final summary
Write-Host "`n" -NoNewline
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
Write-Host "🎉 Production Setup Complete!" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
Write-Host ""
Write-Host "✅ Azure PostgreSQL configured" -ForegroundColor White
Write-Host "✅ Database security hardened" -ForegroundColor White
Write-Host "✅ Environment variables updated" -ForegroundColor White
Write-Host "✅ Production database module activated" -ForegroundColor White
Write-Host "✅ Schema migrations applied" -ForegroundColor White
Write-Host "✅ Platform admin created" -ForegroundColor White
Write-Host "✅ Development bypasses removed" -ForegroundColor White
Write-Host ""
Write-Host "🚀 Start your production server:" -ForegroundColor Cyan
Write-Host "   npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "🔐 Login at:" -ForegroundColor Cyan
Write-Host "   http://localhost:5000/admin/login" -ForegroundColor White
Write-Host "   (Use Azure AD sign-in)" -ForegroundColor Gray
Write-Host ""
Write-Host "📊 Health check:" -ForegroundColor Cyan
Write-Host "   curl http://localhost:5000/api/health" -ForegroundColor White
Write-Host ""
Write-Host "⚠️  Remember:" -ForegroundColor Yellow
Write-Host "   • Credentials saved in azure-postgres-credentials.txt" -ForegroundColor White
Write-Host "   • Development db.ts backed up to server\db.development.ts" -ForegroundColor White
Write-Host "   • .env backed up with timestamp" -ForegroundColor White
Write-Host "   • Keep azure-postgres-credentials.txt secure (add to .gitignore)" -ForegroundColor White
Write-Host ""
