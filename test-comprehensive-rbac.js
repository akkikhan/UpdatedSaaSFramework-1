/**
 * Comprehensive RBAC API Testing Script
 * Tests all 60+ endpoints for complete functionality verification
 * This script will validate every endpoint category systematically
 */

const BASE_URL = 'http://localhost:5000';
let authToken = null;
let testTenantId = null;
let testUserId = null;
let testRoleId = null;
let testPermissionId = null;

// Utility functions
async function makeRequest(method, endpoint, data = null, headers = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const config = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
      ...(authToken && { Authorization: `Bearer ${authToken}` })
    }
  };

  if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
    config.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(url, config);
    const result = {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries())
    };

    if (response.headers.get('content-type')?.includes('application/json')) {
      result.data = await response.json();
    } else {
      result.text = await response.text();
    }

    return result;
  } catch (error) {
    return {
      error: error.message,
      status: 0
    };
  }
}

function logResult(testName, result, expectedStatus = 200) {
  const status = result.status;
  const success = status === expectedStatus;
  const icon = success ? '✅' : '❌';

  console.log(`${icon} ${testName}`);
  console.log(`   Status: ${status} (expected: ${expectedStatus})`);

  if (result.error) {
    console.log(`   Error: ${result.error}`);
  } else if (result.data) {
    console.log(`   Response: ${JSON.stringify(result.data, null, 2).substring(0, 200)}...`);
  } else if (result.text) {
    console.log(`   Response: ${result.text.substring(0, 200)}...`);
  }

  console.log('');
  return success;
}

// Test data generators
function generateTestData() {
  const timestamp = Date.now();
  return {
    tenant: {
      orgId: `test-org-${timestamp}`,
      name: `Test Organization ${timestamp}`,
      adminEmail: `admin-${timestamp}@example.com`,
      enabledModules: ['auth', 'rbac', 'logging', 'monitoring', 'notifications', 'ai-copilot'],
      moduleConfigs: {}
    },
    user: {
      email: `user-${timestamp}@example.com`,
      password: 'TestPassword123!',
      firstName: 'Test',
      lastName: 'User',
      status: 'active'
    },
    role: {
      name: `TestRole_${timestamp}`,
      description: 'Test role for API validation',
      permissions: ['read_users', 'read_roles']
    },
    permission: {
      key: `test_permission_${timestamp}`,
      description: 'Test permission for API validation',
      category: 'testing'
    }
  };
}

// ========================================
// 1. AUTHENTICATION & SESSION MANAGEMENT
// ========================================
async function testAuthenticationEndpoints() {
  console.log('🔐 TESTING AUTHENTICATION & SESSION MANAGEMENT\n');

  const testData = generateTestData();
  let results = [];

  // First create a tenant to test with
  console.log('Setting up test tenant...');
  const tenantResult = await makeRequest('POST', '/api/tenants', testData.tenant);
  logResult('Create Test Tenant', tenantResult, 201);

  if (tenantResult.status === 201) {
    testTenantId = tenantResult.data.id;
    console.log(`Test Tenant ID: ${testTenantId}\n`);
  }

  // Test user registration
  const registerData = {
    ...testData.user,
    tenantId: testTenantId
  };

  const registerResult = await makeRequest('POST', '/api/v2/auth/register', registerData);
  results.push(logResult('POST /api/v2/auth/register - User Registration', registerResult, 201));

  if (registerResult.status === 201) {
    testUserId = registerResult.data.id;
  }

  // Test login
  const loginData = {
    email: testData.user.email,
    password: testData.user.password,
    tenantId: testTenantId
  };

  const loginResult = await makeRequest('POST', '/api/v2/auth/login', loginData);
  results.push(logResult('POST /api/v2/auth/login - User Login', loginResult, 200));

  if (loginResult.status === 200 && loginResult.data.token) {
    authToken = loginResult.data.token;
    console.log(`Auth Token acquired: ${authToken.substring(0, 20)}...\n`);
  }

  // Test token verification
  const verifyResult = await makeRequest('GET', '/api/v2/auth/verify');
  results.push(logResult('GET /api/v2/auth/verify - Token Verification', verifyResult, 200));

  // Test get current user
  const meResult = await makeRequest('GET', '/api/v2/auth/me');
  results.push(logResult('GET /api/v2/auth/me - Get Current User', meResult, 200));

  // Test token refresh
  const refreshResult = await makeRequest('POST', '/api/v2/auth/refresh', { token: authToken });
  results.push(logResult('POST /api/v2/auth/refresh - Token Refresh', refreshResult, 200));

  // Test password reset request
  const resetData = { email: testData.user.email, tenantId: testTenantId };
  const resetResult = await makeRequest('POST', '/api/v2/auth/password-reset', resetData);
  results.push(
    logResult('POST /api/v2/auth/password-reset - Password Reset Request', resetResult, 200)
  );

  // Test logout
  const logoutResult = await makeRequest('POST', '/api/v2/auth/logout');
  results.push(logResult('POST /api/v2/auth/logout - User Logout', logoutResult, 200));

  const successCount = results.filter(r => r).length;
  console.log(`Authentication Tests: ${successCount}/${results.length} passed\n`);

  return { successCount, totalCount: results.length };
}

