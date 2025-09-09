#!/usr/bin/env node
// Get platform admin token for seeding

const BASE = "http://localhost:5000";

async function getToken() {
  try {
    const response = await fetch(`${BASE}/api/platform/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "admin@yourcompany.com",
        password: "admin123",
      }),
    });

    if (response.ok) {
      const data = await response.json();
      console.log(data.token);
      return data.token;
    } else {
      // Try the other admin email
      const response2 = await fetch(`${BASE}/api/platform/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "khan.aakib@outlook.com",
          password: "admin123",
        }),
      });

      if (response2.ok) {
        const data = await response2.json();
        console.log(data.token);
        return data.token;
      } else {
        const error = await response2.text();
        console.error("Login failed:", error);
      }
    }
  } catch (error) {
    console.error("Error:", error.message);
  }
}

getToken();
