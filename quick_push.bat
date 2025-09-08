@echo off
echo Navigating to project directory...
cd /d "C:\Users\Akki\Downloads\Updated Primus\UpdatedSaaSFramework-1"

echo.
echo Current directory: %CD%

echo.
echo Checking git status...
git status

echo.
echo Staging important files...
git add client/src/pages/tenant-dashboard.tsx
git add client/src/pages/admin-dashboard.tsx
git add client/src/pages/sdk-integration.tsx
git add client/src/pages/tenants.tsx
git add server/routes.ts
git add AZURE_SETUP_SUMMARY.md
git add INTEGRATION_GUIDE.md

echo.
echo Committing changes...
git commit --no-verify -m "Final touchup: Manual edits and UI improvements"

echo.
echo Pushing to GitHub...
git push origin final-touchup

echo.
echo Done! Press any key to exit...
pause
