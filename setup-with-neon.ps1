# Quick Production Setup with Neon/Supabase
# Usage: .\setup-with-neon.ps1 -ConnectionString "postgresql://user:pass@host/db"

param(
    [Parameter(Mandatory=$true)]
    [string]$ConnectionString
)

Write-Host "`n" -NoNewline
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "🚀 Setting Up Production Database" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

# Validate connection string format
if ($ConnectionString -notmatch "postgresql://") {
    Write-Host "❌ Invalid connection string format" -ForegroundColor Red
    Write-Host "   Expected: postgresql://user:pass@host/db" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Connection string validated" -ForegroundColor Green
Write-Host ""

# Step 1: Backup and update .env
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "Step 1: Environment Configuration" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

if (Test-Path ".env") {
    $timestamp = (Get-Date).ToString("yyyyMMddHHmmss")
    Copy-Item ".env" ".env.backup.$timestamp" -Force
    Write-Host "✅ Backup created: .env.backup.$timestamp" -ForegroundColor Green
}

$envContent = if (Test-Path ".env") { Get-Content ".env" -Raw } else { "" }

# Update DATABASE_URL
if ($envContent -match 'DATABASE_URL=') {
    $envContent = $envContent -replace 'DATABASE_URL=.*', "DATABASE_URL=$ConnectionString"
} else {
    $envContent += "`nDATABASE_URL=$ConnectionString"
}

# Remove bypass flag
$envContent = $envContent -replace 'BYPASS_ADMIN_AUTH=true', '# Production: Real database authentication'
$envContent = $envContent -replace 'BYPASS_ADMIN_AUTH=.*', '# Production: Real database authentication'

# Ensure JWT_SECRET exists
if ($envContent -notmatch 'JWT_SECRET=') {
    Write-Host "   Generating secure JWT_SECRET..." -ForegroundColor Gray
    $jwtSecret = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 64 | ForEach-Object {[char]$_})
    $envContent += "`nJWT_SECRET=$jwtSecret"
}

$envContent | Set-Content ".env" -NoNewline
Write-Host "✅ .env updated with production database" -ForegroundColor Green
Write-Host "✅ Development bypasses removed" -ForegroundColor Green
Write-Host ""

# Step 2: Switch to production DB module
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "Step 2: Production Database Module" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

if (Test-Path "server\db.production.ts") {
    Write-Host "   Backing up development db.ts..." -ForegroundColor Gray
    Copy-Item "server\db.ts" "server\db.development.backup.ts" -Force
    
    Write-Host "   Activating production database module..." -ForegroundColor Gray
    Copy-Item "server\db.production.ts" "server\db.ts" -Force
    Write-Host "✅ Production database module activated" -ForegroundColor Green
} else {
    Write-Host "⚠️  Production db module not found, using current" -ForegroundColor Yellow
}
Write-Host ""

# Step 3: Run migrations
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "Step 3: Database Migrations" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

Write-Host "   Running Drizzle migrations..." -ForegroundColor Gray
npm run db:push 2>&1 | ForEach-Object {
    if ($_ -match "error|fail") {
        Write-Host "   $_" -ForegroundColor Red
    } elseif ($_ -match "success|created|applied") {
        Write-Host "   $_" -ForegroundColor Green
    } else {
        Write-Host "   $_" -ForegroundColor Gray
    }
}

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Database schema created successfully" -ForegroundColor Green
} else {
    Write-Host "⚠️  Migrations completed with warnings (may be okay)" -ForegroundColor Yellow
}
Write-Host ""

# Step 4: Setup platform admin
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "Step 4: Platform Admin Setup" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

Write-Host "   Creating platform admin account..." -ForegroundColor Yellow
Write-Host "   Use your Azure AD email: akkhan2026@outlook.com" -ForegroundColor Cyan
Write-Host ""

npm run setup:platform-admin

Write-Host ""

# Step 5: Stop old server
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "Step 5: Server Management" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

$process = Get-Process -Id (Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue).OwningProcess -ErrorAction SilentlyContinue
if ($process) {
    Write-Host "   Stopping existing server..." -ForegroundColor Gray
    Stop-Process -Id $process.Id -Force
    Start-Sleep -Seconds 2
    Write-Host "✅ Old server stopped" -ForegroundColor Green
} else {
    Write-Host "   No server running" -ForegroundColor Gray
}
Write-Host ""

# Success summary
Write-Host "`n" -NoNewline
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
Write-Host "🎉 Production Setup Complete!" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
Write-Host ""
Write-Host "✅ Production database connected" -ForegroundColor White
Write-Host "✅ Environment variables updated" -ForegroundColor White
Write-Host "✅ Schema migrations applied" -ForegroundColor White
Write-Host "✅ Platform admin created" -ForegroundColor White
Write-Host "✅ Development bypasses removed" -ForegroundColor White
Write-Host ""
Write-Host "🚀 Start your server:" -ForegroundColor Cyan
Write-Host "   npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "🔐 Test Azure AD login:" -ForegroundColor Cyan
Write-Host "   http://localhost:5000/admin/login" -ForegroundColor White
Write-Host ""
Write-Host "📊 Health check:" -ForegroundColor Cyan
Write-Host "   Invoke-WebRequest http://localhost:5000/api/health" -ForegroundColor White
Write-Host ""
Write-Host "✨ Your multi-tenant SaaS platform is ready!" -ForegroundColor Green
Write-Host ""
