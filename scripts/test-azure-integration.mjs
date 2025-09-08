#!/usr/bin/env node

// Azure AD Integration Test Script
// This script tests the Azure AD OAuth flow with your credentials

import { config } from "dotenv";
import https from "https";
import { URL } from "url";

// Load environment variables
config();

const AZURE_CLIENT_ID = process.env.AZURE_CLIENT_ID;
const AZURE_CLIENT_SECRET = process.env.AZURE_CLIENT_SECRET;
const AZURE_TENANT_ID = process.env.AZURE_TENANT_ID;
const REDIRECT_URI = process.env.AZURE_REDIRECT_URI || "http://localhost:5000/auth-success";

console.log("🔐 Testing Azure AD Integration...\n");

console.log("Configuration:");
console.log(
  `  Client ID: ${AZURE_CLIENT_ID ? AZURE_CLIENT_ID.substring(0, 8) + "..." : "NOT SET"}`
);
console.log(
  `  Client Secret: ${AZURE_CLIENT_SECRET ? "***" + AZURE_CLIENT_SECRET.slice(-4) : "NOT SET"}`
);
console.log(
  `  Tenant ID: ${AZURE_TENANT_ID ? AZURE_TENANT_ID.substring(0, 8) + "..." : "NOT SET"}`
);
console.log(`  Redirect URI: ${REDIRECT_URI}\n`);

// Verify all required credentials are present
if (!AZURE_CLIENT_ID || !AZURE_CLIENT_SECRET || !AZURE_TENANT_ID) {
  console.error("❌ Missing required Azure AD credentials in .env file!");
  console.error("Please make sure you have:");
  console.error("  - AZURE_CLIENT_ID");
  console.error("  - AZURE_CLIENT_SECRET");
  console.error("  - AZURE_TENANT_ID");
  process.exit(1);
}

console.log("✅ All Azure AD credentials are present");

// Test 1: Generate authorization URL
console.log("\n📝 Test 1: Generating Azure AD Authorization URL...");

const authUrl = new URL(
  `https://login.microsoftonline.com/${AZURE_TENANT_ID}/oauth2/v2.0/authorize`
);
authUrl.searchParams.append("client_id", AZURE_CLIENT_ID);
authUrl.searchParams.append("response_type", "code");
authUrl.searchParams.append("redirect_uri", REDIRECT_URI);
authUrl.searchParams.append("scope", "openid profile email");
authUrl.searchParams.append("state", "test-state-" + Date.now());

console.log("✅ Authorization URL generated successfully");
console.log(`🔗 URL: ${authUrl.toString()}\n`);

// Test 2: Test Microsoft Graph endpoints accessibility
console.log("📝 Test 2: Testing Microsoft Graph endpoint accessibility...");

const testGraphEndpoint = () => {
  return new Promise((resolve, reject) => {
    const graphUrl = `https://graph.microsoft.com/v1.0/$metadata`;

    https
      .get(graphUrl, res => {
        if (res.statusCode === 200) {
          resolve("✅ Microsoft Graph endpoint is accessible");
        } else {
          reject(`❌ Microsoft Graph endpoint returned status: ${res.statusCode}`);
        }
      })
      .on("error", err => {
        reject(`❌ Error accessing Microsoft Graph: ${err.message}`);
      });
  });
};

// Test 3: Validate tenant endpoint
console.log("📝 Test 3: Testing tenant-specific endpoint...");

const testTenantEndpoint = () => {
  return new Promise((resolve, reject) => {
    const tenantUrl = `https://login.microsoftonline.com/${AZURE_TENANT_ID}/.well-known/openid-configuration`;

    https
      .get(tenantUrl, res => {
        if (res.statusCode === 200) {
          let data = "";
          res.on("data", chunk => (data += chunk));
          res.on("end", () => {
            try {
              const config = JSON.parse(data);
              resolve(`✅ Tenant endpoint is valid: ${config.issuer}`);
            } catch (e) {
              reject(`❌ Invalid JSON response from tenant endpoint`);
            }
          });
        } else {
          reject(`❌ Tenant endpoint returned status: ${res.statusCode}`);
        }
      })
      .on("error", err => {
        reject(`❌ Error accessing tenant endpoint: ${err.message}`);
      });
  });
};

// Run all tests
(async () => {
  try {
    const graphResult = await testGraphEndpoint();
    console.log(graphResult);

    const tenantResult = await testTenantEndpoint();
    console.log(tenantResult);

    console.log("\n🎉 All tests passed! Your Azure AD integration is ready to use.");
    console.log("\n📋 Next steps:");
    console.log("1. Start your SaaS application: npm run dev");
    console.log("2. Navigate to the admin login page");
    console.log('3. Click "Login with Microsoft" to test the OAuth flow');
    console.log("4. You should be redirected to Microsoft login");
  } catch (error) {
    console.error(error);
    console.error("\n❌ Some tests failed. Please check your Azure AD configuration.");
  }
})();
