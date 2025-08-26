# 🚀 Multi-Tenant SaaS Framework

A comprehensive multi-tenant SaaS platform with admin portal, tenant management, and real-time monitoring.

## ✨ Features

- **🏢 Multi-Tenant Architecture**: Complete tenant isolation and management
- **👥 RBAC System**: Role-based access control with custom roles
- **📧 Email Notifications**: Automated onboarding and notification system
- **📊 Real-time Monitoring**: Performance metrics and alerting
- **🔐 Authentication**: JWT-based auth with OAuth integration (Azure AD, Auth0)
- **📱 Modern UI**: React + TypeScript with shadcn/ui components
- **🛡️ Security**: Rate limiting, input validation, and security headers

## 🚀 Quick Start

### Prerequisites

- Node.js 20+ and npm
- PostgreSQL database
- SMTP email service (Gmail, Office365, or SendGrid)

### 1. Environment Setup

```bash
# Clone the repository
git clone <your-repo-url>
cd UpdatedSaaSFramework-1

# Install dependencies
npm install

# Copy environment template
cp .env.example .env
```

### 2. Configure Environment Variables

Edit `.env` file with your settings:

```bash
# Database (Required)
DATABASE_URL=postgresql://username:password@localhost:5432/saas_framework

# JWT Secret (Required)
JWT_SECRET=your-super-secure-random-string-here

# Email Configuration (Required for notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password
FROM_EMAIL=your-email@gmail.com
FROM_NAME=Your SaaS Platform

# Optional: OAuth Configuration
AZURE_AD_CLIENT_ID=your-azure-client-id
AZURE_AD_CLIENT_SECRET=your-azure-client-secret
AZURE_AD_TENANT_ID=your-azure-tenant-id
```

### 3. Database Setup

```bash
# Push database schema
npm run db:push

# Optional: Seed sample data
npm run db:seed
```

### 4. Start Development Server

```bash
npm run dev
```

Visit:
- **Admin Portal**: http://localhost:5000
- **Health Check**: http://localhost:5000/api/health

## 📖 Development Guide

### Project Structure

```
UpdatedSaaSFramework-1/
├── client/               # React frontend
│   ├── src/
│   │   ├── components/  # Reusable UI components
│   │   ├── pages/       # Application pages
│   │   ├── hooks/       # Custom React hooks
│   │   └── lib/         # Utilities and API client
├── server/              # Express.js backend
│   ├── services/        # Business logic services
│   ├── middleware/      # Express middleware
│   └── routes.ts        # API routes
├── shared/              # Shared types and schemas
└── packages/            # NPM packages for external use
```

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run check        # TypeScript type checking
npm run db:push      # Update database schema
npm run db:seed      # Seed development data
npm run test         # Run tests (when implemented)
npm run lint         # Lint code (when implemented)
```

### Creating Your First Tenant

1. Start the development server
2. Go to http://localhost:5000
3. Click "Add New Tenant"
4. Fill in the onboarding form
5. Check your email for tenant credentials
6. Access tenant portal at the provided URL

## 🎯 Core Concepts

### Multi-Tenancy
- Each tenant has isolated data using `tenantId` partitioning
- Tenants have separate authentication and RBAC API keys
- Complete data isolation and security

### RBAC System
- **Platform Admin**: Manages all tenants and system configuration
- **Tenant Admin**: Manages users and roles within their tenant
- **Custom Roles**: Tenants can create custom roles with specific permissions
- **Industry-Specific**: Banking, insurance, healthcare role templates

### Authentication Flow
- JWT-based authentication with refresh tokens
- OAuth integration (Azure AD, Auth0)
- Multi-tenant session management
- API key authentication for external integrations

## 🔧 Configuration

### Email Setup

For Gmail:
1. Enable 2FA on your Google account
2. Generate an App Password: https://myaccount.google.com/apppasswords
3. Use the App Password as `SMTP_PASSWORD`

For Office365:
1. Use your email as `SMTP_USERNAME`
2. Generate App Password in security settings
3. Set `SMTP_HOST=smtp.office365.com`

### Database Configuration

PostgreSQL connection string format:
```
DATABASE_URL=postgresql://username:password@hostname:port/database
```

For local development:
```bash
# Install PostgreSQL
# Create database
createdb saas_framework

# Update .env with local connection
DATABASE_URL=postgresql://postgres:password@localhost:5432/saas_framework
```

## 📚 API Documentation

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout  
- `GET /api/auth/me` - Get current user

### Tenant Management
- `GET /api/tenants` - List all tenants
- `POST /api/tenants` - Create new tenant
- `GET /api/tenants/:id` - Get tenant details
- `PATCH /api/tenants/:id/status` - Update tenant status

### User Management
- `GET /api/tenants/:tenantId/users` - List tenant users
- `POST /api/tenants/:tenantId/users` - Create user
- `POST /api/tenants/:tenantId/users/:userId/roles` - Assign role

### RBAC Management
- `GET /api/tenants/:tenantId/roles` - List tenant roles
- `POST /api/tenants/:tenantId/roles` - Create custom role
- `PATCH /api/tenants/:tenantId/roles/:roleId` - Update role
- `DELETE /api/tenants/:tenantId/roles/:roleId` - Delete role

## 🧪 Testing

### Manual Testing
Use the included test interfaces:
- `test-onboarding-ui.html` - Interactive tenant creation testing
- `user-role-test-interface.html` - User and role management testing

### API Testing
```bash
# Test health endpoint
curl http://localhost:5000/api/health

# Test tenant creation
curl -X POST http://localhost:5000/api/tenants \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Corp","orgId":"test-corp","adminEmail":"admin@test.com"}'
```

## 🚀 Deployment

### Development
- Uses Vite for hot reloading
- Runs on port 5000 by default
- Includes development middleware and logging

### Production
- Build with `npm run build`
- Serves static files and API
- Requires environment variables and database setup

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Troubleshooting

### Common Issues

**"Database connection failed"**
- Check your `DATABASE_URL` is correct
- Ensure PostgreSQL is running
- Verify database exists

**"Email sending failed"**
- Verify SMTP credentials
- Check app password generation
- Test with a simple email service

**"Port already in use"**
- Check if another service is using port 5000
- Kill the process: `lsof -ti:5000 | xargs kill`
- Or change PORT in .env file

**"Module not found" errors**
- Run `npm install` to install dependencies
- Check Node.js version is 20+
- Clear node_modules and reinstall

### Getting Help

- Check the [Issues](../../issues) for common problems
- Review the test files for usage examples
- Check server logs for detailed error messages

---

**Built with ❤️ for modern multi-tenant applications**
