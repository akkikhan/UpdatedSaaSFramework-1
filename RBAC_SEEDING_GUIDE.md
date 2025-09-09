# RBAC Configuration Seeding Guide

This document explains how to seed your multi-tenant SaaS framework with
comprehensive RBAC (Role-Based Access Control) data including permission
templates, business types, and default roles.

## Available Seeding Scripts

### 1. Quick Seeding (`seed:rbac-quick`)

**Recommended for getting started quickly**

```bash
npm run seed:rbac-quick
```

**What it does:**

- Seeds essential business types (Standard, Healthcare, Financial, E-commerce)
- Creates basic permission templates for each business type
- Sets up fundamental default roles
- Perfect for development and initial setup

**Requirements:**

- Server must be running (`npm run dev`)
- Platform admin token required

### 2. Enhanced Seeding (`seed:rbac-enhanced`)

**Comprehensive industry-specific configurations**

```bash
npm run seed:rbac-enhanced
```

**What it does:**

- Seeds 10 business types with detailed compliance requirements
- Creates 8 specialized permission templates
- Sets up 25+ default roles for various industries
- Includes healthcare, financial, e-commerce, education, manufacturing,
  government, SaaS, and nonprofit configurations

**Requirements:**

- Server must be running
- Platform admin token required

### 3. Comprehensive Database Seeding (`seed:rbac-comprehensive`)

**Direct database seeding with validation**

```bash
npm run seed:rbac-comprehensive
```

**What it does:**

- Direct database insertion (no API required)
- Comprehensive permission catalog with 100+ defined permissions
- Data validation and relationship checking
- Detailed reporting and error handling

**Requirements:**

- Database connection (DATABASE_URL)
- No server required

### 4. Original Seeding (`seed:rbac`)

**Basic seeding for backward compatibility**

```bash
npm run seed:rbac
```

**What it does:**

- Seeds basic Standard and Everything configurations
- Minimal role setup
- Backward compatible with existing systems

## Authentication Setup

All API-based seeding scripts require a platform admin token. Set one of these
environment variables:

```bash
# Option 1: Platform Admin Token
export PLATFORM_ADMIN_TOKEN="your_jwt_token_here"

# Option 2: Admin Token (alternative)
export ADMIN_TOKEN="your_jwt_token_here"

# Option 3: For one-time use
PLATFORM_ADMIN_TOKEN="your_token" npm run seed:rbac-quick
```

### Getting a Platform Admin Token

1. **Start the server:**

   ```bash
   npm run dev
   ```

2. **Create a platform admin (if not exists):**

   ```bash
   npm run setup:platform-admin
   ```

3. **Login via API or UI to get JWT token:**
   ```bash
   curl -X POST http://localhost:5000/api/platform/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@example.com","password":"your_password"}'
   ```

## Business Types Included

### Standard Business Types

- **Standard**: Basic business operations (Low risk)
- **Healthcare**: HIPAA-compliant organizations (High risk)
- **Financial**: SOX/PCI-DSS compliant institutions (Critical risk)
- **E-commerce**: Online retail platforms (Medium risk)
- **Education**: FERPA-compliant institutions (Medium risk)
- **Manufacturing**: Industrial operations (Medium risk)
- **Government**: FISMA-compliant agencies (Critical risk)
- **SaaS**: Software platforms (Medium risk)
- **Nonprofit**: Charitable organizations (Low risk)

### Compliance Requirements

Each business type includes relevant compliance frameworks:

- **Healthcare**: HIPAA, PHI Protection, Audit Logging
- **Financial**: SOX, PCI-DSS, Basel III, MiFID II
- **Government**: FISMA, NIST 800-53, FedRAMP
- **Education**: FERPA, COPPA, Title IX
- And more...

## Permission Templates

### Industry-Specific Templates

- **Healthcare HIPAA**: Patient care and medical records
- **Financial SOX**: Trading, risk management, compliance
- **E-commerce Complete**: Product, inventory, order management
- **Education FERPA**: Student records and curriculum
- **SaaS Platform**: Multi-tenant management
- **Manufacturing**: Production and quality control
- **Government**: Document classification and security

### Permission Categories

- **User Management**: Create, read, update, delete users
- **Role Management**: Role assignment and administration
- **Industry-Specific**: Patient records, transactions, products, etc.
- **Compliance**: Audit logs, reporting, risk assessment
- **System**: Settings, integrations, analytics

## Default Roles

### Universal Roles

- **Super Admin**: Complete system access
- **Tenant Admin**: Full tenant administration
- **Manager**: User oversight and management
- **Standard User**: Basic application access
- **Read Only**: View-only access

### Industry-Specific Roles

- **Healthcare**: Doctor, Nurse, Healthcare Admin
- **Financial**: Trader, Compliance Officer, Risk Manager
- **E-commerce**: Store Admin, Sales Rep, Customer Service
- **Education**: Teacher, Principal, Student
- **Manufacturing**: Production Manager, Quality Inspector

## Usage Examples

### Development Setup

```bash
# 1. Start the development server
npm run dev

# 2. Set up platform admin
npm run setup:platform-admin

# 3. Get authentication token and set environment variable
export PLATFORM_ADMIN_TOKEN="your_jwt_token"

# 4. Run quick seeding
npm run seed:rbac-quick
```

### Production Deployment

```bash
# 1. Set production database URL
export DATABASE_URL="postgresql://prod_server/database"

# 2. Run comprehensive seeding (direct database)
npm run seed:rbac-comprehensive

# 3. Verify seeding via API
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:5000/api/rbac-config/business-types
```

### Custom Industry Setup

```bash
# 1. Seed enhanced configuration
npm run seed:rbac-enhanced

# 2. Create healthcare tenant
curl -X POST http://localhost:5000/api/tenants \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "City Hospital",
    "orgId": "city-hospital",
    "adminEmail": "admin@cityhospital.com",
    "businessType": "healthcare"
  }'
```

## Troubleshooting

### Common Issues

1. **"PLATFORM_ADMIN_TOKEN env var required"**
   - Set the authentication token environment variable
   - Ensure you have a valid JWT token from platform admin login

2. **"Cannot connect to server"**
   - Make sure the server is running (`npm run dev`)
   - Check the BASE_URL environment variable (default: http://localhost:5000)

3. **"Permission denied"**
   - Verify your JWT token is valid and not expired
   - Ensure the token belongs to a platform admin account

4. **Database connection errors**
   - Check DATABASE_URL environment variable
   - Ensure PostgreSQL is running and accessible
   - Verify database credentials and network connectivity

### Validation

Check seeded data via API:

```bash
# List business types
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:5000/api/rbac-config/business-types

# List permission templates
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:5000/api/rbac-config/permission-templates

# List default roles
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:5000/api/rbac-config/default-roles
```

## Integration with Tenant Creation

Once seeded, the RBAC configuration will be automatically used when:

1. **Creating new tenants** - Business type determines default permissions
2. **Onboarding users** - Default roles are applied based on tenant business
   type
3. **Platform admin UI** - Seeded templates available in dropdowns and forms
4. **API responses** - Configuration data used for validation and defaults

## Customization

After seeding, you can:

1. **Modify templates** via Platform Admin UI or API
2. **Create custom business types** for specific industries
3. **Add organization-specific roles** and permissions
4. **Update compliance requirements** as regulations change

The seeded data provides a solid foundation that can be extended and customized
for your specific use cases.
