import { config } from "dotenv";
config();

console.log("🔍 Testing service imports...");

try {
  console.log("📧 Testing email service import...");
  const { emailService } = await import("./server/services/email");
  console.log("✅ Email service imported successfully");

  console.log("🔐 Testing auth service import...");
  const { authService } = await import("./server/services/auth");
  console.log("✅ Auth service imported successfully");

  console.log("👥 Testing platform admin auth service import...");
  const { platformAdminAuthService } = await import("./server/services/platform-admin-auth");
  console.log("✅ Platform admin auth service imported successfully");

  console.log("🔒 Testing Azure AD service import...");
  const { AzureADService } = await import("./server/services/azure-ad");
  console.log("✅ Azure AD service imported successfully");

  console.log("📊 Testing storage import...");
  const { storage } = await import("./server/storage");
  console.log("✅ Storage imported successfully");

  console.log("📋 Testing compliance service import...");
  const { complianceService } = await import("./server/services/compliance-temp");
  console.log("✅ Compliance service imported successfully");

  console.log("🎉 All services imported successfully!");
} catch (error) {
  console.error("❌ Service import failed:", error);
  process.exit(1);
}
