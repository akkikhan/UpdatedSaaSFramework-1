#!/usr/bin/env node
// Create a test platform admin for seeding

import { platformAdminAuthService } from "../server/services/platform-admin-auth.js";

async function createTestAdmin() {
  try {
    console.log("🔧 Creating test platform admin for seeding...");

    // Try to create a test admin with known credentials
    const testAdmin = await platformAdminAuthService.createPlatformAdmin({
      email: "test-admin@seeding.local",
      password: "seeding123",
      name: "Test Admin for Seeding",
      role: "super_admin",
    });

    console.log("✅ Test admin created successfully!");
    console.log(`Email: ${testAdmin.email}`);
    console.log("Password: seeding123");

    // Now try to login and get token
    const BASE = "http://localhost:5000";
    const response = await fetch(`${BASE}/api/platform/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "test-admin@seeding.local",
        password: "seeding123",
      }),
    });

    if (response.ok) {
      const data = await response.json();
      console.log("🔑 Token obtained:", data.token);
      console.log("\nRun seeding with:");
      console.log(`PLATFORM_ADMIN_TOKEN="${data.token}" npm run seed:rbac-quick`);
      return data.token;
    } else {
      const error = await response.text();
      console.error("Login failed:", error);
    }
  } catch (error) {
    if (error.message.includes("already exists")) {
      console.log("⚠️ Test admin already exists, trying to login...");

      const BASE = "http://localhost:5000";
      const response = await fetch(`${BASE}/api/platform/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "test-admin@seeding.local",
          password: "seeding123",
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log("🔑 Token obtained:", data.token);
        return data.token;
      }
    }
    console.error("Error:", error.message);
  }
}

createTestAdmin();
