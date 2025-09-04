@echo off
echo ================================================
echo 🚀 Tenant Portal Quick Start
echo ================================================
echo.

REM Check if Node.js is installed
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js first.
    pause
    exit /b 1
)

for /f "delims=" %%i in ('node --version') do set NODE_VERSION=%%i
echo ✅ Node.js found: %NODE_VERSION%
echo.

REM Check if dependencies are installed
if not exist "node_modules" (
    echo 📦 Installing dependencies...
    call npm install
    if %errorlevel% neq 0 (
        echo ❌ Failed to install dependencies
        pause
        exit /b 1
    )
    echo ✅ Dependencies installed
) else (
    echo ✅ Dependencies already installed
)
echo.

REM Check database connection
echo 🔍 Checking database connection...
call npm run db:push 2>nul
if %errorlevel% equ 0 (
    echo ✅ Database connection successful
) else (
    echo ⚠️  Database connection might have issues, but continuing...
)
echo.

REM Display information
echo ================================================
echo 📝 TENANT PORTAL INFORMATION
echo ================================================
echo.
echo Server URL: http://localhost:5000
echo.
echo Test Pages:
echo   - Test Portal: http://localhost:5000/test-tenant-portal.html
echo   - Admin Login: http://localhost:5000/admin/login
echo.
echo Example Tenant Portals:
echo   - http://localhost:5000/tenant/test-company/login
echo   - http://localhost:5000/tenant/acme/login
echo   - http://localhost:5000/tenant/demo/login
echo.
echo Default Test Credentials:
echo   Email: admin@test.com
echo   Password: TestPassword123!
echo.
echo ================================================
echo Starting server... Press Ctrl+C to stop
echo ================================================
echo.

REM Start the dev server
call npm run dev
