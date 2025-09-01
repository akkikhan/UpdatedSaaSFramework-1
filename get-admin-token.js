// Quick script to login and get a platform admin token
const API_BASE = "http://localhost:5000";

async function loginAsAdmin() {
  console.log("🔐 Attempting to login as platform admin...\n");

  // Try to login with default admin credentials
  const credentials = {
    email: "admin@yourcompany.com",
    password: "admin123", // You may need to change this
  };

  try {
    const response = await fetch(`${API_BASE}/api/platform/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(credentials),
    });

    if (response.ok) {
      const data = await response.json();
      console.log("✅ Login successful!");
      console.log("\n📋 Token:", data.token);
      console.log("\n📌 Admin Info:");
      console.log("   Email:", data.admin.email);
      console.log("   Name:", data.admin.name);
      console.log("   Role:", data.admin.role);

      console.log("\n💡 To test APIs, run:");
      console.log(`   node test-pa-apis-cli.js "${data.token}"`);

      return data.token;
    } else {
      const error = await response.text();
      console.log("❌ Login failed:", error);
      console.log("\nNote: You may need to:");
      console.log("1. Create a platform admin first");
      console.log("2. Use Azure AD login at http://localhost:5000/admin/login");
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
    console.log("\nMake sure the server is running on port 5000");
  }
}

loginAsAdmin();
