// Simple test script to call the demo server health endpoint and create a demo tenant
// Usage: node test-trigger.js

async function main() {
  try {
    console.log("Calling /health...");
    const h = await (await fetch("http://localhost:5000/health")).json();
    console.log("Health response:", JSON.stringify(h, null, 2));
  } catch (err) {
    console.error("Health check failed:", err && err.message ? err.message : err);
    process.exit(1);
  }

  try {
    console.log("Creating demo tenant (this will trigger onboarding email)...");
    const payload = {
      name: "Demo Corporation",
      adminEmail: "akki@primussoft.com",
      enabledModules: ["authentication", "rbac", "logging"],
    };

    const r = await fetch("http://localhost:5000/api/admin/tenants", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await r.json();
    console.log("Tenant creation response:", JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Tenant creation failed:", err && err.message ? err.message : err);
    process.exit(1);
  }

  console.log("Done");
}

main();
