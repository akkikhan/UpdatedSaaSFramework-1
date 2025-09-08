@echo off
setlocal enableextensions enabledelayedexpansion

echo Building SDK packages (auth-client, auth)...
pushd %~dp0\..\packages\auth-client
call npm install >nul
call npm run build >nul
popd

pushd %~dp0\..\packages\auth
call npm install >nul
call npm run build >nul
popd

echo Starting Platform server (http://localhost:5000)...
start "SaaS Platform" cmd /k "npm run dev"
timeout /t 2 >nul

echo Starting External Demo (http://localhost:5173)...
pushd %~dp0\..\examples\external-app
start "External Demo" cmd /k "npm run dev"
popd

timeout /t 2 >nul
start http://localhost:5173

echo Launched platform and demo in new terminals. Close those windows to stop.
exit /b 0

