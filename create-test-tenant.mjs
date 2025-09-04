import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000';

// Test tenant configuration
const TEST_TENANT = {
  name: 'Test Company',
  orgId: 'test-company',
  adminEmail: 'admin@test.com',
  adminName: 'Test Admin',
  adminPassword: 'TestPassword123!',
  enabledModules: ['auth', 'rbac']
};

async function waitForServer() {
  console.log('⏳ Waiting for server to be ready...');
  for (let i = 0; i < 30; i++) {
    try {
      const response = await fetch(`${BASE_URL}/api/health`);
      if (response.ok) {
        console.log('✅ Server is ready!');
        return true;
      }
    } catch (error) {
      // Server not ready yet
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  console.error('❌ Server did not start in time');
  return false;
}

async function checkTenantExists() {
  console.log(`🔍 Checking if tenant "${TEST_TENANT.orgId}" exists...`);
  try {
    const response = await fetch(`${BASE_URL}/api/tenants/by-org-id/${TEST_TENANT.orgId}`);
    if (response.ok) {
      const tenant = await response.json();
      console.log(`✅ Tenant already exists: ${tenant.name} (${tenant.orgId})`);
      return true;
    }
  } catch (error) {
    // Tenant doesn't exist
  }
  return false;
}

async function createTenant() {
  console.log(`📝 Creating tenant "${TEST_TENANT.orgId}"...`);
  
  try {
    const response = await fetch(`${BASE_URL}/api/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(TEST_TENANT)
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('❌ Failed to create tenant:', data.message);
      return false;
    }

    console.log('✅ Tenant created successfully!');
    console.log('   ID:', data.tenant.id);
    console.log('   Name:', data.tenant.name);
    console.log('   OrgId:', data.tenant.orgId);
    console.log('   Status:', data.tenant.status);
    return true;
  } catch (error) {
    console.error('❌ Error creating tenant:', error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Test Tenant Setup');
  console.log('====================\n');

  // Wait for server to be ready
  const serverReady = await waitForServer();
  if (!serverReady) {
    console.error('❌ Please start the server first with: npm run dev');
    process.exit(1);
  }

  // Check if tenant already exists
  const exists = await checkTenantExists();
  
  if (!exists) {
    // Create the tenant
    const created = await createTenant();
    if (!created) {
      console.error('❌ Failed to create tenant');
      process.exit(1);
    }
  }

  console.log('\n====================');
  console.log('✅ Setup Complete!\n');
  console.log('📱 You can now login at:');
  console.log(`   ${BASE_URL}/tenant/${TEST_TENANT.orgId}/login\n`);
  console.log('🔑 Credentials:');
  console.log(`   Email: ${TEST_TENANT.adminEmail}`);
  console.log(`   Password: ${TEST_TENANT.adminPassword}\n`);
}

main().catch(console.error);
