@echo off
cd /d "C:\Users\Akki\Downloads\Updated Primus\UpdatedSaaSFramework-1"

echo === Checking Git Status ===
git status --porcelain

echo.
echo === Current Branch ===
git branch --show-current

echo.
echo === Cleaning build artifacts ===
git clean -fd examples/claims-angular/.angular/
git clean -fd examples/claims-dotnet/bin/
git checkout -- examples/

echo.
echo === Adding important files ===
git add GIT_PUSH_INSTRUCTIONS.md
git add *.ps1 *.bat *.sh
git add tmp_overview.txt

echo.
echo === Checking what will be committed ===
git status --cached

echo.
echo === Committing changes ===
git commit --no-verify -m "Final touchup: Added git push scripts and manual edits documentation"

echo.
echo === Pushing to GitHub ===
git push origin final-touchup

echo.
echo === Complete! ===
pause
