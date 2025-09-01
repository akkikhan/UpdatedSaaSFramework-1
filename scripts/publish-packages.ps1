#!/usr/bin/env pwsh

# SaaS Framework - NPM Publishing Script
# This script automates the publishing process for all SDK packages

param(
    [Parameter(Mandatory=$false)]
    [string]$Version = "",
    
    [Parameter(Mandatory=$false)]
    [switch]$DryRun = $false,
    
    [Parameter(Mandatory=$false)]
    [switch]$Force = $false
)

Write-Host "=== SaaS Framework NPM Publishing Script ===" -ForegroundColor Cyan
Write-Host "Starting publishing process..." -ForegroundColor Green

# Check if user is logged into NPM
Write-Host "`nChecking NPM authentication..." -ForegroundColor Yellow
try {
    $npmUser = npm whoami
    Write-Host "✅ Logged in as: $npmUser" -ForegroundColor Green
} catch {
    Write-Host "❌ Not logged into NPM. Please run 'npm login' first." -ForegroundColor Red
    exit 1
}

# Define packages to publish
$packages = @(
    @{Name="email"; Path="packages/email"; Description="Enterprise Email SDK"},
    @{Name="auth"; Path="packages/auth"; Description="Authentication & Authorization SDK"},
    @{Name="logging"; Path="packages/logging"; Description="Structured Logging & Audit SDK"},
    @{Name="rbac"; Path="packages/rbac"; Description="Role-Based Access Control SDK"}
)

Write-Host "`n=== Package Information ===" -ForegroundColor Cyan
foreach ($pkg in $packages) {
    $packageJsonPath = Join-Path $pkg.Path "package.json"
    if (Test-Path $packageJsonPath) {
        $packageJson = Get-Content $packageJsonPath | ConvertFrom-Json
        Write-Host "📦 $($packageJson.name) v$($packageJson.version) - $($pkg.Description)" -ForegroundColor White
    }
}

# Version update if specified
if ($Version -ne "") {
    Write-Host "`n=== Updating Package Versions ===" -ForegroundColor Cyan
    foreach ($pkg in $packages) {
        Write-Host "Updating $($pkg.Name) to version $Version..." -ForegroundColor Yellow
        Set-Location $pkg.Path
        npm version $Version --no-git-tag-version
        Set-Location ../..
    }
}

# Build all packages
Write-Host "`n=== Building All Packages ===" -ForegroundColor Cyan
Write-Host "Building packages..." -ForegroundColor Yellow

try {
    npm run packages:build
    Write-Host "✅ All packages built successfully!" -ForegroundColor Green
} catch {
    Write-Host "❌ Build failed. Please fix errors before publishing." -ForegroundColor Red
    exit 1
}

# Dry run check
if ($DryRun) {
    Write-Host "`n=== Dry Run Mode ===" -ForegroundColor Yellow
    Write-Host "This is a dry run. No packages will be published." -ForegroundColor Yellow
    
    foreach ($pkg in $packages) {
        Write-Host "Would publish: @saas-framework/$($pkg.Name)" -ForegroundColor White
    }
    
    Write-Host "`n✅ Dry run completed. All packages are ready for publishing!" -ForegroundColor Green
    exit 0
}

# Final confirmation
if (-not $Force) {
    Write-Host "`n=== Final Confirmation ===" -ForegroundColor Yellow
    $confirmation = Read-Host "Are you sure you want to publish all packages to NPM? (y/N)"
    if ($confirmation -ne "y" -and $confirmation -ne "Y") {
        Write-Host "Publishing cancelled." -ForegroundColor Yellow
        exit 0
    }
}

# Publish packages
Write-Host "`n=== Publishing Packages ===" -ForegroundColor Cyan

$publishResults = @()

foreach ($pkg in $packages) {
    Write-Host "`nPublishing @saas-framework/$($pkg.Name)..." -ForegroundColor Yellow
    
    try {
        Set-Location $pkg.Path
        npm publish --access public
        
        Write-Host "✅ @saas-framework/$($pkg.Name) published successfully!" -ForegroundColor Green
        $publishResults += @{Package="@saas-framework/$($pkg.Name)"; Status="Success"}
        
        Set-Location ../..
    } catch {
        Write-Host "❌ Failed to publish @saas-framework/$($pkg.Name)" -ForegroundColor Red
        $publishResults += @{Package="@saas-framework/$($pkg.Name)"; Status="Failed"; Error=$_.Exception.Message}
        Set-Location ../..
    }
}

# Publishing summary
Write-Host "`n=== Publishing Summary ===" -ForegroundColor Cyan

$successCount = 0
$failCount = 0

foreach ($result in $publishResults) {
    if ($result.Status -eq "Success") {
        Write-Host "✅ $($result.Package)" -ForegroundColor Green
        $successCount++
    } else {
        Write-Host "❌ $($result.Package) - $($result.Error)" -ForegroundColor Red
        $failCount++
    }
}

Write-Host "`nResults: $successCount successful, $failCount failed" -ForegroundColor White

if ($failCount -eq 0) {
    Write-Host "`n🎉 All packages published successfully!" -ForegroundColor Green
    Write-Host "You can now install them using:" -ForegroundColor White
    Write-Host "  npm install @saas-framework/email" -ForegroundColor Gray
    Write-Host "  npm install @saas-framework/auth" -ForegroundColor Gray
    Write-Host "  npm install @saas-framework/logging" -ForegroundColor Gray
    Write-Host "  npm install @saas-framework/rbac" -ForegroundColor Gray
} else {
    Write-Host "`n⚠️  Some packages failed to publish. Please check errors above." -ForegroundColor Yellow
    exit 1
}

Write-Host "`n=== Next Steps ===" -ForegroundColor Cyan
Write-Host "1. Verify packages on NPM: https://www.npmjs.com/org/saas-framework" -ForegroundColor White
Write-Host "2. Test installation in a new project" -ForegroundColor White
Write-Host "3. Update documentation with new package versions" -ForegroundColor White
Write-Host "4. Create git tags for the release" -ForegroundColor White
Write-Host "5. Announce the release to stakeholders" -ForegroundColor White

Write-Host "`n✅ Publishing process completed!" -ForegroundColor Green
