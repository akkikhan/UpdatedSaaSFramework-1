# Publishing Guide for Auth & RBAC Packages

## Current Status

Your project includes 4 authentication and authorization packages ready for external use:

### 1. `@saas-framework/auth` 
- **Location**: `packages/auth/`
- **Status**: Built but not published yet
- **Purpose**: Core authentication SDK for multi-tenant applications
- **Features**: JWT tokens, password hashing, session management

### 2. `@saas-framework/rbac`
- **Location**: `packages/rbac/`  
- **Status**: Built but not published yet
- **Purpose**: Role-based access control SDK
- **Features**: Permission management, role assignments, middleware protection

### 3. `@saas-factory/auth`
- **Location**: `packages/auth-sdk/`
- **Status**: Built but not published yet
- **Purpose**: Alternative auth SDK with different branding
- **Features**: Multi-tenant authentication, JWT, bcrypt

### 4. `@saas-factory/rbac`
- **Location**: `packages/rbac-sdk/`
- **Status**: Built but not published yet  
- **Purpose**: Alternative RBAC SDK with different branding
- **Features**: Authorization, permissions, roles

## How to Publish These Packages

### Prerequisites
1. **NPM Account**: Create account at [npmjs.com](https://npmjs.com)
2. **NPM Authentication**: Run `npm login` in terminal
3. **Organization Setup** (Optional): Create organizations `@saas-framework` and `@saas-factory` on NPM

### Step-by-Step Publishing

#### For @saas-framework packages:

```bash
# Navigate to auth package
cd packages/auth

# Build the package
npm run build

# Publish to NPM
npm run publish-package

# Navigate to rbac package  
cd ../rbac

# Build the package
npm run build

# Publish to NPM
npm run publish-package
```

#### For @saas-factory packages:

```bash
# Navigate to auth-sdk package
cd packages/auth-sdk

# Build the package
npm run build

# Publish (you'll need to add publish script)
npm publish --access public

# Navigate to rbac-sdk package
cd ../rbac-sdk

# Build the package
npm run build

# Publish (you'll need to add publish script)
npm publish --access public
```

### Package.json Enhancements Needed

Add these scripts to `packages/auth-sdk/package.json` and `packages/rbac-sdk/package.json`:

```json
{
  "scripts": {
    "publish-package": "npm publish --access public"
  }
}
```

## How External Applications Can Use These Packages

### Installation

Once published, users can install your packages:

```bash
# For @saas-framework packages
npm install @saas-framework/auth @saas-framework/rbac

# Or for @saas-factory packages  
npm install @saas-factory/auth @saas-factory/rbac
```

### Usage Examples

#### Express.js Application

```javascript
const express = require('express');
const { SaaSAuth } = require('@saas-framework/auth');
const { SaaSRBAC } = require('@saas-framework/rbac');

const app = express();

// Initialize auth with your platform's API
const auth = new SaaSAuth({
  apiUrl: 'https://your-saas-platform.com/api',
  apiKey: process.env.SAAS_AUTH_API_KEY
});

// Initialize RBAC
const rbac = new SaaSRBAC({
  apiUrl: 'https://your-saas-platform.com/api', 
  apiKey: process.env.SAAS_RBAC_API_KEY
});

// Protected route with authentication
app.get('/dashboard', auth.middleware(), (req, res) => {
  res.json({ user: req.user });
});

// Protected route with specific permission
app.get('/admin', rbac.middleware(['admin.access']), (req, res) => {
  res.json({ message: 'Admin access granted' });
});
```

#### React Application

```jsx
import { useAuth } from '@saas-framework/auth';

function App() {
  const { user, login, logout, isAuthenticated } = useAuth({
    apiUrl: 'https://your-saas-platform.com/api',
    apiKey: process.env.REACT_APP_SAAS_API_KEY
  });

  if (!isAuthenticated) {
    return <LoginForm onLogin={login} />;
  }

  return (
    <div>
      <h1>Welcome {user.name}</h1>
      <button onClick={logout}>Logout</button>
    </div>
  );
}
```

## Integration with Your Platform

### API Keys Management
Your platform generates unique API keys for each tenant:
- **Auth API Key**: For authentication operations
- **RBAC API Key**: For authorization operations

### Tenant Configuration
When external applications integrate:

1. **Register with your platform**: Get API keys for their organization
2. **Configure SDK**: Point to your platform's API endpoints
3. **Set up authentication**: Users authenticate through your platform
4. **Manage permissions**: Roles and permissions managed in your admin portal

### API Endpoints Your Platform Provides

```
POST /api/auth/login
POST /api/auth/logout  
GET  /api/auth/user
POST /api/auth/register

GET  /api/rbac/permissions
POST /api/rbac/check-permission
GET  /api/rbac/user-roles
```

## Benefits for External Users

1. **Quick Integration**: Drop-in authentication and authorization
2. **Multi-tenant Ready**: Built for SaaS applications from day one
3. **Centralized Management**: All user management through your platform
4. **Security**: Enterprise-grade JWT and permission systems
5. **Scalability**: Built to handle growing user bases

## Next Steps

1. **Publish packages** using the commands above
2. **Create documentation website** with integration guides
3. **Add example projects** showing real implementations
4. **Set up CI/CD** for automatic publishing of updates
5. **Create developer onboarding** flow in your admin portal

## Platform Revenue Model

External applications using your packages could:
- Pay per user authenticated
- Pay monthly subscription per organization
- Pay for premium features (SSO, advanced RBAC, etc.)
- Use freemium model with usage limits

This creates a sustainable business model around your authentication platform.