#!/bin/bash

# Docker Development Helper Script
# Provides easy commands for Docker-based development

set -e

COMPOSE_FILE="docker-compose.yml"
PROJECT_NAME="saas-framework"

case "${1:-help}" in
  "start")
    echo "🚀 Starting development environment..."
    docker-compose -f $COMPOSE_FILE -p $PROJECT_NAME up -d
    echo "✅ Development environment started!"
    echo ""
    echo "📋 Available services:"
    echo "  • Application: http://localhost:5000"
    echo "  • Database: postgresql://postgres:password@localhost:5432/saas_framework"
    echo "  • MailHog: http://localhost:8025 (Email testing)"
    echo "  • PgAdmin: http://localhost:8080 (admin@localhost / admin)"
    echo "  • Redis: localhost:6379"
    ;;

  "stop")
    echo "🛑 Stopping development environment..."
    docker-compose -f $COMPOSE_FILE -p $PROJECT_NAME down
    echo "✅ Development environment stopped!"
    ;;

  "restart")
    echo "🔄 Restarting development environment..."
    docker-compose -f $COMPOSE_FILE -p $PROJECT_NAME restart
    echo "✅ Development environment restarted!"
    ;;

  "logs")
    echo "📋 Showing logs for ${2:-all services}..."
    if [ -n "$2" ]; then
      docker-compose -f $COMPOSE_FILE -p $PROJECT_NAME logs -f "$2"
    else
      docker-compose -f $COMPOSE_FILE -p $PROJECT_NAME logs -f
    fi
    ;;

  "status")
    echo "📊 Development environment status:"
    docker-compose -f $COMPOSE_FILE -p $PROJECT_NAME ps
    ;;

  "shell")
    SERVICE=${2:-app}
    echo "🐚 Opening shell in $SERVICE container..."
    docker-compose -f $COMPOSE_FILE -p $PROJECT_NAME exec $SERVICE sh
    ;;

  "db")
    echo "🗄️ Connecting to PostgreSQL database..."
    docker-compose -f $COMPOSE_FILE -p $PROJECT_NAME exec postgres psql -U postgres -d saas_framework
    ;;

  "redis-cli")
    echo "📮 Opening Redis CLI..."
    docker-compose -f $COMPOSE_FILE -p $PROJECT_NAME exec redis redis-cli
    ;;

  "clean")
    echo "🧹 Cleaning up development environment..."
    echo "⚠️  This will remove all containers, volumes, and data!"
    read -p "Are you sure? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
      docker-compose -f $COMPOSE_FILE -p $PROJECT_NAME down -v --remove-orphans
      docker system prune -f
      echo "✅ Environment cleaned!"
    else
      echo "❌ Cleanup cancelled."
    fi
    ;;

  "build")
    echo "🔨 Building application container..."
    docker-compose -f $COMPOSE_FILE -p $PROJECT_NAME build --no-cache app
    echo "✅ Build complete!"
    ;;

  "seed")
    echo "🌱 Seeding development data..."
    docker-compose -f $COMPOSE_FILE -p $PROJECT_NAME exec app npm run db:seed
    echo "✅ Data seeded!"
    ;;

  "migrate")
    echo "📊 Running database migrations..."
    docker-compose -f $COMPOSE_FILE -p $PROJECT_NAME exec app npm run db:push
    echo "✅ Migrations complete!"
    ;;

  "test")
    echo "🧪 Running tests..."
    docker-compose -f $COMPOSE_FILE -p $PROJECT_NAME exec app npm run test
    ;;

  "help"|*)
    echo "🐳 Docker Development Helper"
    echo "=============================="
    echo ""
    echo "Usage: $0 <command>"
    echo ""
    echo "Commands:"
    echo "  start       Start the development environment"
    echo "  stop        Stop the development environment"
    echo "  restart     Restart all services"
    echo "  logs [svc]  Show logs (optionally for specific service)"
    echo "  status      Show container status"
    echo "  shell [svc] Open shell in container (default: app)"
    echo "  db          Connect to PostgreSQL database"
    echo "  redis-cli   Open Redis CLI"
    echo "  build       Rebuild the application container"
    echo "  migrate     Run database migrations"
    echo "  seed        Seed development data"
    echo "  test        Run tests in container"
    echo "  clean       Remove all containers and volumes"
    echo "  help        Show this help"
    echo ""
    echo "Examples:"
    echo "  $0 start                 # Start development environment"
    echo "  $0 logs app              # Show application logs"
    echo "  $0 shell postgres        # Open shell in postgres container"
    echo "  $0 db                    # Connect to database"
    ;;
esac
