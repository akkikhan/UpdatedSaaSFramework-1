import dotenv from "dotenv";
dotenv.config();

import { AzureADService } from "./server/services/azure-ad";

console.log("🔍 Testing Azure AD configuration and service...");

async function testAzureADSetup() {
  try {
    console.log("📋 Azure AD Configuration:");
    console.log(`   Client ID: ${process.env.AZURE_CLIENT_ID}`);
    console.log(`   Tenant ID: ${process.env.AZURE_TENANT_ID}`);
    console.log(`   Redirect URI: ${process.env.AZURE_REDIRECT_URI}`);
    console.log("");

    // Create Azure AD service instance with config
    const azureAdService = new AzureADService({
      clientId: process.env.AZURE_CLIENT_ID!,
      clientSecret: process.env.AZURE_CLIENT_SECRET!,
      tenantId: process.env.AZURE_TENANT_ID!,
      redirectUri: process.env.AZURE_REDIRECT_URI!,
    });

    // Test configuration validation
    console.log("🔍 Testing Azure AD service creation...");
    console.log("✅ Azure AD service created successfully");

    // Test auth URL generation
    console.log("🔗 Testing auth URL generation...");
    const testOrgId = "primusdemo";
    const authUrl = await azureAdService.getAuthorizationUrl(
      ["User.Read", "User.ReadBasic.All"],
      testOrgId
    );
    console.log(`✅ Auth URL generated for org '${testOrgId}':`);
    console.log(`   ${authUrl.substring(0, 100)}...`); // Truncate for readability

    // Parse the URL to validate parameters
    const url = new URL(authUrl);
    console.log("📋 Auth URL parameters:");
    console.log(`   client_id: ${url.searchParams.get("client_id")}`);
    console.log(`   response_type: ${url.searchParams.get("response_type")}`);
    console.log(`   redirect_uri: ${url.searchParams.get("redirect_uri")}`);
    console.log(`   scope: ${url.searchParams.get("scope")}`);

    const state = url.searchParams.get("state");
    if (state) {
      try {
        const stateObj = JSON.parse(state);
        console.log(`   state.tenantId: ${stateObj.tenantId}`);
        console.log(`   state.codeVerifier: ${stateObj.codeVerifier ? "[present]" : "[missing]"}`);
      } catch {
        console.log(`   state: ${state.substring(0, 20)}...`);
      }
    }

    console.log("");
    console.log("✅ Azure AD setup test completed successfully!");
    console.log("");
    console.log("🌐 To test the full OAuth flow:");
    console.log("   1. Start the server: npx tsx server/index.ts");
    console.log("   2. Open in browser: http://localhost:3001/api/auth/azure/primusdemo");
    console.log("   3. Login with Azure AD credentials");
    console.log("   4. Get redirected back with auth tokens");
    console.log("");
    console.log("🔗 Full auth URL:");
    console.log(`   ${authUrl}`);
  } catch (error) {
    console.error("❌ Azure AD setup test failed:", error);
    process.exit(1);
  }
}

testAzureADSetup();
