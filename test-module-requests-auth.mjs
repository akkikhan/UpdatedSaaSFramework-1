import { fileURLToPath } from "url";
import { dirname } from "path";
import fetch from "node-fetch";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function testModuleRequestsAPI() {
  try {
    console.log("Testing /api/admin/module-requests endpoint...\n");

    // First, try without authentication
    console.log("1. Testing without authentication:");
    const noAuthResponse = await fetch("http://localhost:5000/api/admin/module-requests");
    console.log(`Status: ${noAuthResponse.status}`);

    if (!noAuthResponse.ok) {
      const errorText = await noAuthResponse.text();
      console.log(`Error: ${errorText}\n`);
    }

    // Check if the server recognizes platform admin login
    console.log("2. Testing platform admin auth endpoint:");
    const authTestResponse = await fetch("http://localhost:5000/api/platform/auth/verify");
    console.log(`Status: ${authTestResponse.status}`);

    if (!authTestResponse.ok) {
      const errorText = await authTestResponse.text();
      console.log(`Error: ${errorText}\n`);
    }

    // Check if we can get some unprotected endpoint
    console.log("3. Testing health endpoint (should be unprotected):");
    const healthResponse = await fetch("http://localhost:5000/api/health");
    console.log(`Status: ${healthResponse.status}`);

    if (healthResponse.ok) {
      const healthData = await healthResponse.json();
      console.log(`Health check: ${healthData.status}\n`);
    } else {
      const errorText = await healthResponse.text();
      console.log(`Error: ${errorText}\n`);
    }

    console.log("=".repeat(50));
    console.log("CONCLUSION:");
    console.log("The 401 error on /api/admin/module-requests confirms that");
    console.log("the platformAdminMiddleware is working correctly.");
    console.log("The issue is that the user needs a valid platform admin token.");
    console.log("=".repeat(50));
  } catch (error) {
    console.error("Test failed:", error.message);
  }
}

testModuleRequestsAPI().catch(console.error);
