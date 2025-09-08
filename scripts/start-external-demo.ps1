$ErrorActionPreference = "Stop"

Write-Host "Building SDK packages (auth-client, auth, logging, rbac)..."
Push-Location "$PSScriptRoot/../packages/auth-client"
npm install | Out-Null
npm run build | Out-Null
Pop-Location

Push-Location "$PSScriptRoot/../packages/auth"
npm install | Out-Null
npm run build | Out-Null
Pop-Location

Push-Location "$PSScriptRoot/../packages/logging"
npm install | Out-Null
npm run build | Out-Null
Pop-Location

Push-Location "$PSScriptRoot/../packages/rbac"
npm install | Out-Null
npm run build | Out-Null
Pop-Location

Write-Host "Starting Platform server (http://localhost:5000)..."
$platform = Start-Process -PassThru pwsh -ArgumentList '-NoExit','-Command','npm run dev' -WorkingDirectory (Resolve-Path "$PSScriptRoot/..")

Start-Sleep -Seconds 2

Write-Host "Starting External Demo (http://localhost:5173)..."
$demo = Start-Process -PassThru pwsh -ArgumentList '-NoExit','-Command','npm run dev' -WorkingDirectory (Resolve-Path "$PSScriptRoot/../examples/external-app")

Start-Sleep -Seconds 2

Write-Host "Opening browser to http://localhost:5173"
Start-Process "http://localhost:5173"

Write-Host "Platform PID: $($platform.Id)"
Write-Host "External Demo PID: $($demo.Id)"
Write-Host "Both windows were launched. Use Ctrl+C in those windows to stop."
