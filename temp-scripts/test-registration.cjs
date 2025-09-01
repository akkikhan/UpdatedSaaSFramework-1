const fetch = require('node-fetch');

const timestamp = Date.now();
const testData = {
  name: `Test Company ${timestamp}`,
  orgId: `test-company-${timestamp}`,
  adminEmail: `admin${timestamp}@test.com`,
  adminName: "Test Admin",
  adminPassword: "TestPassword123!",
  enabledModules: ["auth", "rbac"]
};

async function testRegistration() {
  try {
    console.log('🚀 Testing tenant registration...');
    console.log('📋 Test data:', testData);
    
    const response = await fetch('http://localhost:5000/api/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testData)
    });
    
    const responseText = await response.text();
    console.log('📡 Response status:', response.status);
    
    if (response.ok) {
      const data = JSON.parse(responseText);
      console.log('✅ Registration successful!');
      console.log('📦 Response data:', JSON.stringify(data, null, 2));
    } else {
      console.log('❌ Registration failed!');
      console.log('🔴 Error response:', responseText);
    }
  } catch (error) {
    console.error('💥 Request error:', error.message);
  }
}

testRegistration();