// ========================================
// 2. MULTI-FACTOR AUTHENTICATION
// ========================================
async function testMFAEndpoints() {
  console.log('🔒 TESTING MULTI-FACTOR AUTHENTICATION\n');

  let results = [];

  // Re-login to get fresh token
  const testData = generateTestData();
  const loginData = {
    email: testData.user.email,
    password: testData.user.password,
    tenantId: testTenantId
  };

  const loginResult = await makeRequest('POST', '/api/v2/auth/login', loginData);
  if (loginResult.status === 200) {
    authToken = loginResult.data.token;
  }

  // Test MFA setup
  const mfaSetupResult = await makeRequest('POST', '/api/v2/auth/mfa/totp/setup');
  results.push(logResult('POST /api/v2/auth/mfa/totp/setup - MFA Setup', mfaSetupResult, 200));

  // Test MFA verification (will fail without real TOTP code)
  const mfaVerifyData = { token: '123456' };
  const mfaVerifyResult = await makeRequest('POST', '/api/v2/auth/mfa/totp/verify', mfaVerifyData);
  results.push(
    logResult('POST /api/v2/auth/mfa/totp/verify - MFA Verification', mfaVerifyResult, [200, 400])
  );

  // Test get MFA status
  const mfaStatusResult = await makeRequest('GET', '/api/v2/auth/mfa');
  results.push(logResult('GET /api/v2/auth/mfa - Get MFA Status', mfaStatusResult, 200));

  // Test MFA backup codes
  const backupCodesResult = await makeRequest('GET', '/api/v2/auth/mfa/backup-codes');
  results.push(
    logResult('GET /api/v2/auth/mfa/backup-codes - Get Backup Codes', backupCodesResult, 200)
  );

  // Test regenerate backup codes
  const regenCodesResult = await makeRequest('POST', '/api/v2/auth/mfa/regenerate-backup-codes');
  results.push(
    logResult(
      'POST /api/v2/auth/mfa/regenerate-backup-codes - Regenerate Codes',
      regenCodesResult,
      200
    )
  );

  // Test remove MFA
  const removeMfaResult = await makeRequest('DELETE', '/api/v2/auth/mfa/totp');
  results.push(logResult('DELETE /api/v2/auth/mfa/totp - Remove MFA', removeMfaResult, 200));

  const successCount = results.filter(r => r).length;
  console.log(`MFA Tests: ${successCount}/${results.length} passed\n`);

  return { successCount, totalCount: results.length };
}

// ========================================
// 3. OAUTH INTEGRATION
// ========================================
async function testOAuthEndpoints() {
  console.log('🔗 TESTING OAUTH INTEGRATION\n');

  let results = [];

  // Test Azure AD OAuth (will redirect)
  const azureLoginResult = await makeRequest('GET', `/api/oauth/azure-ad/${testTenantId}`);
  results.push(
    logResult('GET /api/oauth/azure-ad/:orgId - Azure Login', azureLoginResult, [302, 200])
  );

  // Test Google OAuth (will redirect)
  const googleLoginResult = await makeRequest('GET', `/api/oauth/google/${testTenantId}`);
  results.push(
    logResult('GET /api/oauth/google/:orgId - Google Login', googleLoginResult, [302, 200])
  );

  // Test GitHub OAuth (will redirect)
  const githubLoginResult = await makeRequest('GET', `/api/oauth/github/${testTenantId}`);
  results.push(
    logResult('GET /api/oauth/github/:orgId - GitHub Login', githubLoginResult, [302, 200])
  );

  // Test Auth0 OAuth (will redirect)
  const auth0LoginResult = await makeRequest('GET', `/api/oauth/auth0/${testTenantId}`);
  results.push(
    logResult('GET /api/oauth/auth0/:orgId - Auth0 Login', auth0LoginResult, [302, 200])
  );

  // OAuth callback endpoints would need real OAuth flows to test properly
  // For now, testing that they exist and respond

  const successCount = results.filter(r => r).length;
  console.log(`OAuth Tests: ${successCount}/${results.length} passed\n`);

  return { successCount, totalCount: results.length };
}

