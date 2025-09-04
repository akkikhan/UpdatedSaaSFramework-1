# Tenant Portal Quick Start Script for PowerShell
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "Tenant Portal Quick Start" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Check if Node.js is installed
try {
    $nodeVersion = node --version 2>$null
    Write-Host "Node.js found: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "Node.js is not installed. Please install Node.js first." -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""

# Check if dependencies are installed
if (!(Test-Path "node_modules")) {
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    npm install
    Write-Host "Dependencies installed" -ForegroundColor Green
} else {
    Write-Host "Dependencies already installed" -ForegroundColor Green
}

Write-Host ""

# Display information
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "TENANT PORTAL INFORMATION" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Server URL: http://localhost:5000" -ForegroundColor Cyan
Write-Host ""
Write-Host "Test Pages:" -ForegroundColor Yellow
Write-Host "  - Test Portal: http://localhost:5000/test-tenant-portal.html" -ForegroundColor Cyan
Write-Host "  - Admin Login: http://localhost:5000/admin/login" -ForegroundColor Cyan
Write-Host ""
Write-Host "Example Tenant Portals:" -ForegroundColor Yellow
Write-Host "  - http://localhost:5000/tenant/test-company/login" -ForegroundColor Cyan
Write-Host "  - http://localhost:5000/tenant/acme/login" -ForegroundColor Cyan
Write-Host "  - http://localhost:5000/tenant/demo/login" -ForegroundColor Cyan
Write-Host ""
Write-Host "Default Test Credentials:" -ForegroundColor Yellow
Write-Host "  Email: admin@test.com" -ForegroundColor Cyan
Write-Host "  Password: TestPassword123!" -ForegroundColor Cyan
Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "Starting server... Press Ctrl+C to stop" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Start the dev server
npm run dev