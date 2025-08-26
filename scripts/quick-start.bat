@echo off
REM =============================================================================
REM SAAS FRAMEWORK - QUICK START SCRIPT (WINDOWS)
REM =============================================================================
REM This script helps new developers get up and running quickly on Windows

echo 🚀 SaaS Framework - Quick Start Setup
echo ======================================

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js is not installed
    echo Please install Node.js 20+ from https://nodejs.org
    pause
    exit /b 1
)

echo ✅ Node.js detected
node --version

REM Check if PostgreSQL is available
psql --version >nul 2>&1
if errorlevel 1 (
    echo ⚠️  PostgreSQL not found in PATH
    echo You'll need to install PostgreSQL or use a cloud database
) else (
    echo ✅ PostgreSQL detected
)

REM Install dependencies
echo.
echo 📦 Installing dependencies...
call npm install
if errorlevel 1 (
    echo ❌ Failed to install dependencies
    pause
    exit /b 1
)

REM Check if .env exists
if not exist .env (
    echo.
    echo 📝 Setting up environment configuration...
    if exist env.example (
        copy env.example .env >nul
        echo ✅ Environment template copied to .env
        echo.
        echo ⚠️  IMPORTANT: You need to edit .env with your settings:
        echo    - DATABASE_URL ^(PostgreSQL connection^)
        echo    - JWT_SECRET ^(generate with: openssl rand -base64 32^)
        echo    - SMTP settings ^(for email notifications^)
        echo.
        echo 📋 Required environment variables:
        echo    DATABASE_URL=postgresql://user:pass@localhost:5432/dbname
        echo    JWT_SECRET=your-secure-random-secret
        echo    SMTP_HOST=smtp.gmail.com
        echo    SMTP_USERNAME=your-email@gmail.com
        echo    SMTP_PASSWORD=your-app-password
        echo    FROM_EMAIL=your-email@gmail.com
    ) else (
        echo ❌ env.example template not found
        echo Creating basic .env file...
        
        REM Create basic .env file
        (
            echo # Database Configuration ^(REQUIRED^)
            echo DATABASE_URL=postgresql://postgres:password@localhost:5432/saas_framework
            echo.
            echo # JWT Secret ^(REQUIRED^) - Please change this
            echo JWT_SECRET=CHANGE-THIS-TO-A-SECURE-RANDOM-STRING-MIN-32-CHARS
            echo.
            echo # Email Configuration ^(REQUIRED for notifications^)
            echo SMTP_HOST=smtp.gmail.com
            echo SMTP_PORT=587
            echo SMTP_USERNAME=your-email@gmail.com
            echo SMTP_PASSWORD=your-app-password
            echo FROM_EMAIL=your-email@gmail.com
            echo FROM_NAME=Your SaaS Platform
            echo.
            echo # Server Configuration
            echo PORT=5000
            echo NODE_ENV=development
        ) > .env
        echo ✅ Basic .env file created
    )
) else (
    echo ✅ Environment file ^(.env^) already exists
)

echo.
echo 🔍 Validating setup...
call npm run validate

echo.
echo 🎉 Quick start complete!
echo.
echo 📋 Next steps:
echo    1. Edit .env with your database and email settings
echo    2. npm run validate    # Verify your configuration
echo    3. npm run setup       # Setup database and seed data
echo    4. npm run dev         # Start development server
echo.
echo 📚 Helpful resources:
echo    • README.md - Complete setup guide
echo    • DEVELOPMENT.md - Development workflow
echo    • env.example - Environment variable reference
echo.
echo 🆘 Need help?
echo    • Database setup: https://www.postgresql.org/download/
echo    • Gmail app passwords: https://myaccount.google.com/apppasswords
echo    • JWT secret generator: Use online generator or crypto.randomBytes
echo.
echo ✨ Happy coding!
echo.
pause
