// Test Platform Admin Token after Azure AD Login
console.log("🔍 Checking Platform Admin Token...");

// Check if token exists in localStorage
const platformAdminToken = localStorage.getItem("platformAdminToken");
console.log("Token in localStorage:", platformAdminToken ? "EXISTS" : "NOT FOUND");
console.log(
  "Token preview:",
  platformAdminToken ? `${platformAdminToken.substring(0, 20)}...` : "NULL"
);

// Check URL parameters (in case token is still in URL)
const urlParams = new URLSearchParams(window.location.search);
const tokenFromUrl = urlParams.get("token");
const adminFromUrl = urlParams.get("admin");
console.log("Token in URL:", tokenFromUrl ? "EXISTS" : "NOT FOUND");
console.log("Admin flag in URL:", adminFromUrl);

// Test API call with token
async function testApiCall() {
  const token = platformAdminToken;
  if (!token) {
    console.error("❌ No token found - cannot test API call");
    return;
  }

  try {
    console.log("🧪 Testing API call with token...");
    const response = await fetch("/api/platform/auth/verify", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    console.log("API Response Status:", response.status);
    if (response.ok) {
      const data = await response.json();
      console.log("✅ API Call Success:", data);
    } else {
      const error = await response.text();
      console.error("❌ API Call Failed:", error);
    }
  } catch (error) {
    console.error("❌ API Call Error:", error);
  }
}

// Run the test
testApiCall();
