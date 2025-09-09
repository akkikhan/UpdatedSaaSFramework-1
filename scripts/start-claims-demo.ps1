$ErrorActionPreference = "Continue"

# Ensure API keys are available for logging and email notifications
if (-not $env:LOGGING_API_KEY -or -not $env:EMAIL_API_KEY) {
    Write-Host "Warning: LOGGING_API_KEY or EMAIL_API_KEY not set; logging or email notifications may be disabled." -ForegroundColor Yellow
}

Write-Host "Building SDK packages (auth-client, auth, logging, rbac)..." -ForegroundColor Cyan
try {
    Push-Location "$PSScriptRoot/../packages/auth-client"; npm install; npm run build; Pop-Location
} catch {
    Write-Host "Warning: auth-client package build failed, continuing..." -ForegroundColor Yellow
}
try {
    Push-Location "$PSScriptRoot/../packages/auth"; npm install; npm run build; Pop-Location  
} catch {
    Write-Host "Warning: auth package build failed, continuing..." -ForegroundColor Yellow
}
try {
    Push-Location "$PSScriptRoot/../packages/logging"; npm install; npm run build; Pop-Location
} catch {
    Write-Host "Warning: logging package build failed, continuing..." -ForegroundColor Yellow
}
try {
    Push-Location "$PSScriptRoot/../packages/rbac"; npm install; npm run build; Pop-Location
} catch {
    Write-Host "Warning: rbac package build failed, continuing..." -ForegroundColor Yellow
}

Write-Host "Starting Platform server (http://localhost:5000)..." -ForegroundColor Green
$platform = Start-Process -PassThru powershell -ArgumentList '-NoExit','-Command','npm run dev' -WorkingDirectory (Resolve-Path "$PSScriptRoot/..")

Start-Sleep -Seconds 2

Write-Host "Starting .NET Claims API (http://localhost:5299)..." -ForegroundColor Green
$dotnet = Start-Process -PassThru powershell -ArgumentList '-NoExit','-Command','dotnet run --urls http://localhost:5299' -WorkingDirectory (Resolve-Path "$PSScriptRoot/../examples/claims-dotnet")

Start-Sleep -Seconds 2

Write-Host "Starting Angular Claims App (http://localhost:5173)..." -ForegroundColor Green
$angular = Start-Process -PassThru powershell -ArgumentList '-NoExit','-Command','npm install; npx ng serve --port 5173 --open' -WorkingDirectory (Resolve-Path "$PSScriptRoot/../examples/claims-angular")

Write-Host "Platform PID: $($platform.Id)" -ForegroundColor Yellow
Write-Host ".NET API PID: $($dotnet.Id)" -ForegroundColor Yellow
Write-Host "Angular PID: $($angular.Id)" -ForegroundColor Yellow
Write-Host "Use Ctrl+C in each window to stop." -ForegroundColor Cyan

