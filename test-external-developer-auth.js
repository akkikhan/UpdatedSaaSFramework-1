// FUNCTIONAL TEST: External Developer Using Auth Package
// Simulating real external developer experience

const { SaaSAuth } = require("@saas-framework/auth");

// Step 1: External developer gets API key from onboarding email
const apiKey = "tenant_auth_api_key_12345"; // From email

// Step 2: Initialize auth with API key
const auth = new SaaSAuth({
  apiKey: apiKey,
  baseUrl: "http://localhost:5000",
});

// Step 3: Try to login user (most basic operation)
async function testExternalAuth() {
  try {
    console.log("🧪 Testing external auth with API key:", apiKey);

    const result = await auth.login({
      email: "test@example.com",
      password: "testpass123",
    });

    console.log("✅ SUCCESS:", result);
    return true;
  } catch (error) {
    console.log("❌ FAILED:", error.message);
    console.log("📋 Full error:", error);
    return false;
  }
}

testExternalAuth();
