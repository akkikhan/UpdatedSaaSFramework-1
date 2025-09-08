@echo off
cd /d "C:\Users\Akki\Downloads\Updated Primus\UpdatedSaaSFramework-1"

echo Checking git status...
git status

echo.
echo Adding only important files (excluding build artifacts)...
git add *.md *.json *.ts *.tsx *.js *.jsx *.sql *.html *.txt --exclude=node_modules --exclude=dist --exclude=build
git add client/ server/ shared/ packages/ --exclude=node_modules --exclude=dist --exclude=build

echo.
echo Committing changes...
git commit --no-verify -m "Final touchup: Manual edits and improvements"

echo.
echo Pushing to final-touchup branch...
git push origin final-touchup

echo.
echo Done!
pause