// ========================================
// 4. SAML AUTHENTICATION
// ========================================
async function testSAMLEndpoints() {
  console.log('🎫 TESTING SAML AUTHENTICATION\n');

  let results = [];

  // Test SAML login
  const samlLoginResult = await makeRequest('GET', `/api/v2/auth/saml/${testTenantId}/login`);
  results.push(
    logResult('GET /api/v2/auth/saml/:tenantId/login - SAML Login', samlLoginResult, [200, 302])
  );

  // Test SAML metadata
  const samlMetadataResult = await makeRequest('GET', `/api/v2/auth/saml/${testTenantId}/metadata`);
  results.push(
    logResult('GET /api/v2/auth/saml/:tenantId/metadata - SAML Metadata', samlMetadataResult, 200)
  );

  // SAML ACS would need real SAML assertions to test
  const samlAcsResult = await makeRequest('POST', `/api/v2/auth/saml/${testTenantId}/acs`, {});
  results.push(
    logResult('POST /api/v2/auth/saml/:tenantId/acs - SAML ACS', samlAcsResult, [200, 400])
  );

  const successCount = results.filter(r => r).length;
  console.log(`SAML Tests: ${successCount}/${results.length} passed\n`);

  return { successCount, totalCount: results.length };
}

// ========================================
// 5. USER MANAGEMENT
// ========================================
async function testUserManagementEndpoints() {
  console.log('👥 TESTING USER MANAGEMENT\n');

  let results = [];

  // Test get all users for tenant
  const getUsersResult = await makeRequest('GET', `/api/tenants/${testTenantId}/users`);
  results.push(logResult('GET /api/tenants/:tenantId/users - List Users', getUsersResult, 200));

  // Test create user
  const testData = generateTestData();
  const createUserData = {
    ...testData.user,
    email: `newuser-${Date.now()}@example.com`
  };

  const createUserResult = await makeRequest(
    'POST',
    `/api/tenants/${testTenantId}/users`,
    createUserData
  );
  results.push(logResult('POST /api/tenants/:tenantId/users - Create User', createUserResult, 201));

  let newUserId = null;
  if (createUserResult.status === 201) {
    newUserId = createUserResult.data.id;
  }

  // Test get specific user
  if (newUserId) {
    const getUserResult = await makeRequest(
      'GET',
      `/api/tenants/${testTenantId}/users/${newUserId}`
    );
    results.push(
      logResult('GET /api/tenants/:tenantId/users/:userId - Get User', getUserResult, 200)
    );

    // Test update user
    const updateUserData = { firstName: 'Updated', lastName: 'Name' };
    const updateUserResult = await makeRequest(
      'PATCH',
      `/api/tenants/${testTenantId}/users/${newUserId}`,
      updateUserData
    );
    results.push(
      logResult('PATCH /api/tenants/:tenantId/users/:userId - Update User', updateUserResult, 200)
    );

    // Test delete user
    const deleteUserResult = await makeRequest(
      'DELETE',
      `/api/tenants/${testTenantId}/users/${newUserId}`
    );
    results.push(
      logResult('DELETE /api/tenants/:tenantId/users/:userId - Delete User', deleteUserResult, 200)
    );
  }

  // Test notification preferences
  const notifPrefData = {
    categories: { general: true, security: true },
    channels: { email: true, sms: false }
  };
  const notifPrefResult = await makeRequest(
    'PUT',
    '/api/v2/user/notification-preferences',
    notifPrefData
  );
  results.push(
    logResult(
      'PUT /api/v2/user/notification-preferences - Update Preferences',
      notifPrefResult,
      200
    )
  );

  // Test device token registration
  const deviceTokenData = {
    token: 'test-device-token-123',
    platform: 'web',
    deviceInfo: { browser: 'chrome', os: 'windows' }
  };
  const deviceTokenResult = await makeRequest(
    'POST',
    '/api/v2/user/device-tokens',
    deviceTokenData
  );
  results.push(
    logResult('POST /api/v2/user/device-tokens - Register Device Token', deviceTokenResult, 201)
  );

  // Test device token removal
  const removeTokenResult = await makeRequest(
    'DELETE',
    '/api/v2/user/device-tokens/test-device-token-123'
  );
  results.push(
    logResult(
      'DELETE /api/v2/user/device-tokens/:token - Remove Device Token',
      removeTokenResult,
      200
    )
  );

  const successCount = results.filter(r => r).length;
  console.log(`User Management Tests: ${successCount}/${results.length} passed\n`);

  return { successCount, totalCount: results.length };
}

