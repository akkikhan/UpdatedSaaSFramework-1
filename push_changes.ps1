Set-Location "C:\Users\Akki\Downloads\Updated Primus\UpdatedSaaSFramework-1"

Write-Host "Current directory:" -ForegroundColor Green
Get-Location

Write-Host "`nGit status:" -ForegroundColor Green
git status

Write-Host "`nStaging important changes..." -ForegroundColor Green
git add client/src/pages/tenant-dashboard.tsx
git add client/src/pages/admin-dashboard.tsx 
git add client/src/pages/sdk-integration.tsx
git add client/src/pages/tenants.tsx
git add server/routes.ts
git add AZURE_SETUP_SUMMARY.md
git add INTEGRATION_GUIDE.md

Write-Host "`nCommitting changes..." -ForegroundColor Green
git commit --no-verify -m "Final touchup: Manual edits and UI improvements"

Write-Host "`nPushing to GitHub..." -ForegroundColor Green
git push origin final-touchup

Write-Host "`nDone! Changes pushed to final-touchup branch." -ForegroundColor Green
