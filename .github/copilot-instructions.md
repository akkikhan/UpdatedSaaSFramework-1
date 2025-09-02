# Multi-Tenant SaaS Framework - AI Coding Agent Instructions

## Development Guidelines

### Port Management and Server Restart Policy

- **AVOID unnecessary port restarts**: Do not constantly stop/kill and restart
  ports unless absolutely required
- **Check existing services**: If a port is already serving the same service,
  avoid wasting time with unnecessary restarts
- **Hot reload when possible**: If changes can be reflected/tested without
  restarting (like frontend changes), do not restart the server
- **Restart only when needed**: Only restart when making backend configuration
  changes, package updates, or environment variable changes

### Code Generation Guidelines

- Provide clear project context before generating code
- Follow established patterns and conventions in the codebase
- Always consider multi-tenant data isolation when working with database
  operations
- Use existing utility functions and middleware rather than recreating
  functionality

## Architecture Overview

This is a **multi-tenant SaaS platform** with two distinct portals:

- **Platform Admin Portal**: Tenant management, system monitoring (`/admin`,
  `/tenants`)
- **Tenant Portal**: Per-tenant authentication and user management
  (`/tenant/:orgId/*`)

**Core Pattern**: Multi-tenant data isolation using `tenantId` partition keys
across all database operations. Each tenant gets unique API keys for auth and
RBAC services.

## Essential File Structure

```
├── server/                 # Express.js backend (TypeScript ES modules)
│   ├── routes.ts          # Main API routes with tenant isolation
│   ├── storage.ts         # Database layer with Drizzle ORM
│   └── services/          # Business logic (auth, email, azure-ad)
├── client/                # React frontend (Vite + TypeScript)
│   ├── src/pages/         # Route components (admin-dashboard, tenants, etc.)
│   └── src/components/    # Shared UI components (Radix UI + Tailwind)
├── shared/                # Shared types and schema
│   ├── schema.ts          # Drizzle database schema (core source of truth)
│   └── modules-config.ts  # Centralized module definitions
└── packages/              # Publishable NPM packages
    ├── auth/              # Authentication SDK
    └── rbac/              # Role-based access control SDK
```

## Development Workflow

### Server Development

- **Start**: `npm run dev` (runs Express + Vite dev server on port 5000)
- **Database**: `npm run db:push` (pushes schema changes via Drizzle)
- **Platform Admin Setup**: `npm run setup:platform-admin` (creates initial
  admin user)

### Testing Patterns

- **Integration Tests**: Use `test-onboarding-*.{js,mjs}` scripts for complete
  tenant lifecycle
- **UI Testing**: `test-onboarding-ui.html` provides interactive API testing
  interface
- **Jest**: `npm test` for unit tests with ES module configuration

### Package Development

- **Build All**: `npm run packages:build` (builds auth, rbac, email, logging
  packages)
- **Individual**: `cd packages/auth && npm run build`
- **Publishing**: Each package has `npm run publish-package` script

## Critical Patterns

### Database Schema (shared/schema.ts)

- **Tenants**: `orgId` as URL slug, `enabledModules` as JSONB array
- **Platform Admins**: Separate table for platform-level access
- **Multi-tenant**: All user data includes `tenantId` foreign key

### Module System (shared/modules-config.ts)

- **Standard Field**: Always use `enabledModules` (not `modules`)
- **Module Validation**: Use `validateModules()` for dependency checking
- **Auth Providers**: Central registry of OAuth/SAML providers

### API Route Patterns (server/routes.ts)

```typescript
// Platform admin routes - no tenant context
app.post("/api/platform/auth/login", ...)

// Tenant-scoped routes - require tenantId
app.get("/api/tenants/:tenantId/users", tenantMiddleware, ...)

// Public tenant routes
app.get("/tenant/:orgId/login", ...)
```

### Frontend Routing (client/src/App.tsx)

- **Admin Portal**: Wrapped in `<AdminLayout>` component
- **Tenant Portal**: Dynamic routes with `:orgId` parameter
- **State Management**: TanStack Query for server state, React Hook Form + Zod
  for forms

## Authentication Flows

### Platform Admin

1. Login via `/admin/login` → Azure AD or email/password
2. JWT token stored for subsequent API calls
3. Routes protected by `platformAdminMiddleware`

### Tenant Users

1. Tenant-specific login pages: `/tenant/{orgId}/login`
2. Multi-provider auth (Azure AD, Auth0, local)
3. Tenant-scoped sessions with API key validation

## Environment Setup

```bash
# Required environment variables
DATABASE_URL=postgresql://...
SMTP_HOST=smtp.office365.com
SMTP_USER=your-email
SMTP_PASS=your-password
AZURE_CLIENT_ID=...
AZURE_CLIENT_SECRET=...
```

## Integration Points

- **Email Service**: Office365 SMTP via `server/services/email.ts`
- **Azure AD**: OAuth integration in `server/services/azure-ad.ts`
- **Database**: PostgreSQL with connection pooling in `server/storage.ts`

## Common Commands

```bash
# Full stack development
npm run dev                    # Start dev server (port 5000)

# Testing workflows
node test-onboarding-flow.js   # Complete tenant lifecycle test
npm run test:integration       # Jest integration tests

# Database management
npm run db:push               # Apply schema changes
npm run setup:platform-admin  # Create initial platform admin

# Package development
npm run packages:build        # Build all publishable packages
cd packages/auth && npm run publish-package  # Publish individual package
```

## Code Style Conventions

- **Import Style**: ES modules with `.js` extensions for Node.js compatibility
- **Database**: Use Drizzle ORM with typed queries, always include tenant
  isolation
- **Frontend**: Functional components with hooks, shadcn/ui for consistent
  styling
- **Error Handling**: Structured JSON responses with proper HTTP status codes
- **Logging**: System activity logs for audit trails via
  `storage.logSystemActivity()`