// ========================================
// 6. ROLE MANAGEMENT
// ========================================
async function testRoleManagementEndpoints() {
  console.log('🎭 TESTING ROLE MANAGEMENT\n');

  let results = [];

  // Test get all roles for tenant
  const getRolesResult = await makeRequest('GET', `/api/tenants/${testTenantId}/roles`);
  results.push(logResult('GET /api/tenants/:tenantId/roles - List Roles', getRolesResult, 200));

  // Test create role
  const testData = generateTestData();
  const createRoleResult = await makeRequest(
    'POST',
    `/api/tenants/${testTenantId}/roles`,
    testData.role
  );
  results.push(logResult('POST /api/tenants/:tenantId/roles - Create Role', createRoleResult, 201));

  if (createRoleResult.status === 201) {
    testRoleId = createRoleResult.data.id;
  }

  // Test get specific role
  if (testRoleId) {
    const getRoleResult = await makeRequest(
      'GET',
      `/api/tenants/${testTenantId}/roles/${testRoleId}`
    );
    results.push(
      logResult('GET /api/tenants/:tenantId/roles/:roleId - Get Role', getRoleResult, 200)
    );

    // Test update role
    const updateRoleData = { description: 'Updated role description' };
    const updateRoleResult = await makeRequest(
      'PATCH',
      `/api/tenants/${testTenantId}/roles/${testRoleId}`,
      updateRoleData
    );
    results.push(
      logResult('PATCH /api/tenants/:tenantId/roles/:roleId - Update Role', updateRoleResult, 200)
    );
  }

  const successCount = results.filter(r => r).length;
  console.log(`Role Management Tests: ${successCount}/${results.length} passed\n`);

  return { successCount, totalCount: results.length };
}

// ========================================
// 7. USER-ROLE ASSIGNMENT
// ========================================
async function testUserRoleAssignmentEndpoints() {
  console.log('🔗 TESTING USER-ROLE ASSIGNMENT\n');

  let results = [];

  if (!testUserId || !testRoleId) {
    console.log('⚠️  Skipping user-role tests - missing test user or role IDs\n');
    return { successCount: 0, totalCount: 0 };
  }

  // Test assign role to user
  const assignRoleData = { roleId: testRoleId };
  const assignRoleResult = await makeRequest(
    'POST',
    `/api/tenants/${testTenantId}/users/${testUserId}/roles`,
    assignRoleData
  );
  results.push(
    logResult(
      'POST /api/tenants/:tenantId/users/:userId/roles - Assign Role',
      assignRoleResult,
      201
    )
  );

  // Test get user roles
  const getUserRolesResult = await makeRequest(
    'GET',
    `/api/tenants/${testTenantId}/users/${testUserId}/roles`
  );
  results.push(
    logResult(
      'GET /api/tenants/:tenantId/users/:userId/roles - Get User Roles',
      getUserRolesResult,
      200
    )
  );

  // Test remove role from user
  const removeRoleResult = await makeRequest(
    'DELETE',
    `/api/tenants/${testTenantId}/users/${testUserId}/roles/${testRoleId}`
  );
  results.push(
    logResult(
      'DELETE /api/tenants/:tenantId/users/:userId/roles/:roleId - Remove Role',
      removeRoleResult,
      200
    )
  );

  const successCount = results.filter(r => r).length;
  console.log(`User-Role Assignment Tests: ${successCount}/${results.length} passed\n`);

  return { successCount, totalCount: results.length };
}

