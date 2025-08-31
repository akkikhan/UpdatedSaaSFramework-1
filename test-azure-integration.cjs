// Azure AD Integration Test Script
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3001';

async function testAzureADIntegration() {
  console.log('🧪 Testing Azure AD Integration...');
  
  try {
    // Step 1: Platform Admin Login
    console.log('\n1️⃣ Testing Platform Admin Login...');
    const loginResponse = await fetch(`${BASE_URL}/api/platform/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@yourcompany.com',
        password: 'admin123'
      })
    });

    if (!loginResponse.ok) {
      throw new Error(`Login failed: ${loginResponse.status}`);
    }

    const loginData = await loginResponse.json();
    const platformAdminToken = loginData.token;
    console.log('✅ Platform admin logged in successfully');
    console.log(`👤 Admin: ${loginData.admin?.name || 'Unknown'}`);

    // Step 2: Create Test Tenant
    console.log('\n2️⃣ Creating Test Tenant...');
    const tenantResponse = await fetch(`${BASE_URL}/api/tenants`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${platformAdminToken}`
      },
      body: JSON.stringify({
        orgId: 'azure-test',
        name: 'Azure Test Organization',
        adminEmail: 'admin@azure-test.com'
      })
    });

    let tenantData;
    if (tenantResponse.status === 201) {
      tenantData = await tenantResponse.json();
      console.log('✅ Test tenant created successfully');
      console.log(`🏢 Tenant: ${tenantData.name} (${tenantData.orgId})`);
    } else if (tenantResponse.status === 400) {
      // Tenant already exists
      console.log('ℹ️ Test tenant already exists');
      const existingResponse = await fetch(`${BASE_URL}/api/tenants/by-org-id/azure-test`, {
        headers: { 'Authorization': `Bearer ${platformAdminToken}` }
      });
      tenantData = await existingResponse.json();
      console.log(`🏢 Using existing tenant: ${tenantData.name} (${tenantData.orgId})`);
    } else {
      throw new Error(`Failed to create tenant: ${tenantResponse.status}`);
    }

    // Step 3: Configure Azure AD for Tenant
    console.log('\n3️⃣ Configuring Azure AD...');
    const azureConfigResponse = await fetch(`${BASE_URL}/api/tenants/${tenantData.id}/azure-ad/config`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${platformAdminToken}`
      },
      body: JSON.stringify({
        tenantId: 'a9b098fe-88ea-4d0e-ab4b-50ac1c7ce15e',
        clientId: '8265bd99-a6e6-4ce7-8f82-a3356c85896d',
        clientSecret: 'AcQ8Q~QgBI0JZA8CsouMRxPaee9a0ngc1dYYJaNR',
        callbackUrl: 'http://localhost:3001/api/auth/azure/callback'
      })
    });

    if (!azureConfigResponse.ok) {
      const errorData = await azureConfigResponse.json();
      throw new Error(`Azure AD config failed: ${errorData.message}`);
    }

    const azureConfigData = await azureConfigResponse.json();
    console.log('✅ Azure AD configured successfully');
    console.log(`🔧 Provider: ${azureConfigData.provider?.name || 'Azure AD SSO'}`);

    // Step 4: Test Azure AD Configuration
    console.log('\n4️⃣ Testing Azure AD Configuration...');
    const testResponse = await fetch(`${BASE_URL}/api/tenants/${tenantData.id}/azure-ad/test`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${platformAdminToken}` }
    });

    if (!testResponse.ok) {
      const errorData = await testResponse.json();
      throw new Error(`Azure AD test failed: ${errorData.message}`);
    }

    const testData = await testResponse.json();
    console.log('✅ Azure AD configuration test passed');
    console.log(`🔗 Test auth URL generated: ${testData.testAuthUrl ? 'Yes' : 'No'}`);

    // Step 5: Generate OAuth URL for Manual Testing
    console.log('\n5️⃣ Generating OAuth URL...');
    const oauthResponse = await fetch(`${BASE_URL}/api/auth/azure/azure-test`);
    
    if (!oauthResponse.ok) {
      const errorData = await oauthResponse.json();
      throw new Error(`OAuth URL generation failed: ${errorData.message}`);
    }

    const oauthData = await oauthResponse.json();
    console.log('✅ OAuth URL generated successfully');
    console.log('\n🔗 **AZURE AD LOGIN URL**:');
    console.log(oauthData.authUrl);
    console.log('\n📝 **MANUAL TESTING INSTRUCTIONS**:');
    console.log('1. Copy the URL above');
    console.log('2. Open it in your browser');  
    console.log('3. Login with your Azure AD account (khan.aakib@outlook.com)');
    console.log('4. You should be redirected back to: http://localhost:3001/auth/success');
    console.log('5. Check the server logs for user provisioning details');

    console.log('\n🎉 **AZURE AD INTEGRATION TEST COMPLETE**');
    console.log('✅ Platform admin authentication working');
    console.log('✅ Tenant creation working');
    console.log('✅ Azure AD configuration working');
    console.log('✅ OAuth URL generation working');
    console.log('🧪 Ready for manual OAuth flow testing');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
testAzureADIntegration();
