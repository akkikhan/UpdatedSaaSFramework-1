# 📦 NPM Package Publishing Guide

## Prerequisites

1. **NPM Account**: Create an account at [npmjs.com](https://www.npmjs.com)
2. **Organization**: Create `@saas-framework` organization (or use your own)
3. **NPM CLI**: Install and login to NPM

```bash
npm install -g npm
npm login
```

## Publishing Steps

### 1. Build & Publish Auth Module

```bash
cd packages/auth

# Build the TypeScript code
npm run build

# Publish to NPM
npm run publish-package

# Or manually:
npm publish --access public
```

### 2. Build & Publish RBAC Module

```bash
cd packages/rbac

# Build the TypeScript code
npm run build

# Publish to NPM
npm run publish-package

# Or manually:
npm publish --access public
```

### 3. Version Management

To update versions:

```bash
# Update version and publish
npm version patch  # 1.0.0 -> 1.0.1
npm version minor  # 1.0.0 -> 1.1.0
npm version major  # 1.0.0 -> 2.0.0

# Then publish
npm run publish-package
```

## Installation for Users

Once published, developers can install your packages:

```bash
# Install both packages
npm install @saas-framework/auth @saas-framework/rbac

# Or with yarn
yarn add @saas-framework/auth @saas-framework/rbac

# Or with pnpm
pnpm add @saas-framework/auth @saas-framework/rbac
```

## Usage in External Projects

```javascript
// CommonJS
const { SaaSAuth } = require('@saas-framework/auth');
const { SaaSRBAC } = require('@saas-framework/rbac');

// ES Modules
import { SaaSAuth } from '@saas-framework/auth';
import { SaaSRBAC } from '@saas-framework/rbac';
```

## Package Features

### @saas-framework/auth
- ✅ JWT token management
- ✅ User authentication
- ✅ Express.js middleware
- ✅ Token verification & refresh
- ✅ TypeScript support
- ✅ React integration examples
- ✅ Next.js integration examples

### @saas-framework/rbac
- ✅ Role-based access control
- ✅ Permission checking
- ✅ Express.js middleware
- ✅ Dynamic permission validation
- ✅ Role assignment management
- ✅ TypeScript support

## Continuous Integration

For automated publishing, add to your CI/CD pipeline:

```yaml
# .github/workflows/publish.yml
name: Publish Packages

on:
  release:
    types: [created]

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
          registry-url: 'https://registry.npmjs.org'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build and publish auth
        run: |
          cd packages/auth
          npm run build
          npm publish --access public
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
      
      - name: Build and publish rbac
        run: |
          cd packages/rbac
          npm run build
          npm publish --access public
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```