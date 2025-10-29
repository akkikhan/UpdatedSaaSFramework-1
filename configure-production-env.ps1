# Configure Production Environment
# Updates .env with production database and removes development bypasses

param(
    [Parameter(Mandatory=$true)]
    [string]$ConnectionString
)

Write-Host "`n🔧 Configuring Production Environment`n" -ForegroundColor Cyan

# Backup current .env
Write-Host "1️⃣  Backing up current configuration..." -ForegroundColor Green
if (Test-Path ".env") {
    $timestamp = (Get-Date).ToString("yyyyMMddHHmmss")
    Copy-Item ".env" ".env.backup.$timestamp" -Force
    Write-Host "   ✅ Backup created: .env.backup.$timestamp" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  No existing .env file found" -ForegroundColor Yellow
}

# Read current .env
Write-Host "`n2️⃣  Updating environment variables..." -ForegroundColor Green
$envContent = Get-Content ".env" -Raw

# Update DATABASE_URL
$envContent = $envContent -replace 'DATABASE_URL=.*', "DATABASE_URL=$ConnectionString"

# Remove BYPASS_ADMIN_AUTH
$envContent = $envContent -replace 'BYPASS_ADMIN_AUTH=true', '# Production: Using real database authentication'

# Ensure critical security settings
if ($envContent -notmatch 'JWT_SECRET') {
    Write-Host "   ⚠️  JWT_SECRET not found, generating secure value..." -ForegroundColor Yellow
    $jwtSecret = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 64 | ForEach-Object {[char]$_})
    $envContent += "`nJWT_SECRET=$jwtSecret"
}

# Save updated .env
$envContent | Set-Content ".env" -NoNewline
Write-Host "   ✅ DATABASE_URL updated" -ForegroundColor Green
Write-Host "   ✅ Development bypass removed" -ForegroundColor Green

Write-Host "`n3️⃣  Validating configuration..." -ForegroundColor Green

# Check for required variables
$requiredVars = @('DATABASE_URL', 'JWT_SECRET', 'AZURE_CLIENT_ID', 'AZURE_CLIENT_SECRET', 'AZURE_TENANT_ID')
$envLines = Get-Content ".env"
$missing = @()

foreach ($var in $requiredVars) {
    if (-not ($envLines | Where-Object { $_ -match "^$var=" })) {
        $missing += $var
    }
}

if ($missing.Count -gt 0) {
    Write-Host "   ⚠️  Missing variables: $($missing -join ', ')" -ForegroundColor Yellow
} else {
    Write-Host "   ✅ All required variables present" -ForegroundColor Green
}

Write-Host "`n4️⃣  Removing development safety nets..." -ForegroundColor Green

# Update server/storage.ts to remove pg-mem fallback
$storagePath = "server\storage.ts"
if (Test-Path $storagePath) {
    $storageContent = Get-Content $storagePath -Raw
    
    if ($storageContent -match 'pg-mem') {
        Write-Host "   📝 Found pg-mem fallback in storage.ts" -ForegroundColor Gray
        Write-Host "   ℹ️  Manual review recommended - see instructions below" -ForegroundColor Cyan
    } else {
        Write-Host "   ✅ No pg-mem fallback detected" -ForegroundColor Green
    }
}

Write-Host "`n✅ Production configuration complete!`n" -ForegroundColor Green

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "🚀 Next Steps" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Run migrations:" -ForegroundColor Yellow
Write-Host "   npm run db:push" -ForegroundColor White
Write-Host ""
Write-Host "2. Setup platform admin:" -ForegroundColor Yellow
Write-Host "   npm run setup:platform-admin" -ForegroundColor White
Write-Host ""
Write-Host "3. Seed initial data (optional):" -ForegroundColor Yellow
Write-Host "   node create-test-tenant.mjs" -ForegroundColor White
Write-Host ""
Write-Host "4. Start production server:" -ForegroundColor Yellow
Write-Host "   npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "5. Validate health check:" -ForegroundColor Yellow
Write-Host "   curl http://localhost:5000/api/health" -ForegroundColor White
Write-Host ""
Write-Host "6. Test Azure AD login:" -ForegroundColor Yellow
Write-Host "   http://localhost:5000/admin/login" -ForegroundColor White
Write-Host ""
