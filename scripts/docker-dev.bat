@echo off
REM Docker Development Helper Script (Windows)
REM Provides easy commands for Docker-based development

set COMPOSE_FILE=docker-compose.yml
set PROJECT_NAME=saas-framework

if "%1"=="start" goto start
if "%1"=="stop" goto stop
if "%1"=="restart" goto restart
if "%1"=="logs" goto logs
if "%1"=="status" goto status
if "%1"=="shell" goto shell
if "%1"=="db" goto db
if "%1"=="redis-cli" goto redis-cli
if "%1"=="clean" goto clean
if "%1"=="build" goto build
if "%1"=="seed" goto seed
if "%1"=="migrate" goto migrate
if "%1"=="test" goto test
if "%1"=="help" goto help
goto help

:start
echo 🚀 Starting development environment...
docker-compose -f %COMPOSE_FILE% -p %PROJECT_NAME% up -d
echo ✅ Development environment started!
echo.
echo 📋 Available services:
echo   • Application: http://localhost:5000
echo   • Database: postgresql://postgres:password@localhost:5432/saas_framework
echo   • MailHog: http://localhost:8025 ^(Email testing^)
echo   • PgAdmin: http://localhost:8080 ^(admin@localhost / admin^)
echo   • Redis: localhost:6379
goto end

:stop
echo 🛑 Stopping development environment...
docker-compose -f %COMPOSE_FILE% -p %PROJECT_NAME% down
echo ✅ Development environment stopped!
goto end

:restart
echo 🔄 Restarting development environment...
docker-compose -f %COMPOSE_FILE% -p %PROJECT_NAME% restart
echo ✅ Development environment restarted!
goto end

:logs
set SERVICE=%2
if "%SERVICE%"=="" set SERVICE=
echo 📋 Showing logs...
if "%SERVICE%"=="" (
    docker-compose -f %COMPOSE_FILE% -p %PROJECT_NAME% logs -f
) else (
    docker-compose -f %COMPOSE_FILE% -p %PROJECT_NAME% logs -f %SERVICE%
)
goto end

:status
echo 📊 Development environment status:
docker-compose -f %COMPOSE_FILE% -p %PROJECT_NAME% ps
goto end

:shell
set SERVICE=%2
if "%SERVICE%"=="" set SERVICE=app
echo 🐚 Opening shell in %SERVICE% container...
docker-compose -f %COMPOSE_FILE% -p %PROJECT_NAME% exec %SERVICE% sh
goto end

:db
echo 🗄️ Connecting to PostgreSQL database...
docker-compose -f %COMPOSE_FILE% -p %PROJECT_NAME% exec postgres psql -U postgres -d saas_framework
goto end

:redis-cli
echo 📮 Opening Redis CLI...
docker-compose -f %COMPOSE_FILE% -p %PROJECT_NAME% exec redis redis-cli
goto end

:clean
echo 🧹 Cleaning up development environment...
echo ⚠️  This will remove all containers, volumes, and data!
set /p CONFIRM=Are you sure? ^(y/N^): 
if /i "%CONFIRM%"=="y" (
    docker-compose -f %COMPOSE_FILE% -p %PROJECT_NAME% down -v --remove-orphans
    docker system prune -f
    echo ✅ Environment cleaned!
) else (
    echo ❌ Cleanup cancelled.
)
goto end

:build
echo 🔨 Building application container...
docker-compose -f %COMPOSE_FILE% -p %PROJECT_NAME% build --no-cache app
echo ✅ Build complete!
goto end

:seed
echo 🌱 Seeding development data...
docker-compose -f %COMPOSE_FILE% -p %PROJECT_NAME% exec app npm run db:seed
echo ✅ Data seeded!
goto end

:migrate
echo 📊 Running database migrations...
docker-compose -f %COMPOSE_FILE% -p %PROJECT_NAME% exec app npm run db:push
echo ✅ Migrations complete!
goto end

:test
echo 🧪 Running tests...
docker-compose -f %COMPOSE_FILE% -p %PROJECT_NAME% exec app npm run test
goto end

:help
echo 🐳 Docker Development Helper
echo ==============================
echo.
echo Usage: %0 ^<command^>
echo.
echo Commands:
echo   start       Start the development environment
echo   stop        Stop the development environment
echo   restart     Restart all services
echo   logs [svc]  Show logs ^(optionally for specific service^)
echo   status      Show container status
echo   shell [svc] Open shell in container ^(default: app^)
echo   db          Connect to PostgreSQL database
echo   redis-cli   Open Redis CLI
echo   build       Rebuild the application container
echo   migrate     Run database migrations
echo   seed        Seed development data
echo   test        Run tests in container
echo   clean       Remove all containers and volumes
echo   help        Show this help
echo.
echo Examples:
echo   %0 start                 # Start development environment
echo   %0 logs app              # Show application logs
echo   %0 shell postgres        # Open shell in postgres container
echo   %0 db                    # Connect to database
goto end

:end
echo.
