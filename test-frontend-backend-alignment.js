/**
 * Frontend-Backend Alignment Validation
 * Validates API endpoints match between client API definitions and server routes
 */

import fs from 'fs';
import path from 'path';

// Color codes for console output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m'
};

const log = {
  success: msg => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: msg => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  warning: msg => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  info: msg => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  header: msg => console.log(`${colors.bright}${colors.cyan}${msg}${colors.reset}`),
  subheader: msg => console.log(`${colors.magenta}${msg}${colors.reset}`),
  detail: msg => console.log(`${colors.dim}${msg}${colors.reset}`)
};

/**
 * Extract API endpoints from client API file
 */
function extractClientEndpoints() {
  const apiFilePath = path.join(process.cwd(), 'client/src/lib/api.ts');

  if (!fs.existsSync(apiFilePath)) {
    log.error('Client API file not found: client/src/lib/api.ts');
    return {};
  }

  const content = fs.readFileSync(apiFilePath, 'utf8');
  const endpoints = {};

  // Extract API endpoints from apiRequest calls
  const apiRequestRegex = /apiRequest\(['"`](\w+)['"`],\s*['"`]([^'"`]+)['"`]/g;
  let match;

  while ((match = apiRequestRegex.exec(content)) !== null) {
    const method = match[1];
    const path = match[2];

    if (!endpoints[method]) {
      endpoints[method] = [];
    }

    // Normalize path by removing query parameters and template variables
    const normalizedPath = path
      .replace(/\$\{[^}]+\}/g, ':param') // Template variables
      .replace(/\?.*$/, ''); // Query parameters

    endpoints[method].push(normalizedPath);
  }

  return endpoints;
}

/**
 * Extract API endpoints from server routes file
 */
