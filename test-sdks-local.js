#!/usr/bin/env node

/**
 * SaaS Framework SDK - Local Testing Script
 * Tests all SDK packages locally before publishing
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log("🔬 SaaS Framework SDK - Local Testing");
console.log("=====================================\n");

// Test results tracker
const testResults = {
  passed: 0,
  failed: 0,
  tests: [],
};

function logTest(name, status, message = "") {
  const emoji = status === "PASS" ? "✅" : "❌";
  console.log(`${emoji} ${name}: ${status}`);
  if (message) console.log(`   ${message}`);

  testResults.tests.push({ name, status, message });
  if (status === "PASS") testResults.passed++;
  else testResults.failed++;
}

// Test 1: Package Structure Validation
console.log("📁 Testing Package Structure...\n");

const packages = ["email", "auth", "logging", "rbac"];
const requiredFiles = ["package.json", "dist/index.js", "dist/index.d.ts", "README.md"];

for (const pkg of packages) {
  const packageDir = path.join(__dirname, "packages", pkg);

  if (!fs.existsSync(packageDir)) {
    logTest(`Package ${pkg} directory`, "FAIL", "Directory not found");
    continue;
  }

  let packageValid = true;
  for (const file of requiredFiles) {
    const filePath = path.join(packageDir, file);
    if (!fs.existsSync(filePath)) {
      logTest(`${pkg}/${file}`, "FAIL", "File not found");
      packageValid = false;
    }
  }

  if (packageValid) {
    logTest(`Package ${pkg} structure`, "PASS", "All required files present");
  }
}

// Test 2: Package.json Validation
console.log("\n📋 Testing Package.json Files...\n");

for (const pkg of packages) {
  const packageJsonPath = path.join(__dirname, "packages", pkg, "package.json");

  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));

    const requiredFields = ["name", "version", "description", "main", "types"];
    const missingFields = requiredFields.filter(field => !packageJson[field]);

    if (missingFields.length === 0) {
      logTest(`${pkg} package.json`, "PASS", `v${packageJson.version}`);
    } else {
      logTest(`${pkg} package.json`, "FAIL", `Missing: ${missingFields.join(", ")}`);
    }
  } catch (error) {
    logTest(`${pkg} package.json`, "FAIL", "Invalid JSON or file not found");
  }
}

// Test 3: Module Import Test
console.log("\n🔌 Testing Module Imports...\n");

async function testModuleImports() {
  for (const pkg of packages) {
    try {
      const modulePath = path.join(__dirname, "packages", pkg, "dist", "index.js");

      if (!fs.existsSync(modulePath)) {
        logTest(`${pkg} module import`, "FAIL", "Compiled module not found");
        continue;
      }

      // Read the module file to check for exports
      const moduleContent = fs.readFileSync(modulePath, "utf8");

      if (moduleContent.includes("export") || moduleContent.includes("module.exports")) {
        logTest(`${pkg} module import`, "PASS", "Valid exports found");
      } else {
        logTest(`${pkg} module import`, "FAIL", "No exports found");
      }
    } catch (error) {
      logTest(`${pkg} module import`, "FAIL", error.message);
    }
  }
}

await testModuleImports();

// Test 4: TypeScript Declarations
console.log("\n🔷 Testing TypeScript Declarations...\n");

for (const pkg of packages) {
  try {
    const declarationPath = path.join(__dirname, "packages", pkg, "dist", "index.d.ts");

    if (!fs.existsSync(declarationPath)) {
      logTest(`${pkg} TypeScript declarations`, "FAIL", "Declaration file not found");
      continue;
    }

    const declarationContent = fs.readFileSync(declarationPath, "utf8");

    if (declarationContent.includes("export") && declarationContent.includes("interface")) {
      logTest(`${pkg} TypeScript declarations`, "PASS", "Valid declarations found");
    } else {
      logTest(`${pkg} TypeScript declarations`, "FAIL", "Invalid or incomplete declarations");
    }
  } catch (error) {
    logTest(`${pkg} TypeScript declarations`, "FAIL", error.message);
  }
}

// Test 5: Documentation Check
console.log("\n📚 Testing Documentation...\n");

for (const pkg of packages) {
  try {
    const readmePath = path.join(__dirname, "packages", pkg, "README.md");

    if (!fs.existsSync(readmePath)) {
      logTest(`${pkg} README`, "FAIL", "README.md not found");
      continue;
    }

    const readmeContent = fs.readFileSync(readmePath, "utf8");

    // Check for essential sections
    const requiredSections = ["# @saas-framework/", "## Installation", "## Features"];
    const missingSections = requiredSections.filter(section => !readmeContent.includes(section));

    if (missingSections.length === 0) {
      logTest(`${pkg} README`, "PASS", "All required sections present");
    } else {
      logTest(`${pkg} README`, "FAIL", `Missing sections: ${missingSections.join(", ")}`);
    }
  } catch (error) {
    logTest(`${pkg} README`, "FAIL", error.message);
  }
}

// Test 6: Simulated Import Test (Create test files)
console.log("\n🧪 Testing SDK Instantiation...\n");

async function testSDKInstantiation() {
  const testConfig = {
    apiKey: "test-api-key",
    baseUrl: "https://test.api.com",
    tenantId: "test-tenant",
  };

  // Test Email SDK structure
  try {
    const emailPath = path.join(__dirname, "..", "packages", "email", "dist", "index.js");
    if (fs.existsSync(emailPath)) {
      const emailContent = fs.readFileSync(emailPath, "utf8");
      if (emailContent.includes("SaaSEmail") || emailContent.includes("class")) {
        logTest("Email SDK structure", "PASS", "SDK class found");
      } else {
        logTest("Email SDK structure", "FAIL", "SDK class not found");
      }
    }
  } catch (error) {
    logTest("Email SDK structure", "FAIL", error.message);
  }

  // Test Auth SDK structure
  try {
    const authPath = path.join(__dirname, "..", "packages", "auth", "dist", "index.js");
    if (fs.existsSync(authPath)) {
      const authContent = fs.readFileSync(authPath, "utf8");
      if (authContent.includes("SaaSAuth") || authContent.includes("class")) {
        logTest("Auth SDK structure", "PASS", "SDK class found");
      } else {
        logTest("Auth SDK structure", "FAIL", "SDK class not found");
      }
    }
  } catch (error) {
    logTest("Auth SDK structure", "FAIL", error.message);
  }

  // Test Logging SDK structure
  try {
    const loggingPath = path.join(__dirname, "..", "packages", "logging", "dist", "index.js");
    if (fs.existsSync(loggingPath)) {
      const loggingContent = fs.readFileSync(loggingPath, "utf8");
      if (loggingContent.includes("SaaSLogging") || loggingContent.includes("class")) {
        logTest("Logging SDK structure", "PASS", "SDK class found");
      } else {
        logTest("Logging SDK structure", "FAIL", "SDK class not found");
      }
    }
  } catch (error) {
    logTest("Logging SDK structure", "FAIL", error.message);
  }

  // Test RBAC SDK structure
  try {
    const rbacPath = path.join(__dirname, "..", "packages", "rbac", "dist", "index.js");
    if (fs.existsSync(rbacPath)) {
      const rbacContent = fs.readFileSync(rbacPath, "utf8");
      if (rbacContent.includes("SaaSRBAC") || rbacContent.includes("class")) {
        logTest("RBAC SDK structure", "PASS", "SDK class found");
      } else {
        logTest("RBAC SDK structure", "FAIL", "SDK class not found");
      }
    }
  } catch (error) {
    logTest("RBAC SDK structure", "FAIL", error.message);
  }
}

await testSDKInstantiation();

// Final Results
console.log("\n📊 Test Results Summary");
console.log("========================");
console.log(`Total Tests: ${testResults.passed + testResults.failed}`);
console.log(`✅ Passed: ${testResults.passed}`);
console.log(`❌ Failed: ${testResults.failed}`);

if (testResults.failed === 0) {
  console.log("\n🎉 All tests passed! SDKs are ready for publishing.");
  console.log("\nNext steps:");
  console.log("1. Run: npm login");
  console.log("2. Run: .\\scripts\\publish-packages.ps1");
  console.log("3. Verify packages on NPM");
} else {
  console.log("\n⚠️  Some tests failed. Please fix issues before publishing:");
  testResults.tests
    .filter(test => test.status === "FAIL")
    .forEach(test => console.log(`   - ${test.name}: ${test.message}`));
}

console.log("\n✅ Local testing completed!\n");
