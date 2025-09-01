const jwt = require('jsonwebtoken');

// Generate a test token
const testToken = jwt.sign({
    adminId: 'test-admin-id',
    email: 'test-admin@platform.com',
    name: 'Test Admin',
    role: 'super_admin',
    type: 'platform_admin'
}, 'your-jwt-secret', { expiresIn: '1h' });

console.log('🔑 Test token generated:');
console.log(testToken);

// Test logout endpoint
console.log('\n📋 Testing logout endpoint:');
console.log('curl -X POST -H "Authorization: Bearer ' + testToken + '" http://localhost:5000/api/platform/auth/logout');

// Test token refresh endpoint
console.log('\n📋 Testing token refresh endpoint:');
console.log('curl -X POST -H "Authorization: Bearer ' + testToken + '" http://localhost:5000/api/platform/auth/refresh');
