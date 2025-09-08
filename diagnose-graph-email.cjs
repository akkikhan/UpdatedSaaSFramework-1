// Microsoft Graph Email Diagnostic Tool
const https = require("https");

console.log("🔍 Microsoft Graph Email Service Diagnostics");
console.log("=".repeat(50));

// Check environment variables
console.log("\n📋 Environment Variables:");
const requiredEnvVars = ["AZURE_TENANT_ID", "AZURE_CLIENT_ID", "AZURE_CLIENT_SECRET", "EMAIL_FROM"];
let envConfigured = true;

requiredEnvVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    console.log(`✅ ${varName}: ${varName === "AZURE_CLIENT_SECRET" ? "***" : value}`);
  } else {
    console.log(`❌ ${varName}: NOT SET`);
    envConfigured = false;
  }
});

if (!envConfigured) {
  console.log("\n⚠️  Some environment variables are missing. Please check your .env file.");
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
        console.log(
          `✅ Token scopes: ${tokenPayload.scp || tokenPayload.roles?.join(", ") || "N/A"}`
        );

        if (tokenPayload.roles && tokenPayload.roles.includes("Mail.Send")) {
          console.log("✅ Mail.Send permission found in token");
        } else {
          console.log("⚠️  Mail.Send permission NOT found in token");
          console.log("   This might be why you're getting 401 errors");
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
      }
    }
  } catch (error) {
    console.log("❌ Network error testing Azure AD:", error.message);
  }

  console.log("\n📧 Email Configuration:");
  console.log(`   From Email: ${process.env.EMAIL_FROM}`);
  console.log(`   Tenant ID: ${process.env.AZURE_TENANT_ID}`);

  console.log("\n💡 Next Steps if you're still getting 401 errors:");
  console.log("1. Go to Azure Portal > App registrations > Your app");
  console.log("2. Check 'API permissions' tab:");
  console.log("   - Ensure 'Mail.Send' is listed with type 'Application'");
  console.log("   - Status should show 'Granted for [Your Organization]' with green checkmark");
  console.log("3. If not granted, click 'Grant admin consent for [Organization]'");
  console.log("4. Wait a few minutes for the permission to propagate");
  console.log("5. Restart your application");
}

// Load environment variables from .env file if it exists
const fs = require("fs");
const path = require("path");

try {
  const envPath = path.join(__dirname, ".env");
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf8");
    envContent.split("\n").forEach(line => {
      const [key, value] = line.split("=");
      if (key && value && !process.env[key]) {
        process.env[key] = value.trim();
      }
    });
    console.log("✅ Loaded environment variables from .env file");
  }
} catch (e) {
  console.log("⚠️  Could not load .env file");
}

runDiagnostics();
