// Help user identify which tenant they're accessing and debug the issue
console.log(`
🔧 DEBUGGING TENANT PORTAL LOGGING ISSUE 

To help diagnose the "Logs API failing" issue, please:

1. Open your browser's developer console (F12 → Console tab)

2. Navigate to your tenant portal (e.g., http://localhost:5173/tenant/YOUR_TENANT_ID/dashboard)

3. Look for any error messages in the console

4. Check what tenant you're accessing by looking at the URL

Based on our database check, here are the available tenants and their logging status:

✅ TENANTS WITH LOGGING API KEYS:
   • mohd-aakib-1 → URL: /tenant/mohd-aakib-1/dashboard  
   • jdsbj → URL: /tenant/jdsbj/dashboard
   • mohd-aakib → URL: /tenant/mohd-aakib/dashboard  
   • akki → URL: /tenant/akki/dashboard
   • h → URL: /tenant/h/dashboard

❌ TENANTS WITHOUT LOGGING:
   • demo → URL: /tenant/demo/dashboard (logging module not enabled)

WHAT TO CHECK:
1. Which tenant URL are you accessing?
2. Do you see a toast error message saying "Missing key" or "Logging API key not available"?
3. Are there any 403 Forbidden errors in the Network tab?
4. Is the loggingApiKey being passed to the component?

QUICK TEST:
Try accessing this tenant which definitely works: http://localhost:5173/tenant/h/dashboard
`);

console.log("\n🧪 TECHNICAL DEBUGGING:");
console.log("Run this in your browser console on the tenant dashboard page:");
console.log(`
// Check if tenant object has loggingApiKey
const tenantData = document.querySelector('[data-testid="tenant-data"]');
if (tenantData) {
  console.log('Tenant object:', JSON.parse(tenantData.textContent));
} else {
  console.log('Tenant data not found - check if page loaded correctly');
}

// Check current URL
console.log('Current tenant from URL:', window.location.pathname.split('/')[2]);
`);
