// Simple script to check and create demo tenant via API
async function checkAndCreateDemoTenant() {
  const baseUrl = "http://localhost:5000/api";

  try {
    console.log("🔍 Checking current tenants...");

    // Try to get the demo tenant first
    const demoCheck = await fetch(`${baseUrl}/tenants/by-org-id/demo`);

    if (demoCheck.ok) {
      const demo = await demoCheck.json();
      console.log("✅ Demo tenant already exists:", demo.name);
      return;
    }

    console.log("📋 Demo tenant not found, checking all tenants...");

    // Get all tenants to see what exists
    const allTenantsResponse = await fetch(`${baseUrl}/tenants`);

    if (allTenantsResponse.ok) {
      const allTenants = await allTenantsResponse.json();
      console.log(`Found ${allTenants.length} existing tenants:`);
      allTenants.forEach(t => {
        console.log(`  - ${t.name} (orgId: ${t.orgId})`);
      });
    }

    console.log("\n🚀 Creating demo tenant...");

    // Create demo tenant via onboarding API
    const newTenant = {
      name: "Demo Company",
      orgId: "demo",
      businessType: "Technology",
      adminEmail: "akki@primussoft.com",
      adminName: "Akki Khan",
      website: "https://demo.primussoft.com",
      description: "Demo tenant for testing",
      enabledModules: ["auth", "users", "roles"],
      moduleConfigs: {
        authentication: {
          providers: ["email"],
        },
        users: {},
        roles: {},
      },
      sendEmail: false, // Don't send email for demo
    };

    const createResponse = await fetch(`${baseUrl}/onboarding/create-tenant`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(newTenant),
    });

    if (createResponse.ok) {
      const result = await createResponse.json();
      console.log("✅ Demo tenant created successfully!");
      console.log("🔑 Temporary password:", result.temporaryPassword);
      console.log("\n🎉 You can now login at: http://localhost:5000/tenant/demo/login");
      console.log("📧 Email: akki@primussoft.com");
      console.log("🔒 Password:", result.temporaryPassword);
    } else {
      const error = await createResponse.json();
      console.error("❌ Failed to create tenant:", error);
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

checkAndCreateDemoTenant();
