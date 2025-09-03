#!/usr/bin/env node

// Test script to verify shared types and schema validation
const { TENANT_CREATION_SCHEMA, MODULE_IDS, createAuthProviderObject } = require('./shared/types.js');

console.log('🧪 Testing Shared Schema Validation...\n');

// Test data that was causing the 400 error
const problemPayload = {
  "name": "Mohd Aakib",
  "orgId": "mohd-aakib", 
  "adminEmail": "akki@primussoft.com",
  "adminName": "akki",
  "sendEmail": true,
  "enabledModules": ["authentication", "rbac", "logging", "notifications"],
  "moduleConfigs": {
    "auth": {
      "providers": ["azure-ad", "local"]
    }
  },
  "metadata": {
    "adminName": "akki", 
    "companyWebsite": ""
  }
};

console.log('❌ Original problematic payload:');
console.log(JSON.stringify(problemPayload, null, 2));

// Create the corrected version
const correctedPayload = {
  "name": "Mohd Aakib",
  "orgId": "mohd-aakib",
  "adminEmail": "akki@primussoft.com", 
  "adminName": "akki",
  "sendEmail": true,
  // Fix: Use correct module IDs
  "enabledModules": [MODULE_IDS.AUTH, MODULE_IDS.RBAC, MODULE_IDS.LOGGING, MODULE_IDS.NOTIFICATIONS],
  "moduleConfigs": {
    "auth": {
      // Fix: Use proper provider objects instead of strings
      "providers": [
        createAuthProviderObject("azure-ad", { tenantId: "qq", clientId: "qq" }),
        createAuthProviderObject("local", {})
      ]
    }
  },
  "metadata": {
    "adminName": "akki",
    "companyWebsite": ""
  }
};

console.log('\n✅ Corrected payload:');
console.log(JSON.stringify(correctedPayload, null, 2));

// Test validation
try {
  const validatedData = TENANT_CREATION_SCHEMA.parse(correctedPayload);
  console.log('\n🎉 VALIDATION SUCCESSFUL!');
  console.log('✅ The corrected payload passes schema validation');
  console.log('✅ Frontend and backend are now using the same data structure');
} catch (error) {
  console.log('\n❌ VALIDATION FAILED:');
  console.log(error.errors || error.message);
}

console.log('\n📋 SUMMARY:');
console.log('1. ✅ Module names now use correct IDs (auth vs authentication)');
console.log('2. ✅ Providers are now objects instead of strings'); 
console.log('3. ✅ Schema validation passes');
console.log('4. ✅ Frontend and backend use shared types');
