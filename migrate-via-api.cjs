// Migration using server API approach

async function migrateExistingTenant() {
  try {
    console.log("🔄 Migrating existing tenant user via API...");

    // First check if server is running
    const healthCheck = await fetch("http://localhost:5000/api/health");
    if (!healthCheck.ok) {
      throw new Error("Server is not running");
    }
    console.log("✅ Server is running");

    // Step 1: Check if tenant exists
    const tenantResponse = await fetch(
      "http://localhost:5000/api/tenants/akki-test-638923509655646643"
    );
    if (!tenantResponse.ok) {
      console.log("❌ Tenant not found");
      return;
    }

    const tenant = await tenantResponse.json();
    console.log(`✅ Found tenant: ${tenant.name} (${tenant.orgId})`);

    // Step 2: Try to login to see if user already exists
    const loginData = {
      email: "akki@primussoft.com",
      password: "temp123!",
    };

    const loginResponse = await fetch(
      `http://localhost:5000/api/v2/auth/login?orgId=akki-test-638923509655646643`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(loginData),
      }
    );

    if (loginResponse.ok) {
      console.log("✅ User can already login - migration not needed");
      return;
    }

    console.log("📝 User cannot login, proceeding with migration...");

    // Step 3: Create tenant user directly in the database via SQL
    // We'll use a simple approach - create the user record manually
    const createUserData = {
      tenantId: tenant.id,
      email: "akki@primussoft.com",
      name: "Akki Khan",
      password: "temp123!",
    };

    // Since there's no direct API for this, we'll use a SQL approach
    // Let's create a temporary endpoint or use direct insertion
    console.log("🔧 Manual migration required...");
    console.log("The user needs to be created manually in the tenantUsers table");
    console.log(`Tenant ID: ${tenant.id}`);
    console.log("Email: akki@primussoft.com");
    console.log("Password: temp123! (needs to be hashed)");
  } catch (error) {
    console.error("❌ Migration error:", error.message);
  }
}

migrateExistingTenant().catch(console.error);
