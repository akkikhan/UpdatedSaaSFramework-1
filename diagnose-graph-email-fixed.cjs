// Microsoft Graph Email Diagnostic Tool
const https = require("https");
const fs = require("fs");
const path = require("path");

// Load environment variables from .env file
function loadEnvFile() {
  try {
    const envPath = path.join(__dirname, ".env");
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, "utf8");
      envContent.split("\n").forEach(line => {
        const trimmedLine = line.trim();
        if (trimmedLine && !trimmedLine.startsWith("#")) {
          const equalIndex = trimmedLine.indexOf("=");
          if (equalIndex > 0) {
            const key = trimmedLine.substring(0, equalIndex).trim();
            const value = trimmedLine.substring(equalIndex + 1).trim();
            if (key && !process.env[key]) {
              process.env[key] = value;
            }
          }
        }
      });
      console.log("✅ Loaded environment variables from .env file\n");
      return true;
    } else {
      console.log("⚠️  .env file not found\n");
      return false;
    }
  } catch (e) {
    console.log("⚠️  Could not load .env file:", e.message, "\n");
    return false;
  }
}

console.log("🔍 Microsoft Graph Email Service Diagnostics");
console.log("=".repeat(50));

// Load environment first
loadEnvFile();

// Check environment variables
console.log("📋 Environment Variables:");
const requiredEnvVars = ["AZURE_TENANT_ID", "AZURE_CLIENT_ID", "AZURE_CLIENT_SECRET", "EMAIL_FROM"];
let envConfigured = true;

requiredEnvVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    console.log(`✅ ${varName}: ${varName === "AZURE_CLIENT_SECRET" ? "***hidden***" : value}`);
  } else {
    console.log(`❌ ${varName}: NOT SET`);
    envConfigured = false;
  }
});

if (!envConfigured) {
  console.log("\n⚠️  Some environment variables are missing. Please check your .env file.");
  console.log("\n📝 Required variables:");
  console.log("   AZURE_TENANT_ID=your-tenant-id");
  console.log("   AZURE_CLIENT_ID=your-client-id");
  console.log("   AZURE_CLIENT_SECRET=your-client-secret");
  console.log("   EMAIL_FROM=your-from-email@domain.com");
  process.exit(1);
}

// Test Azure AD token endpoint
async function testTokenEndpoint() {
  return new Promise((resolve, reject) => {
    const data = new URLSearchParams({
      client_id: process.env.AZURE_CLIENT_ID,
      client_secret: process.env.AZURE_CLIENT_SECRET,
      scope: "https://graph.microsoft.com/.default",
      grant_type: "client_credentials",
    }).toString();

    const options = {
      hostname: "login.microsoftonline.com",
      port: 443,
      path: `/${process.env.AZURE_TENANT_ID}/oauth2/v2.0/token`,
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Content-Length": data.length,
      },
    };

    const req = https.request(options, res => {
      let responseData = "";
      res.on("data", chunk => (responseData += chunk));
      res.on("end", () => {
        try {
          const result = JSON.parse(responseData);
          if (result.access_token) {
            resolve({ success: true, token: result.access_token });
          } else {
            resolve({ success: false, error: result });
          }
        } catch (e) {
          resolve({ success: false, error: responseData });
        }
      });
    });

    req.on("error", error => resolve({ success: false, error: error.message }));
    req.write(data);
    req.end();
  });
}

async function runDiagnostics() {
  console.log("\n🔐 Testing Azure AD Authentication:");

  try {
    const tokenResult = await testTokenEndpoint();

    if (tokenResult.success) {
      console.log("✅ Successfully obtained access token from Azure AD");
      console.log("✅ Client credentials are valid");

      // Check token permissions (basic validation)
      try {
        const tokenPayload = JSON.parse(
          Buffer.from(tokenResult.token.split(".")[1], "base64").toString()
        );
        console.log(`✅ Token issued for app: ${tokenPayload.appid || "N/A"}`);
        console.log(`✅ Token audience: ${tokenPayload.aud || "N/A"}`);

        const permissions = tokenPayload.roles || [];
        console.log(
          `✅ Token permissions: ${permissions.length > 0 ? permissions.join(", ") : "None found"}`
        );

        if (permissions.includes("Mail.Send")) {
          console.log("✅ Mail.Send permission found in token - Email should work!");
        } else {
          console.log("❌ Mail.Send permission NOT found in token");
          console.log("   This is why you're getting 401 errors!");
          console.log("   📋 Action needed: Add Mail.Send permission to your Azure AD app");
        }
      } catch (e) {
        console.log("⚠️  Could not decode token payload");
      }
    } else {
      console.log("❌ Failed to obtain access token");
      console.log("Error details:", tokenResult.error);

      if (tokenResult.error.error === "invalid_client") {
        console.log("\n💡 Troubleshooting:");
        console.log("   - Check AZURE_CLIENT_ID and AZURE_CLIENT_SECRET");
        console.log("   - Verify the client secret hasn't expired");
        console.log("   - Ensure the app registration exists in the specified tenant");
      } else if (tokenResult.error.error === "unauthorized_client") {
        console.log("\n💡 Troubleshooting:");
        console.log("   - The app needs 'Mail.Send' application permission");
        console.log("   - Admin consent must be granted");
      }
    }
  } catch (error) {
    console.log("❌ Network error testing Azure AD:", error.message);
  }

  console.log("\n📧 Email Configuration Summary:");
  console.log(`   From Email: ${process.env.EMAIL_FROM}`);
  console.log(`   Tenant ID: ${process.env.AZURE_TENANT_ID}`);

  console.log("\n💡 Next Steps to fix 401 errors:");
  console.log("1. Go to Azure Portal > App registrations > Your app");
  console.log("2. Navigate to 'API permissions' tab");
  console.log("3. Click 'Add a permission' > Microsoft Graph > Application permissions");
  console.log("4. Search for and add 'Mail.Send'");
  console.log("5. Click 'Grant admin consent for [Your Organization]'");
  console.log("6. Wait 2-3 minutes for permissions to propagate");
  console.log("7. Restart your Node.js application");
  console.log("\n🎯 The 401 error should be resolved after adding Mail.Send permission!");
}

runDiagnostics();
