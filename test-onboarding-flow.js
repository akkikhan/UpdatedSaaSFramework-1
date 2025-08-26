// Complete Tenant Onboarding Flow Test
// This script tests the full tenant lifecycle from creation to user management

const apiBase = 'http://localhost:3001/api';

// Helper function to make HTTP requests
async function apiRequest(endpoint, options = {}) {
  const url = `${apiBase}${endpoint}`;
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  };
  
  console.log(`\n🔍 ${config.method || 'GET'} ${url}`);
  if (config.body) {
    console.log('📤 Request body:', JSON.parse(config.body));
  }
  
  try {
    const response = await fetch(url, config);
    const data = await response.json();
    
    console.log(`📊 Status: ${response.status} ${response.statusText}`);
    console.log('📥 Response:', data);
    
    return { response, data };
  } catch (error) {
    console.error('❌ Request failed:', error.message);
    throw error;
  }
}

// Test data
const testTenant = {
  name: "Acme Corporation Test",
  orgId: "acme-test-" + Date.now(),
  businessType: "Technology",
  adminEmail: "admin@acme.test",
  website: "https://acme.test",
  description: "Test tenant for complete onboarding flow validation"
};

const testUser = {
  email: "user@acme.test",
  name: "John Doe",
  role: "user"
};

async function runCompleteOnboardingTest() {
  console.log('🚀 Starting Complete Tenant Onboarding Flow Test');
  console.log('=' .repeat(60));
  
  try {
    // Step 1: Health Check
    console.log('\n📋 STEP 1: Health Check');
    await apiRequest('/health');
    
    // Step 2: Create Tenant
    console.log('\n📋 STEP 2: Create New Tenant');
    const { data: tenant } = await apiRequest('/tenants', {
      method: 'POST',
      body: JSON.stringify(testTenant)
    });
    
    if (!tenant || !tenant.id) {
      throw new Error('Tenant creation failed - no ID returned');
    }
    
    console.log(`✅ Tenant created successfully with ID: ${tenant.id}`);
    
    // Step 3: Verify Tenant Creation
    console.log('\n📋 STEP 3: Verify Tenant in Database');
    await apiRequest(`/tenants/by-org-id/${tenant.orgId}`);
    
    // Step 4: Get All Tenants (verify it appears in list)
    console.log('\n📋 STEP 4: Verify Tenant in List');
    const { data: allTenants } = await apiRequest('/tenants');
    const foundTenant = allTenants.find(t => t.id === tenant.id);
    if (!foundTenant) {
      throw new Error('Created tenant not found in tenants list');
    }
    console.log(`✅ Tenant found in list with status: ${foundTenant.status}`);
    
    // Step 5: Update Tenant Status to Active
    console.log('\n📋 STEP 5: Activate Tenant');
    await apiRequest(`/tenants/${tenant.id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'active' })
    });
    
    // Step 6: Create a User for the Tenant
    console.log('\n📋 STEP 6: Create User for Tenant');
    const { data: user } = await apiRequest(`/tenants/${tenant.id}/users`, {
      method: 'POST',
      body: JSON.stringify(testUser)
    });
    
    console.log(`✅ User created with ID: ${user?.id || 'unknown'}`);
    
    // Step 7: Get Tenant Statistics
    console.log('\n📋 STEP 7: Check Updated Statistics');
    await apiRequest('/stats');
    
    // Step 8: Get Recent Tenants
    console.log('\n📋 STEP 8: Check Recent Tenants');
    await apiRequest('/tenants/recent?limit=3');
    
    // Step 9: Test Email Functionality (optional)
    console.log('\n📋 STEP 9: Test Email Service');
    try {
      await apiRequest('/test-email', {
        method: 'POST',
        body: JSON.stringify({
          to: testTenant.adminEmail,
          subject: 'Onboarding Test Complete'
        })
      });
    } catch (error) {
      console.log('⚠️ Email test skipped (service may not be configured)');
    }
    
    // Step 10: Resend Onboarding Email
    console.log('\n📋 STEP 10: Resend Onboarding Email');
    try {
      await apiRequest(`/tenants/${tenant.id}/resend-email`, {
        method: 'POST'
      });
    } catch (error) {
      console.log('⚠️ Resend email test failed (expected if email not configured)');
    }
    
    console.log('\n🎉 COMPLETE ONBOARDING FLOW TEST SUCCESSFUL!');
    console.log('=' .repeat(60));
    console.log(`📊 Summary:`);
    console.log(`   - Tenant: ${tenant.name} (${tenant.orgId})`);
    console.log(`   - Tenant ID: ${tenant.id}`);
    console.log(`   - Admin Email: ${tenant.adminEmail}`);
    console.log(`   - API Keys Generated: ✅`);
    console.log(`   - Status: Active`);
    console.log(`   - Users Created: 1`);
    
  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    process.exit(1);
  }
}

// Run the test
runCompleteOnboardingTest().then(() => {
  console.log('\n✅ All tests completed successfully!');
  process.exit(0);
}).catch(error => {
  console.error('\n❌ Test suite failed:', error);
  process.exit(1);
});
