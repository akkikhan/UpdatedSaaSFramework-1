# SaaS Framework - NPM Publishing Guide

This guide covers the process for publishing all SaaS Framework SDK packages to
NPM.

## Prerequisites

1. **NPM Account**: Ensure you have an NPM account with publishing rights
2. **Authentication**: Login to NPM using `npm login`
3. **Organization**: Create `@saas-framework` organization on NPM (if not
   exists)

## Setup Instructions

### 1. NPM Authentication

```bash
# Login to NPM
npm login

# Verify login status
npm whoami
```

### 2. Organization Setup

If the `@saas-framework` organization doesn't exist, create it on NPM:

- Go to https://www.npmjs.com/org/create
- Create organization named `saas-framework`
- Add team members as needed

### 3. Package Verification

Verify all packages build successfully:

```bash
# Build all packages
npm run build:all

# Test all packages
npm run test:all
```

## Publishing Process

### Option 1: Individual Package Publishing

Publish each package individually:

```bash
# Email SDK
cd packages/email
npm run build
npm publish --access public

# Auth SDK
cd ../auth
npm run build
npm publish --access public

# Logging SDK
cd ../logging
npm run build
npm publish --access public

# RBAC SDK
cd ../rbac
npm run build
npm publish --access public
```

### Option 2: Automated Publishing

Use the automated publishing script:

```bash
# Publish all packages at once
npm run publish:all
```

## Version Management

### Semantic Versioning

All packages follow semantic versioning (semver):

- **MAJOR** (1.0.0): Breaking changes
- **MINOR** (1.1.0): New features, backward compatible
- **PATCH** (1.0.1): Bug fixes, backward compatible

### Version Updates

Update package versions before publishing:

```bash
# Update all packages to new version
npm run version:update 1.0.1

# Or update individually
cd packages/email
npm version patch  # 1.0.0 -> 1.0.1
npm version minor  # 1.0.1 -> 1.1.0
npm version major  # 1.1.0 -> 2.0.0
```

## Package Status

| Package                 | Current Version | Status   | Description                    |
| ----------------------- | --------------- | -------- | ------------------------------ |
| @saas-framework/email   | 1.0.0           | ✅ Ready | Enterprise email SDK           |
| @saas-framework/auth    | 1.0.0           | ✅ Ready | Authentication & authorization |
| @saas-framework/logging | 1.0.0           | ✅ Ready | Structured logging & audit     |
| @saas-framework/rbac    | 1.0.0           | ✅ Ready | Role-based access control      |

## Publishing Checklist

Before publishing, ensure:

- [ ] All packages build without errors
- [ ] All tests pass
- [ ] README.md files are complete
- [ ] Version numbers are correct
- [ ] Dependencies are up to date
- [ ] TypeScript declarations are generated
- [ ] Examples are tested and working

## Post-Publishing

After successful publishing:

1. **Verify Installation**: Test installing packages from NPM
2. **Update Documentation**: Update main project documentation
3. **Create Release**: Tag the release in Git
4. **Announce**: Announce the release to stakeholders

## Troubleshooting

### Common Issues

1. **Authentication Error**: Run `npm login` again
2. **Permission Error**: Check organization membership
3. **Version Conflict**: Package version already exists
4. **Build Errors**: Check TypeScript configuration

### Support

For publishing issues:

- Check NPM status: https://status.npmjs.org/
- NPM Support: https://npmjs.com/support
- Documentation: https://docs.npmjs.com/

## Security

- **Never commit**: NPM tokens or credentials
- **Use 2FA**: Enable two-factor authentication
- **Review**: Always review package contents before publishing
- **Scope**: Use organization scope (@saas-framework) for all packages
