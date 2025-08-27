const http = require('http');
const querystring = require('querystring');

// Configuration
const BASE_URL = 'localhost';
const PORT = 5000;
let authToken = null;
let testTenantId = null;
let testUserId = null;

// Test results tracking
const results = {
  total: 0,
  passed: 0,
  failed: 0,
  tests: []
};

// Utility function to make HTTP requests
function makeRequest(method, path, data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const postData = data ? JSON.stringify(data) : null;

    const options = {
      hostname: BASE_URL,
      port: PORT,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...headers,
        ...(authToken && { Authorization: `Bearer ${authToken}` }),
        ...(postData && { 'Content-Length': Buffer.byteLength(postData) })
      },
      timeout: 10000
    };

    const req = http.request(options, res => {
      let responseData = '';

      res.on('data', chunk => {
        responseData += chunk;
      });

      res.on('end', () => {
        let parsedData = null;
        try {
          if (responseData && res.headers['content-type']?.includes('application/json')) {
            parsedData = JSON.parse(responseData);
          }
        } catch (e) {
          // Keep raw response if not JSON
        }

        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: parsedData,
          rawData: responseData
        });
      });
    });

    req.on('error', error => {
      reject(error);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (postData) {
      req.write(postData);
    }

    req.end();
  });
}

// Test logging function
function logTest(testName, result, expectedStatus = 200) {
  results.total++;

  const success = result.status === expectedStatus;
  const icon = success ? '✅' : '❌';

  if (success) {
    results.passed++;
  } else {
    results.failed++;
  }

  console.log(`${icon} ${testName}`);
  console.log(`   Status: ${result.status} (expected: ${expectedStatus})`);

  if (result.data) {
    const dataStr = JSON.stringify(result.data, null, 2);
    console.log(
      `   Response: ${dataStr.length > 300 ? dataStr.substring(0, 300) + '...' : dataStr}`
    );
  } else if (result.rawData) {
    console.log(
      `   Response: ${result.rawData.substring(0, 200)}${result.rawData.length > 200 ? '...' : ''}`
    );
  }

  console.log('');

  results.tests.push({
    name: testName,
    status: result.status,
    expectedStatus,
    success,
    timestamp: new Date().toISOString()
  });

  return success;
}