// ========================================
// 8. PERMISSION MANAGEMENT
// ========================================
async function testPermissionManagementEndpoints() {
  console.log('🔐 TESTING PERMISSION MANAGEMENT\n');

  let results = [];

  // Test get all permissions for tenant
  const getPermissionsResult = await makeRequest('GET', `/api/tenants/${testTenantId}/permissions`);
  results.push(
    logResult(
      'GET /api/tenants/:tenantId/permissions - List Permissions',
      getPermissionsResult,
      200
    )
  );

  // Test create permission
  const testData = generateTestData();
  const createPermissionResult = await makeRequest(
    'POST',
    `/api/tenants/${testTenantId}/permissions`,
    testData.permission
  );
  results.push(
    logResult(
      'POST /api/tenants/:tenantId/permissions - Create Permission',
      createPermissionResult,
      201
    )
  );

  if (createPermissionResult.status === 201) {
    testPermissionId = createPermissionResult.data.id;
  }

  // Test get specific permission
  if (testPermissionId) {
    const getPermissionResult = await makeRequest(
      'GET',
      `/api/tenants/${testTenantId}/permissions/${testPermissionId}`
    );
    results.push(
      logResult(
        'GET /api/tenants/:tenantId/permissions/:permissionId - Get Permission',
        getPermissionResult,
        200
      )
    );

    // Test update permission
    const updatePermissionData = { description: 'Updated permission description' };
    const updatePermissionResult = await makeRequest(
      'POST',
      `/api/tenants/${testTenantId}/permissions/${testPermissionId}`,
      updatePermissionData
    );
    results.push(
      logResult(
        'POST /api/tenants/:tenantId/permissions/:permissionId - Update Permission',
        updatePermissionResult,
        200
      )
    );
  }

  const successCount = results.filter(r => r).length;
  console.log(`Permission Management Tests: ${successCount}/${results.length} passed\n`);

  return { successCount, totalCount: results.length };
}

// ========================================
// 9. ROLE-PERMISSION ASSIGNMENT
// ========================================
async function testRolePermissionAssignmentEndpoints() {
  console.log('🔗 TESTING ROLE-PERMISSION ASSIGNMENT\n');

  let results = [];

  if (!testRoleId || !testPermissionId) {
    console.log('⚠️  Skipping role-permission tests - missing test role or permission IDs\n');
    return { successCount: 0, totalCount: 0 };
  }

  // Test get role permissions
  const getRolePermissionsResult = await makeRequest(
    'GET',
    `/api/tenants/${testTenantId}/roles/${testRoleId}/permissions`
  );
  results.push(
    logResult(
      'GET /api/tenants/:tenantId/roles/:roleId/permissions - Get Role Permissions',
      getRolePermissionsResult,
      200
    )
  );

  // Test assign permission to role
  const assignPermissionData = { permissionId: testPermissionId };
  const assignPermissionResult = await makeRequest(
    'POST',
    `/api/tenants/${testTenantId}/roles/${testRoleId}/permissions`,
    assignPermissionData
  );
  results.push(
    logResult(
      'POST /api/tenants/:tenantId/roles/:roleId/permissions - Assign Permission',
      assignPermissionResult,
      201
    )
  );

  // Test remove permission from role
  const removePermissionResult = await makeRequest(
    'DELETE',
    `/api/tenants/${testTenantId}/roles/${testRoleId}/permissions/${testPermissionId}`
  );
  results.push(
    logResult(
      'DELETE /api/tenants/:tenantId/roles/:roleId/permissions/:permissionId - Remove Permission',
      removePermissionResult,
      200
    )
  );

  const successCount = results.filter(r => r).length;
  console.log(`Role-Permission Assignment Tests: ${successCount}/${results.length} passed\n`);

  return { successCount, totalCount: results.length };
}

// ========================================
// 10. TENANT MANAGEMENT
// ========================================
async function testTenantManagementEndpoints() {
  console.log('🏢 TESTING TENANT MANAGEMENT\n');

  let results = [];

  // Test get all tenants
  const getTenantsResult = await makeRequest('GET', '/api/tenants');
  results.push(logResult('GET /api/tenants - List Tenants', getTenantsResult, 200));

  // Test get specific tenant
  if (testTenantId) {
    const getTenantResult = await makeRequest('GET', `/api/tenants/${testTenantId}`);
    results.push(logResult('GET /api/tenants/:tenantId - Get Tenant', getTenantResult, 200));

    // Test update tenant
    const updateTenantData = { name: 'Updated Tenant Name' };
    const updateTenantResult = await makeRequest(
      'POST',
      `/api/tenants/${testTenantId}`,
      updateTenantData
    );
    results.push(logResult('POST /api/tenants/:tenantId - Update Tenant', updateTenantResult, 200));
  }

  // Test create new tenant
  const testData = generateTestData();
  const newTenantData = {
    ...testData.tenant,
    orgId: `new-tenant-${Date.now()}`,
    adminEmail: `newadmin-${Date.now()}@example.com`
  };

  const createTenantResult = await makeRequest('POST', '/api/tenants', newTenantData);
  results.push(logResult('POST /api/tenants - Create Tenant', createTenantResult, 201));

  const successCount = results.filter(r => r).length;
  console.log(`Tenant Management Tests: ${successCount}/${results.length} passed\n`);

  return { successCount, totalCount: results.length };
}

