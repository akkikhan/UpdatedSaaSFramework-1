# 🐳 Docker Development Guide

## Quick Start with Docker

### Prerequisites
- Docker Desktop installed
- Docker Compose available

### One-Command Setup

```bash
# Start everything
npm run docker:start

# Or manually (Linux/Mac)
./scripts/docker-dev.sh start

# Or manually (Windows)
scripts\docker-dev.bat start
```

## Available Services

Once started, you'll have access to:

| Service | URL | Credentials |
|---------|-----|-------------|
| **Main Application** | http://localhost:5000 | N/A |
| **MailHog (Email Testing)** | http://localhost:8025 | N/A |
| **PgAdmin (Database UI)** | http://localhost:8080 | admin@localhost / admin |
| **PostgreSQL** | localhost:5432 | postgres / password |
| **Redis** | localhost:6379 | No auth |

## Docker Commands

### Basic Operations
```bash
# Start development environment
npm run docker:start

# Stop everything
npm run docker:stop

# View logs
npm run docker:logs

# Check status
scripts/docker-dev.sh status

# Restart services
scripts/docker-dev.sh restart
```

### Development Workflow
```bash
# Open shell in app container
scripts/docker-dev.sh shell

# Connect to database
scripts/docker-dev.sh db

# Run database migrations
scripts/docker-dev.sh migrate

# Seed development data
scripts/docker-dev.sh seed

# Run tests in container
scripts/docker-dev.sh test
```

### Advanced Operations
```bash
# Rebuild app container
scripts/docker-dev.sh build

# Clean everything (removes data!)
scripts/docker-dev.sh clean

# View specific service logs
scripts/docker-dev.sh logs app
scripts/docker-dev.sh logs postgres
```

## Development Benefits

### 🎯 **Advantages**
- **Consistent Environment**: Same setup across all developers
- **Isolated Dependencies**: No conflicts with local installations
- **Easy Setup**: One command to start everything
- **Service Integration**: All services pre-configured and connected
- **Email Testing**: MailHog for testing email functionality
- **Database Management**: PgAdmin for visual database operations

### 🔧 **Development Features**
- **Hot Reload**: Code changes reflected immediately
- **Volume Mounting**: Local files synced with container
- **Port Forwarding**: All services accessible on localhost
- **Health Checks**: Automatic service health monitoring
- **Logging**: Centralized log viewing

## Configuration

### Environment Variables
Docker Compose automatically sets development-friendly defaults:

```yaml
- NODE_ENV=development
- DATABASE_URL=postgresql://postgres:password@postgres:5432/saas_framework
- JWT_SECRET=development-jwt-secret-change-in-production
- SMTP_HOST=mailhog
- SMTP_PORT=1025
- FROM_EMAIL=noreply@localhost
- REDIS_URL=redis://redis:6379
```

### Persistent Data
Docker volumes ensure data persists between container restarts:
- `postgres_data`: PostgreSQL database files
- `redis_data`: Redis data
- `pgadmin_data`: PgAdmin configuration

## Production Deployment

### Production Docker Compose
```bash
# Use production configuration
docker-compose -f docker-compose.prod.yml up -d

# With environment file
docker-compose -f docker-compose.prod.yml --env-file .env.production up -d
```

### Environment Variables for Production
Create `.env.production`:
```bash
DB_USER=postgres
DB_PASSWORD=secure-password
DB_NAME=saas_framework
JWT_SECRET=production-jwt-secret
SMTP_HOST=smtp.production.com
SMTP_USERNAME=user@production.com
SMTP_PASSWORD=smtp-password
FROM_EMAIL=noreply@yourplatform.com
REDIS_PASSWORD=redis-password
ADMIN_EMAIL=admin@yourplatform.com
PLATFORM_NAME=Your SaaS Platform
PLATFORM_URL=https://yourplatform.com
```

## Troubleshooting

### Common Issues

**Port Already in Use**
```bash
# Check what's using the port
netstat -ano | findstr :5000  # Windows
lsof -i :5000                 # Linux/Mac

# Stop conflicting services
npm run docker:stop
```

**Container Build Failures**
```bash
# Clean build
scripts/docker-dev.sh build

# Reset everything
scripts/docker-dev.sh clean
scripts/docker-dev.sh start
```

**Database Connection Issues**
```bash
# Check PostgreSQL status
scripts/docker-dev.sh status

# View database logs
scripts/docker-dev.sh logs postgres

# Connect manually
scripts/docker-dev.sh db
```

**Email Not Working**
- Check MailHog UI: http://localhost:8025
- View application logs: `scripts/docker-dev.sh logs app`
- Verify SMTP configuration in Docker Compose

### Performance Tips

**On Windows**
- Use WSL2 backend for better performance
- Ensure Docker Desktop has enough memory (4GB+)

**On Mac**
- Use Docker Desktop with VirtioFS file sharing
- Allocate sufficient CPU cores

**General**
- Use `.dockerignore` to exclude unnecessary files
- Keep containers running to avoid startup time
- Use volume mounts for development

## Docker Compose Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Application   │    │   PostgreSQL     │    │     Redis       │
│   (Node.js)     │◄──►│   Database       │    │    (Cache)      │
│   Port: 5000    │    │   Port: 5432     │    │   Port: 6379    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                        │                        │
         │              ┌──────────────────┐               │
         │              │     MailHog      │               │
         └─────────────►│ (Email Testing)  │◄──────────────┘
                        │   Port: 1025     │
                        │   UI: 8025       │
                        └──────────────────┘
                                 │
                        ┌──────────────────┐
                        │     PgAdmin      │
                        │ (Database UI)    │
                        │   Port: 8080     │
                        └──────────────────┘
```

## Best Practices

### Development
- Use Docker for consistent development environment
- Keep containers running during development
- Use volume mounts for real-time code changes
- Monitor logs for debugging

### Production
- Use multi-stage builds for smaller images
- Set proper environment variables
- Use secrets for sensitive data
- Implement health checks
- Configure restart policies

### Security
- Don't use default passwords in production
- Use Docker secrets for sensitive data
- Regularly update base images
- Scan images for vulnerabilities

---

**Docker makes development consistent, predictable, and productive!** 🐳
