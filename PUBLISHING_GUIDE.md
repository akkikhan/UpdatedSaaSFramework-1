# Publishing Guide for SaaS Factory SDKs

This guide explains how to publish the `@saas-factory/auth` and `@saas-factory/rbac` packages to npm.

## Prerequisites

1. **npm Account**: Create an account at [npmjs.com](https://www.npmjs.com)
2. **npm CLI**: Install npm CLI and login:
   ```bash
   npm login
   ```
3. **Organization** (Optional): Create `@saas-factory` organization on npm

## Package Structure

```
packages/
├── auth-sdk/
│   ├── src/
│   │   └── index.ts
│   ├── package.json
│   ├── tsconfig.json
│   └── README.md
└── rbac-sdk/
    ├── src/
    │   └── index.ts
    ├── package.json
    ├── tsconfig.json
    └── README.md
```

## Publishing Steps

### 1. Install Dependencies

For each package, install dependencies:

```bash
# Auth SDK
cd packages/auth-sdk
npm install

# RBAC SDK  
cd packages/rbac-sdk
npm install
```

### 2. Build Packages

Build TypeScript to JavaScript:

```bash
# Auth SDK
cd packages/auth-sdk
npm run build

# RBAC SDK
cd packages/rbac-sdk  
npm run build
```

This creates `dist/` folders with compiled JavaScript and TypeScript definitions.

### 3. Test Packages Locally

Before publishing, test packages locally:

```bash
# Create test project
mkdir test-integration
cd test-integration
npm init -y

# Install local packages
npm install ../packages/auth-sdk
npm install ../packages/rbac-sdk

# Test imports
node -e "const auth = require('@saas-factory/auth'); console.log('Auth loaded');"
node -e "const rbac = require('@saas-factory/rbac'); console.log('RBAC loaded');"
```

### 4. Version Management

Use semantic versioning (semver):

```bash
# For bug fixes
npm version patch  # 1.0.0 -> 1.0.1

# For new features  
npm version minor  # 1.0.0 -> 1.1.0

# For breaking changes
npm version major  # 1.0.0 -> 2.0.0
```

### 5. Publish to npm

```bash
# Publish Auth SDK
cd packages/auth-sdk
npm publish --access public

# Publish RBAC SDK  
cd packages/rbac-sdk
npm publish --access public
```

## Automated Publishing with GitHub Actions

Create `.github/workflows/publish.yml`:

```yaml
name: Publish Packages

on:
  push:
    tags:
      - 'v*'

jobs:
  publish:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          registry-url: 'https://registry.npmjs.org'
          
      - name: Install dependencies
        run: |
          cd packages/auth-sdk && npm ci
          cd packages/rbac-sdk && npm ci
          
      - name: Build packages
        run: |
          cd packages/auth-sdk && npm run build
          cd packages/rbac-sdk && npm run build
          
      - name: Publish Auth SDK
        run: cd packages/auth-sdk && npm publish --access public
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
          
      - name: Publish RBAC SDK  
        run: cd packages/rbac-sdk && npm publish --access public
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

## Usage Examples

After publishing, users can install and use:

### Installation
```bash
npm install @saas-factory/auth @saas-factory/rbac
```

### Basic Usage
```typescript
import SaaSFactoryAuth from '@saas-factory/auth';
import SaaSFactoryRBAC from '@saas-factory/rbac';

// Get API keys from your SaaS Factory tenant
const auth = new SaaSFactoryAuth({
  apiKey: 'auth_abc123...',
  baseUrl: 'https://your-platform.com',
  tenantId: 'your-tenant-id'
});

const rbac = new SaaSFactoryRBAC({
  apiKey: 'rbac_xyz789...',
  baseUrl: 'https://your-platform.com', 
  tenantId: 'your-tenant-id'
});

// Authenticate user
const result = await auth.login({ email, password });

// Check permissions  
const canEdit = await rbac.hasPermission(result.user.id, 'documents', 'edit');
```

## Package Maintenance

### Updating Packages

1. Make changes to source code
2. Update version in `package.json`
3. Build and test locally
4. Publish updated version

### Security

- Never commit API keys or sensitive data
- Use environment variables for configuration
- Regularly audit dependencies: `npm audit`
- Keep dependencies updated

### Documentation

- Update README files for new features
- Include code examples
- Document breaking changes in changelog
- Maintain API documentation

## Support

For questions about publishing or using the SDKs:

1. Check the README files in each package
2. Create issues in the repository
3. Contact the SaaS Factory team

## License

Both packages are published under MIT license, allowing commercial use.