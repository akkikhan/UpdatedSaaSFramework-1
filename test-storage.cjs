const { storage } = require('./server/storage.js');

async function testCreateTenantUser() {
  console.log('🧪 Testing createTenantUser method...');
  
  try {
    // Test data
    const testUser = {
      tenantId: 'f32a5a4b-407f-4ae8-be59-cc9ce47bc719', // Use existing tenant ID
      email: 'test-user-' + Date.now() + '@example.com',
      passwordHash: 'hashedpassword123',
      firstName: 'Test',
      lastName: 'User',
      status: 'active'
    };

    console.log('📝 Testing with data:', testUser);
    
    const result = await storage.createTenantUser(testUser);
    console.log('✅ createTenantUser SUCCESS:', result);
    console.log('🎉 TASK 1.2 VERIFIED: Storage methods working');
    
  } catch (error) {
    console.error('❌ createTenantUser FAILED:', error.message);
    console.error('🚨 TASK 1.2 NEEDS FIXING');
  }
}

testCreateTenantUser();
