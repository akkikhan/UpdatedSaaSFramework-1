# 🛠️ Development Guide

## Quick Start

### 1. Prerequisites
- Node.js 20+
- PostgreSQL 12+
- Git

### 2. Setup
```bash
# Clone and install
git clone <repo-url>
cd UpdatedSaaSFramework-1
npm install

# Environment setup
cp env.example .env
# Edit .env with your database and email settings

# Database setup
npm run db:push
npm run db:seed

# Start development server
npm run dev
```

### 3. Access Points
- **Admin Portal**: http://localhost:5000
- **API Health**: http://localhost:5000/api/health
- **Sample Tenant**: http://localhost:5000/tenant/demo-corp

## Development Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Start development server with hot reload |
| `npm run dev:debug` | Start with debug logging enabled |
| `npm run db:push` | Update database schema |
| `npm run db:seed` | Seed development data |
| `npm run setup` | Full setup (install + db + seed) |
| `npm run health` | Check if server is running |
| `npm run clean` | Clean build artifacts |
| `npm run reset` | Clean and reinstall everything |

## Environment Configuration

### Required Variables
```bash
# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/saas_framework

# JWT Secret (generate with: openssl rand -base64 32)
JWT_SECRET=your-random-secret-here

# Email (for notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password
FROM_EMAIL=your-email@gmail.com
FROM_NAME=Your Platform
```

### Email Setup
For Gmail:
1. Enable 2FA
2. Generate App Password: https://myaccount.google.com/apppasswords
3. Use App Password as `SMTP_PASSWORD`

## Project Structure

```
UpdatedSaaSFramework-1/
├── client/                 # React frontend
│   ├── src/components/    # Reusable UI components
│   ├── src/pages/         # Application pages
│   ├── src/hooks/         # Custom React hooks
│   └── src/lib/           # Utilities and API client
├── server/                # Express.js backend
│   ├── services/          # Business logic services
│   ├── middleware/        # Express middleware
│   └── routes.ts          # API routes
├── shared/                # Shared types and schemas
├── packages/              # NPM packages for external use
└── scripts/               # Development and deployment scripts
```

## Database

### Schema Management
- Uses Drizzle ORM with PostgreSQL
- Schema defined in `shared/schema.ts`
- Migrations via `npm run db:push`

### Development Data
- Run `npm run db:seed` to create sample tenants and users
- Creates demo tenant: `demo-corp` with admin@demo-corp.local
- Creates banking and insurance example tenants

## API Development

### Authentication
All API endpoints require authentication except:
- `GET /api/health`
- `POST /api/auth/login`
- OAuth callback endpoints

### RBAC Integration
- Permissions are tenant-specific
- Custom roles can be created per tenant
- Industry-specific permission templates (banking, insurance)

### Testing APIs
Use built-in test interfaces:
- `test-onboarding-ui.html` - Tenant creation testing
- `user-role-test-interface.html` - User/role management
- `curl` commands for API testing

## Frontend Development

### Tech Stack
- React 18 + TypeScript
- Vite for build/dev server
- shadcn/ui components
- TanStack Query for data fetching
- Wouter for routing

### Development Features
- Hot reload enabled
- TypeScript strict mode
- Tailwind CSS for styling
- Component-based architecture

## Common Development Tasks

### Adding New API Endpoints
1. Add route to `server/routes.ts`
2. Add corresponding service logic
3. Update types in `shared/schema.ts`
4. Test with curl or test interfaces

### Adding New UI Components
1. Create component in `client/src/components/`
2. Use shadcn/ui patterns
3. Add TypeScript types
4. Integrate with React Query for data

### Database Schema Changes
1. Update `shared/schema.ts`
2. Run `npm run db:push`
3. Update seed data if needed
4. Test with existing data

## Debugging

### Server Debugging
```bash
# Enable debug logging
npm run dev:debug

# Check logs
npm run logs

# Health check
npm run health
```

### Database Debugging
```bash
# Check connection
psql $DATABASE_URL -c "SELECT 1"

# View tables
psql $DATABASE_URL -c "\dt"

# Check tenant data
psql $DATABASE_URL -c "SELECT * FROM tenants"
```

### Email Debugging
- Check SMTP credentials in `.env`
- Test email service in tenant creation
- Verify app password for Gmail/Office365

## Performance Monitoring

### Built-in Monitoring
- Request timing logged automatically
- Performance metrics stored in database
- Alert system for response times and errors

### Development Metrics
- Check `GET /api/health` for system status
- Monitor API response times in logs
- Database query performance via Drizzle logs

## Security in Development

### Authentication
- JWT tokens with configurable expiry
- Bcrypt password hashing
- Session management in database

### Rate Limiting
- Configured but can be disabled in development
- Set `DISABLE_RATE_LIMITING=true` in `.env`

### CORS
- Configured for development (localhost)
- Update for production deployment

## Troubleshooting

### Common Issues

**Database Connection Errors**
- Check PostgreSQL is running
- Verify `DATABASE_URL` format
- Ensure database exists

**Email Not Sending**
- Verify SMTP credentials
- Check app password configuration
- Test with simple email service

**Port Already in Use**
- Check for existing Node processes
- Kill process: `lsof -ti:5000 | xargs kill`
- Change PORT in `.env`

**Module Not Found**
- Run `npm install`
- Check Node.js version (20+)
- Clear node_modules and reinstall

### Debug Commands
```bash
# Full system reset
npm run reset
npm run setup

# Check all services
npm run health
curl http://localhost:5000/api/health

# Database connectivity
psql $DATABASE_URL -c "SELECT version()"

# Email test (if configured)
curl -X POST http://localhost:5000/api/test-email
```

## Contributing

1. Create feature branch from main
2. Make changes with proper TypeScript types
3. Test locally with `npm run dev`
4. Ensure `npm run check` passes
5. Submit pull request

## Next Steps

1. Review the main README.md for overall project info
2. Check OAUTH_CONFIGURATION.md for OAuth setup
3. See test files for usage examples
4. Explore the admin portal and tenant interfaces
