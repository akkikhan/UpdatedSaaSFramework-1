@echo off
echo Testing npm authentication...
npm whoami

echo.
echo Publishing @saas-framework/auth...
cd packages\auth
npm publish --access public

echo.
echo Done! Check if published:
npm view @saas-framework/auth