// Test suite execution
async function runTests() {
  console.log('🚀 COMPREHENSIVE RBAC ENDPOINT TESTING');
  console.log('=====================================\n');

  try {
    // 1. Health Check
    console.log('📊 SYSTEM HEALTH CHECK');
    console.log('----------------------');

    const healthResult = await makeRequest('GET', '/api/health');
    logTest('GET /api/health - System Health Check', healthResult, 200);

    // 2. Tenant Management
    console.log('🏢 TENANT MANAGEMENT');
    console.log('--------------------');

    const tenantData = {
      orgId: `test-org-${Date.now()}`,
      name: `Test Organization ${Date.now()}`,
      adminEmail: `admin-${Date.now()}@example.com`,
      enabledModules: ['auth', 'rbac', 'logging'],
      moduleConfigs: {}
    };

    const createTenantResult = await makeRequest('POST', '/api/tenants', tenantData);
    logTest('POST /api/tenants - Create Tenant', createTenantResult, 201);

    if (createTenantResult.status === 201 && createTenantResult.data?.id) {
      testTenantId = createTenantResult.data.id;
      console.log(`🔑 Test Tenant ID: ${testTenantId}\n`);
    }

    const getTenantsResult = await makeRequest('GET', '/api/tenants');
    logTest('GET /api/tenants - List Tenants', getTenantsResult, 200);

    // 3. Authentication
    console.log('🔐 AUTHENTICATION & AUTHORIZATION');
    console.log('---------------------------------');

    const registerData = {
      email: `test-user-${Date.now()}@example.com`,
      password: 'TestPassword123!',
      firstName: 'Test',
      lastName: 'User',
      tenantId: testTenantId
    };

    const registerResult = await makeRequest('POST', '/api/v2/auth/register', registerData);
    logTest('POST /api/v2/auth/register - User Registration', registerResult, 201);

    if (registerResult.status === 201) {
      testUserId = registerResult.data?.id;
    }

    const loginData = {
      email: registerData.email,
      password: registerData.password,
      tenantId: testTenantId
    };

    const loginResult = await makeRequest('POST', '/api/v2/auth/login', loginData);
    logTest('POST /api/v2/auth/login - User Login', loginResult, 200);

    if (loginResult.status === 200 && loginResult.data?.token) {
      authToken = loginResult.data.token;
      console.log(`🔑 Auth Token acquired: ${authToken.substring(0, 30)}...\n`);
    }

    // Test /me endpoint with authentication
    const meResult = await makeRequest('GET', '/api/v2/auth/me');
    logTest('GET /api/v2/auth/me - Get Current User', meResult, 200);

    // 4. User Management
    console.log('👥 USER MANAGEMENT');
    console.log('------------------');

    const getUsersResult = await makeRequest('GET', `/api/tenants/${testTenantId}/users`);
    logTest('GET /api/tenants/{id}/users - List Tenant Users', getUsersResult, 200);

    if (testUserId) {
      const getUserResult = await makeRequest(
        'GET',
        `/api/tenants/${testTenantId}/users/${testUserId}`
      );
      logTest('GET /api/tenants/{id}/users/{userId} - Get Specific User', getUserResult, 200);
    }

    // 5. Role Management
    console.log('🛡️ ROLE MANAGEMENT');
    console.log('------------------');

    const getRolesResult = await makeRequest('GET', `/api/tenants/${testTenantId}/roles`);
    logTest('GET /api/tenants/{id}/roles - List Tenant Roles', getRolesResult, 200);

    const roleData = {
      name: `TestRole_${Date.now()}`,
      description: 'Test role for API validation',
      permissions: ['read_users']
    };

    const createRoleResult = await makeRequest(
      'POST',
      `/api/tenants/${testTenantId}/roles`,
      roleData
    );
    logTest('POST /api/tenants/{id}/roles - Create Role', createRoleResult, 201);

    // 6. Permission Management
    console.log('🔑 PERMISSION MANAGEMENT');
    console.log('-----------------------');

    const getPermissionsResult = await makeRequest('GET', '/api/permissions');
    logTest('GET /api/permissions - List All Permissions', getPermissionsResult, 200);

    const permissionData = {
      key: `test_permission_${Date.now()}`,
      description: 'Test permission for API validation',
      category: 'testing'
    };

    const createPermissionResult = await makeRequest('POST', '/api/permissions', permissionData);
    logTest('POST /api/permissions - Create Permission', createPermissionResult, 201);

    // 7. Statistics and Monitoring
    console.log('📈 STATISTICS & MONITORING');
    console.log('--------------------------');

    const getStatsResult = await makeRequest('GET', '/api/stats');
    logTest('GET /api/stats - System Statistics', getStatsResult, 200);

    // 8. Session Management
    console.log('🔄 SESSION MANAGEMENT');
    console.log('--------------------');

    const getSessionsResult = await makeRequest('GET', `/api/tenants/${testTenantId}/sessions`);
    logTest('GET /api/tenants/{id}/sessions - List Active Sessions', getSessionsResult, 200);

    // 9. SAML Configuration (if supported)
    console.log('🔗 INTEGRATION ENDPOINTS');
    console.log('------------------------');

    const getSamlConfigResult = await makeRequest(
      'GET',
      `/api/tenants/${testTenantId}/auth/saml/config`
    );
    logTest(
      'GET /api/tenants/{id}/auth/saml/config - SAML Configuration',
      getSamlConfigResult,
      [200, 404]
    );
  } catch (error) {
    console.error('❌ Test execution failed:', error.message);
  }

  // Final Results
  console.log('\n📊 FINAL TEST RESULTS');
  console.log('=====================');
  console.log(`Total Tests: ${results.total}`);
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`📈 Success Rate: ${((results.passed / results.total) * 100).toFixed(1)}%`);

  if (results.failed > 0) {
    console.log('\n❌ FAILED TESTS:');
    results.tests
      .filter(t => !t.success)
      .forEach(test => {
        console.log(`   - ${test.name} (${test.status}/${test.expectedStatus})`);
      });
  }

  console.log('\n🎯 RBAC ENDPOINT TESTING COMPLETED');

  // Check if server is production ready
  const successRate = (results.passed / results.total) * 100;
  if (successRate >= 90) {
    console.log('✅ SYSTEM IS PRODUCTION READY - High success rate!');
  } else if (successRate >= 70) {
    console.log('⚠️  SYSTEM NEEDS ATTENTION - Some endpoints failing');
  } else {
    console.log('❌ SYSTEM NOT PRODUCTION READY - Critical failures detected');
  }
}

// Start testing
runTests().catch(error => {
  console.error('❌ Test suite failed to start:', error);
  process.exit(1);
});
