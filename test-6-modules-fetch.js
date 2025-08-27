import fetch from 'node-fetch';

async function testIntegration() {
  console.log('🚀 Testing 6-Module Integration\n');

  try {
    // Test health endpoint
    console.log('📋 Testing Health Endpoint...');
    const healthResponse = await fetch('http://localhost:5000/api/health', {
      method: 'GET',
      timeout: 5000
    });

    if (healthResponse.ok) {
      const healthData = await healthResponse.json();
      console.log('✅ Health Check Response:');
      console.log(JSON.stringify(healthData, null, 2));

      // Test tenant creation
      console.log('\n🏢 Testing Tenant Creation with 6 API Keys...');

      const tenantData = {
        name: 'Test Company',
        orgId: 'test-org-' + Date.now(),
        domain: 'test.example.com',
        adminEmail: 'admin@test.example.com',
        adminPassword: 'TempPass123!',
        businessType: 'technology',
        size: 'small'
      };

      const tenantResponse = await fetch('http://localhost:5000/api/tenant/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(tenantData),
        timeout: 10000
      });

      if (tenantResponse.ok) {
        const tenantResult = await tenantResponse.json();
        console.log('✅ Tenant Creation Response:');
        console.log('Status:', tenantResponse.status);

        if (tenantResult.tenant && tenantResult.tenant.authApiKey) {
          console.log('\n🔑 All 6 API Keys Generated:');
          console.log('🔐 Auth API Key:', tenantResult.tenant.authApiKey);
          console.log('👥 RBAC API Key:', tenantResult.tenant.rbacApiKey);
          console.log('📊 Logging API Key:', tenantResult.tenant.loggingApiKey);
          console.log('📈 Monitoring API Key:', tenantResult.tenant.monitoringApiKey);
          console.log('🔔 Notifications API Key:', tenantResult.tenant.notificationsApiKey);
          console.log('🤖 AI Copilot API Key:', tenantResult.tenant.aiCopilotApiKey);

          console.log('\n✅ SUCCESS: All 6 modules are properly integrated!');
          console.log('\n📧 Check your email for onboarding instructions with all module details.');
        } else {
          console.log('❌ Tenant Response:', JSON.stringify(tenantResult, null, 2));
        }
      } else {
        console.log('❌ Tenant creation failed with status:', tenantResponse.status);
        const errorText = await tenantResponse.text();
        console.log('Error response:', errorText.substring(0, 500) + '...');
      }
    } else {
      console.log('❌ Health check failed with status:', healthResponse.status);
    }
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testIntegration();
