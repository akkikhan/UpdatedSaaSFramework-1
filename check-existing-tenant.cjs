// Check existing tenant's orgId
const https = require("http");

function makeRequest() {
  const options = {
    hostname: "localhost",
    port: 5000,
    path: "/api/tenants",
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  };

  const req = https.request(options, res => {
    let data = "";

    res.on("data", chunk => {
      data += chunk;
    });

    res.on("end", () => {
      if (res.statusCode === 200) {
        try {
          const tenants = JSON.parse(data);
          console.log("=== Current Tenants in Database ===");
          if (tenants.length === 0) {
            console.log("❌ No tenants found");
          } else {
            tenants.forEach(tenant => {
              console.log(`✅ Tenant: ${tenant.name}`);
              console.log(`   orgId: ${tenant.orgId}`);
              console.log(`   ID: ${tenant.id}`);
              console.log(`   Admin Email: ${tenant.adminEmail}`);
              console.log("---");
            });
          }
        } catch (error) {
          console.error("❌ Error parsing response:", error.message);
        }
      } else {
        console.log(`❌ HTTP ${res.statusCode}: ${data}`);
      }
    });
  });

  req.on("error", error => {
    console.error("❌ Request failed:", error.message);
    console.log("💡 Make sure the server is running on port 5000");
  });

  req.end();
}

makeRequest();
