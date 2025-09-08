// Test Microsoft Graph Email Service
import { emailService } from "./server/services/email.js";

async function testEmailService() {
  console.log("🧪 Testing Microsoft Graph Email Service...");

  try {
    // Test connection
    console.log("\n1. Testing connection...");
    const connectionTest = await emailService.testConnection();
    console.log(`   Connection test: ${connectionTest ? "✅ Passed" : "❌ Failed"}`);

    // Test simple email (will be logged but not sent if Graph is not configured)
    console.log("\n2. Testing simple email...");
    const testEmail = await emailService.sendSimpleTestEmail(
      "test@example.com",
      "Microsoft Graph Test Email"
    );
    console.log(`   Test email: ${testEmail ? "✅ Sent" : "📧 Skipped (Graph not configured)"}`);

    // Test module status email
    console.log("\n3. Testing module status email...");
    const moduleStatusTest = await emailService.sendModuleStatusEmail(
      {
        id: "test-tenant-123",
        name: "Test Tenant",
        adminEmail: "admin@example.com",
      },
      {
        enabled: ["auth", "rbac"],
        disabled: ["logging"],
      }
    );
    console.log(
      `   Module status email: ${moduleStatusTest ? "✅ Sent" : "📧 Logged (Graph not configured)"}`
    );

    // Test onboarding email
    console.log("\n4. Testing onboarding email...");
    const onboardingTest = await emailService.sendTenantOnboardingEmail({
      id: "test-tenant-456",
      name: "Demo Tenant",
      orgId: "demo-org",
      adminEmail: "demo@example.com",
      enabledModules: ["auth", "rbac", "logging"],
      authApiKey: "test-auth-key",
    });
    console.log(
      `   Onboarding email: ${onboardingTest ? "✅ Sent" : "📧 Logged (Graph not configured)"}`
    );

    console.log("\n🎉 All email service tests completed!");
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

// Run the test
testEmailService();
