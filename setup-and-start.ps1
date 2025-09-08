# Complete Setup and Start Script for PowerShell

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "Tenant Portal Complete Setup & Start" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Kill any existing process on port 5000
Write-Host "Checking for existing processes on port 5000..." -ForegroundColor Yellow
$processInfo = netstat -ano | Select-String ":5000.*LISTENING"
if ($processInfo) {
    $pid = $processInfo -replace '.*LISTENING\s+(\d+).*', '$1'
    if ($pid -match '^\d+$') {
        Write-Host "Found process $pid using port 5000, terminating..." -ForegroundColor Yellow
        try {
            Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
            Write-Host "Process terminated successfully" -ForegroundColor Green
            Start-Sleep -Seconds 2
        } catch {
            Write-Host "Could not terminate process $pid" -ForegroundColor Yellow
        }
    }
}

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
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Failed to install dependencies" -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    }
    Write-Host "Dependencies installed" -ForegroundColor Green
} else {
    Write-Host "Dependencies already installed" -ForegroundColor Green
}

Write-Host ""

# Start the server in a new window
Write-Host "Starting development server..." -ForegroundColor Yellow
$serverProcess = Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm run dev" -PassThru

# Wait for server to be ready
Write-Host "Waiting for server to be ready..." -ForegroundColor Yellow
$ready = $false
for ($i = 0; $i -lt 30; $i++) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:5000/api/health" -UseBasicParsing -TimeoutSec 1 -ErrorAction SilentlyContinue
        if ($response.StatusCode -eq 200) {
            $ready = $true
            Write-Host "Server is ready!" -ForegroundColor Green
            break
        }
    } catch {
        # Server not ready yet
    }
    Start-Sleep -Seconds 1
    Write-Host "." -NoNewline
}
Write-Host ""

if (!$ready) {
    Write-Host "Server did not start in time" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# Create test tenant
Write-Host ""
Write-Host "Setting up test tenant..." -ForegroundColor Yellow
node create-test-tenant.mjs

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "SETUP COMPLETE!" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Server is running at: " -NoNewline
Write-Host "http://localhost:5000" -ForegroundColor Cyan
Write-Host ""
Write-Host "Test Tenant Portal: " -NoNewline
Write-Host "http://localhost:5000/tenant/test-company/login" -ForegroundColor Cyan
Write-Host ""
Write-Host "Credentials:" -ForegroundColor Yellow
Write-Host "  Email: " -NoNewline
Write-Host "admin@test.com" -ForegroundColor Cyan
Write-Host "  Password: " -NoNewline
Write-Host "TestPassword123!" -ForegroundColor Cyan
Write-Host ""
Write-Host "Other Test Pages:" -ForegroundColor Yellow
Write-Host "  - Test Portal: " -NoNewline
Write-Host "http://localhost:5000/test-tenant-portal.html" -ForegroundColor Cyan
Write-Host "  - Admin Login: " -NoNewline
Write-Host "http://localhost:5000/admin/login" -ForegroundColor Cyan
Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "Server is running in a separate window" -ForegroundColor Green
Write-Host "Close that window to stop the server" -ForegroundColor Yellow
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Open the browser
Write-Host "Opening tenant portal in browser..." -ForegroundColor Green
Start-Process "http://localhost:5000/tenant/test-company/login"

Read-Host "Press Enter to exit this window"
