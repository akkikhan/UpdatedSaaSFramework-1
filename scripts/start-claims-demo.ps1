$ErrorActionPreference = "Stop"

Write-Host "Building SDK packages (auth-client, auth, logging, rbac)..." -ForegroundColor Cyan
Push-Location "$PSScriptRoot/../packages/auth-client"; npm install | Out-Null; npm run build | Out-Null; Pop-Location
Push-Location "$PSScriptRoot/../packages/auth"; npm install | Out-Null; npm run build | Out-Null; Pop-Location
Push-Location "$PSScriptRoot/../packages/logging"; npm install | Out-Null; npm run build | Out-Null; Pop-Location
Push-Location "$PSScriptRoot/../packages/rbac"; npm install | Out-Null; npm run build | Out-Null; Pop-Location

Write-Host "Starting Platform server (http://localhost:5000)..." -ForegroundColor Green
$platform = Start-Process -PassThru pwsh -ArgumentList '-NoExit','-Command','npm run dev' -WorkingDirectory (Resolve-Path "$PSScriptRoot/..")

Start-Sleep -Seconds 2

Write-Host "Starting .NET Claims API (http://localhost:5299)..." -ForegroundColor Green
$dotnet = Start-Process -PassThru pwsh -ArgumentList '-NoExit','-Command','dotnet run --urls http://localhost:5299' -WorkingDirectory (Resolve-Path "$PSScriptRoot/../examples/claims-dotnet")

Start-Sleep -Seconds 2

Write-Host "Starting Angular Claims App (http://localhost:5173)..." -ForegroundColor Green
$angular = Start-Process -PassThru pwsh -ArgumentList '-NoExit','-Command','npm install; npx ng serve --port 5173 --open' -WorkingDirectory (Resolve-Path "$PSScriptRoot/../examples/claims-angular")

Write-Host "Platform PID: $($platform.Id)" -ForegroundColor Yellow
Write-Host ".NET API PID: $($dotnet.Id)" -ForegroundColor Yellow
Write-Host "Angular PID: $($angular.Id)" -ForegroundColor Yellow
Write-Host "Use Ctrl+C in each window to stop." -ForegroundColor Cyan