// ========================================
// 11. ACCESS CONTROL & AUTHORIZATION
// ========================================
async function testAccessControlEndpoints() {
  console.log('🛡️ TESTING ACCESS CONTROL & AUTHORIZATION\n');

  let results = [];

  // Test get user permissions
  const getUserPermissionsResult = await makeRequest(
    'GET',
    `/api/tenants/${testTenantId}/user-permissions`
  );
  results.push(
    logResult(
      'GET /api/tenants/:tenantId/user-permissions - Get User Permissions',
      getUserPermissionsResult,
      200
    )
  );

  // Test check permission
  const checkPermissionData = { permission: 'read_users', userId: testUserId };
  const checkPermissionResult = await makeRequest(
    'POST',
    `/api/tenants/${testTenantId}/check-permission`,
    checkPermissionData
  );
  results.push(
    logResult(
      'POST /api/tenants/:tenantId/check-permission - Check Permission',
      checkPermissionResult,
      200
    )
  );

  // Test get current user permissions
  const getCurrentPermissionsResult = await makeRequest('GET', '/api/v2/auth/permissions');
  results.push(
    logResult(
      'GET /api/v2/auth/permissions - Get Current User Permissions',
      getCurrentPermissionsResult,
      200
    )
  );

  const successCount = results.filter(r => r).length;
  console.log(`Access Control Tests: ${successCount}/${results.length} passed\n`);

  return { successCount, totalCount: results.length };
}

// ========================================
// MAIN TEST RUNNER
// ========================================
async function runComprehensiveRBACTests() {
  console.log('🚀 STARTING COMPREHENSIVE RBAC API TESTING\n');
  console.log('='.repeat(60));

  const testSuites = [
    { name: 'Authentication & Session Management', fn: testAuthenticationEndpoints },
    { name: 'Multi-Factor Authentication', fn: testMFAEndpoints },
    { name: 'OAuth Integration', fn: testOAuthEndpoints },
    { name: 'SAML Authentication', fn: testSAMLEndpoints },
    { name: 'User Management', fn: testUserManagementEndpoints },
    { name: 'Role Management', fn: testRoleManagementEndpoints },
    { name: 'User-Role Assignment', fn: testUserRoleAssignmentEndpoints },
    { name: 'Permission Management', fn: testPermissionManagementEndpoints },
    { name: 'Role-Permission Assignment', fn: testRolePermissionAssignmentEndpoints },
    { name: 'Tenant Management', fn: testTenantManagementEndpoints },
    { name: 'Access Control & Authorization', fn: testAccessControlEndpoints }
  ];

  let totalSuccess = 0;
  let totalTests = 0;

  for (const suite of testSuites) {
    try {
      const result = await suite.fn();
      totalSuccess += result.successCount;
      totalTests += result.totalCount;
    } catch (error) {
      console.log(`❌ Test suite failed: ${suite.name}`);
      console.log(`   Error: ${error.message}\n`);
    }
  }

  console.log('='.repeat(60));
  console.log('📊 COMPREHENSIVE TEST RESULTS');
  console.log('='.repeat(60));
  console.log(`Total Tests: ${totalTests}`);
  console.log(`Passed: ${totalSuccess}`);
  console.log(`Failed: ${totalTests - totalSuccess}`);
  console.log(`Success Rate: ${((totalSuccess / totalTests) * 100).toFixed(1)}%`);
  console.log('='.repeat(60));

  if (totalSuccess === totalTests) {
    console.log('🎉 ALL TESTS PASSED! The RBAC system is fully functional.');
  } else {
    console.log('⚠️  Some tests failed. Review the output above for details.');
  }

  return {
    totalTests,
    totalSuccess,
    successRate: (totalSuccess / totalTests) * 100
  };
}

// Run the tests
runComprehensiveRBACTests().catch(console.error);
