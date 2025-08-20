const { SaaSAuth } = require('./dist/index.js');

// Example usage of the SaaS Auth SDK
async function exampleUsage() {
  try {
    // Initialize the auth client
    const auth = new SaaSAuth({
      apiKey: 'auth_abc123def456ghi789jkl012', // Your tenant's auth API key
      baseUrl: 'https://your-platform.replit.app/api/v2/auth'
    });

    console.log('🔐 SaaS Auth SDK Example');
    console.log('========================');
    
    // Example 1: Login user
    console.log('1. User Login:');
    try {
      const session = await auth.login('admin@acme.com', 'temp123!');
      console.log('✅ Login successful!');
      console.log('Token:', session.token.substring(0, 20) + '...');
      console.log('User:', session.user);
      
      // Example 2: Verify token
      console.log('\n2. Token Verification:');
      const isValid = await auth.verifyToken(session.token);
      console.log('✅ Token valid:', isValid);
      
      // Example 3: Get current user
      console.log('\n3. Get Current User:');
      const currentUser = await auth.getCurrentUser(session.token);
      console.log('✅ Current user:', currentUser);
      
      // Example 4: Logout
      console.log('\n4. User Logout:');
      await auth.logout(session.token);
      console.log('✅ Logout successful!');
      
    } catch (error) {
      console.log('❌ Auth operation failed:', error.message);
    }
    
    console.log('\n🎯 Example completed!');
    console.log('\nTo use this in your Express.js app:');
    console.log('app.use("/protected", auth.middleware());');
    
  } catch (error) {
    console.error('Error in example:', error);
  }
}

// Run the example
if (require.main === module) {
  exampleUsage();
}

module.exports = { exampleUsage };