function extractServerEndpoints() {
  const routesFilePath = path.join(process.cwd(), 'server/routes.ts');

  if (!fs.existsSync(routesFilePath)) {
    log.error('Server routes file not found: server/routes.ts');
    return {};
  }

  const content = fs.readFileSync(routesFilePath, 'utf8');
  const endpoints = {};

  // Extract endpoints from router method calls
  const routeRegex = /router\.(\w+)\(['"`]([^'"`]+)['"`]/g;
  let match;

  while ((match = routeRegex.exec(content)) !== null) {
    const method = match[1].toUpperCase();
    const path = match[2];

    if (!endpoints[method]) {
      endpoints[method] = [];
    }

    // Normalize path parameters
    const normalizedPath = path.replace(/:([a-zA-Z_$][a-zA-Z0-9_$]*)/g, ':param');

    endpoints[method].push(normalizedPath);
  }

  return endpoints;
}

/**
 * Compare client and server endpoints
 */
function compareEndpoints(clientEndpoints, serverEndpoints) {
  const results = {
    aligned: [],
    clientOnly: [],
    serverOnly: [],
    methodMismatches: []
  };

  // Check all HTTP methods
  const allMethods = new Set([...Object.keys(clientEndpoints), ...Object.keys(serverEndpoints)]);

  for (const method of allMethods) {
    const clientPaths = clientEndpoints[method] || [];
    const serverPaths = serverEndpoints[method] || [];

    // Find aligned endpoints
    for (const clientPath of clientPaths) {
      if (serverPaths.includes(clientPath)) {
        results.aligned.push({ method, path: clientPath });
      } else {
        results.clientOnly.push({ method, path: clientPath });
      }
    }

    // Find server-only endpoints
    for (const serverPath of serverPaths) {
      if (!clientPaths.includes(serverPath)) {
        results.serverOnly.push({ method, path: serverPath });
      }
    }
  }

  return results;
}

/**
 * Analyze tenant-specific endpoints
 */
function analyzeTenantEndpoints(clientEndpoints, serverEndpoints) {
  const tenantAnalysis = {
    tenantEndpoints: 0,
    categories: {
      core: 0,
      users: 0,
      roles: 0,
      permissions: 0,
      auth: 0,
      stats: 0
    }
  };

  // Analyze all endpoints for tenant patterns
  const allEndpoints = new Set();

  Object.values(clientEndpoints).forEach(paths => {
    paths.forEach(path => allEndpoints.add(path));
  });

  Object.values(serverEndpoints).forEach(paths => {
    paths.forEach(path => allEndpoints.add(path));
  });

  for (const endpoint of allEndpoints) {
    if (endpoint.includes('/tenants') || endpoint.includes('/tenant')) {
      tenantAnalysis.tenantEndpoints++;

      // Categorize tenant endpoints
      if (endpoint.includes('/users')) {
        tenantAnalysis.categories.users++;
      } else if (endpoint.includes('/roles')) {
        tenantAnalysis.categories.roles++;
      } else if (endpoint.includes('/permissions')) {
        tenantAnalysis.categories.permissions++;
      } else if (endpoint.includes('/auth')) {
        tenantAnalysis.categories.auth++;
      } else if (endpoint.includes('/stats') || endpoint.includes('/recent')) {
        tenantAnalysis.categories.stats++;
      } else {
        tenantAnalysis.categories.core++;
      }
    }
  }

  return tenantAnalysis;
}

/**
 * Validate API type definitions
 */
function validateTypeDefinitions() {
  const apiFilePath = path.join(process.cwd(), 'client/src/lib/api.ts');
  const content = fs.readFileSync(apiFilePath, 'utf8');

  const typeValidation = {
    interfacesFound: 0,
    coreTypes: [],
    missingTypes: []
  };

  // Essential types that should be defined
  const essentialTypes = [
    'Tenant',
    'User',
    'Role',
    'Permission',
    'UserRole',
    'CreateTenantData',
    'CreateUserData',
    'LoginData',
    'AuthResponse',
    'TenantStats',
    'SessionInfo'
  ];

  // Extract interface definitions
  const interfaceRegex = /export interface (\w+)/g;
  let match;

  while ((match = interfaceRegex.exec(content)) !== null) {
    typeValidation.interfacesFound++;
    typeValidation.coreTypes.push(match[1]);
  }

  // Check for missing essential types
  for (const type of essentialTypes) {
    if (!typeValidation.coreTypes.includes(type)) {
      typeValidation.missingTypes.push(type);
    }
  }

  return typeValidation;
}

/**
 * Main validation function
 */
async function validateFrontendBackendAlignment() {
  log.header('\n🔍 FRONTEND-BACKEND ALIGNMENT VALIDATION');
  log.header('='.repeat(60));

  try {
    // Extract endpoints
    log.info('\n📊 Extracting API endpoints...');
    const clientEndpoints = extractClientEndpoints();
    const serverEndpoints = extractServerEndpoints();

    log.detail(`Client endpoints found: ${Object.values(clientEndpoints).flat().length}`);
    log.detail(`Server endpoints found: ${Object.values(serverEndpoints).flat().length}`);

    // Compare endpoints
    log.info('\n🔄 Comparing endpoints...');
    const comparison = compareEndpoints(clientEndpoints, serverEndpoints);

    // Analyze tenant endpoints
    log.info('\n🏢 Analyzing tenant endpoints...');
    const tenantAnalysis = analyzeTenantEndpoints(clientEndpoints, serverEndpoints);

    // Validate type definitions
    log.info('\n📝 Validating type definitions...');
    const typeValidation = validateTypeDefinitions();

    // Report Results
    log.header('\n📋 ALIGNMENT REPORT');
    log.header('='.repeat(40));

    // Endpoint Alignment
    log.subheader('\n🎯 Endpoint Alignment:');
    log.success(`Aligned endpoints: ${comparison.aligned.length}`);

    if (comparison.clientOnly.length > 0) {
      log.warning(`Client-only endpoints: ${comparison.clientOnly.length}`);
      comparison.clientOnly.forEach(ep => {
        log.detail(`  ${ep.method} ${ep.path}`);
      });
    }

    if (comparison.serverOnly.length > 0) {
      log.warning(`Server-only endpoints: ${comparison.serverOnly.length}`);
      comparison.serverOnly.forEach(ep => {
        log.detail(`  ${ep.method} ${ep.path}`);
      });
    }

    // Tenant Analysis
    log.subheader('\n🏢 Tenant Endpoint Analysis:');
    log.info(`Total tenant endpoints: ${tenantAnalysis.tenantEndpoints}`);
    log.detail(`Core tenant management: ${tenantAnalysis.categories.core}`);
    log.detail(`User management: ${tenantAnalysis.categories.users}`);
    log.detail(`Role management: ${tenantAnalysis.categories.roles}`);
    log.detail(`Permission management: ${tenantAnalysis.categories.permissions}`);
    log.detail(`Authentication: ${tenantAnalysis.categories.auth}`);
    log.detail(`Statistics: ${tenantAnalysis.categories.stats}`);

    // Type Validation
    log.subheader('\n📝 Type Definition Analysis:');
    log.info(`Interfaces defined: ${typeValidation.interfacesFound}`);
    log.success(`Core types found: ${typeValidation.coreTypes.length}`);

    if (typeValidation.missingTypes.length > 0) {
      log.warning(`Missing essential types: ${typeValidation.missingTypes.length}`);
      typeValidation.missingTypes.forEach(type => {
        log.detail(`  ${type}`);
      });
    }

    // Alignment Score
    const totalEndpoints =
      Object.values(clientEndpoints).flat().length + Object.values(serverEndpoints).flat().length;
    const alignedCount = comparison.aligned.length * 2; // Count both client and server
    const alignmentScore =
      totalEndpoints > 0 ? ((alignedCount / totalEndpoints) * 100).toFixed(1) : 0;

    log.header('\n🎯 ALIGNMENT SUMMARY');
    log.header('='.repeat(40));
    log.info(`Alignment Score: ${alignmentScore}%`);

    if (alignmentScore >= 90) {
      log.success('Excellent frontend-backend alignment! 🎉');
    } else if (alignmentScore >= 75) {
      log.warning('Good alignment with room for improvement');
    } else {
      log.error('Significant alignment issues detected');
    }

    // Production Readiness Assessment
    log.subheader('\n✅ Production Readiness Assessment:');

    const readinessChecks = [
      {
        name: 'Endpoint Alignment',
        passed: alignmentScore >= 85,
        details: `${alignmentScore}% aligned`
      },
      {
        name: 'Tenant Management Coverage',
        passed: tenantAnalysis.tenantEndpoints >= 25,
        details: `${tenantAnalysis.tenantEndpoints} tenant endpoints`
      },
      {
        name: 'Core Type Definitions',
        passed: typeValidation.missingTypes.length === 0,
        details: `${typeValidation.missingTypes.length} missing types`
      },
      {
        name: 'Multi-category Support',
        passed: Object.values(tenantAnalysis.categories).filter(count => count > 0).length >= 5,
        details: `${Object.values(tenantAnalysis.categories).filter(count => count > 0).length}/6 categories covered`
      }
    ];

    let passedChecks = 0;
    readinessChecks.forEach(check => {
      if (check.passed) {
        log.success(`${check.name}: ${check.details}`);
        passedChecks++;
      } else {
        log.error(`${check.name}: ${check.details}`);
      }
    });

    const readinessScore = ((passedChecks / readinessChecks.length) * 100).toFixed(1);

    log.header('\n🎯 FINAL ASSESSMENT');
    log.header('='.repeat(40));
    log.info(`Production Readiness: ${readinessScore}%`);
    log.info(`Checks Passed: ${passedChecks}/${readinessChecks.length}`);

    if (readinessScore >= 90) {
      log.success('✅ SYSTEM IS PRODUCTION READY!');
    } else if (readinessScore >= 75) {
      log.warning('⚠️  System needs minor improvements before production');
    } else {
      log.error('❌ System requires significant work before production');
    }

    return {
      alignmentScore: parseFloat(alignmentScore),
      readinessScore: parseFloat(readinessScore),
      comparison,
      tenantAnalysis,
      typeValidation,
      isProductionReady: readinessScore >= 85
    };
  } catch (error) {
    log.error(`Validation failed: ${error.message}`);
    throw error;
  }
}

// Execute validation if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  validateFrontendBackendAlignment()
    .then(results => {
      log.header('\n🎉 Validation completed successfully!');
      process.exit(results.isProductionReady ? 0 : 1);
    })
    .catch(error => {
      log.error(`\n💥 Validation failed: ${error.message}`);
      process.exit(1);
    });
}

export default validateFrontendBackendAlignment;
