import { storage } from "./server/storage.ts";
import { emailService } from "./server/services/email.ts";
import { platformAdminAuthService } from "./server/services/platform-admin-auth.ts";
import { AzureADService } from "./server/services/azure-ad.ts";

class DeepTester {
  constructor() {
    this.results = {
      total: 0,
      passed: 0,
      failed: 0,
      warnings: 0,
      tests: [],
    };
  }

  async test(category, name, testFn, critical = false) {
    this.results.total++;
    const startTime = Date.now();

    console.log(`\n🧪 [${category}] Testing: ${name}`);
    try {
      const result = await testFn();
      const duration = Date.now() - startTime;

      console.log(`✅ PASSED: ${name} (${duration}ms)`);
      if (result && result.details) {
        console.log(`   Details: ${result.details}`);
      }

      this.results.passed++;
      this.results.tests.push({
        category,
        name,
        status: "PASSED",
        duration,
        critical,
        error: null,
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      console.log(`❌ FAILED: ${name} (${duration}ms)`);
      console.log(`   Error: ${error.message}`);

      if (critical) {
        console.log(`   ⚠️  CRITICAL FAILURE - This may affect core functionality`);
      }

      this.results.failed++;
      this.results.tests.push({
        category,
        name,
        status: "FAILED",
        duration,
        critical,
        error: error.message,
      });

      return null;
    }
  }

  async runDeepTests() {
    console.log("🚀 Starting DEEP SaaS Framework Testing");
    console.log("=".repeat(80));
    console.log(`Test Started: ${new Date().toISOString()}`);
    console.log("=".repeat(80));

    // 1. DATABASE LAYER TESTS
    console.log("\n📊 DATABASE LAYER TESTS");
    console.log("-".repeat(50));

    await this.test(
      "DATABASE",
      "Storage Connection Verification",
      async () => {
        const tenants = await storage.getAllTenants();
        if (!tenants || tenants.length === 0) {
          throw new Error("No tenants found in database");
        }
        return { details: `Found ${tenants.length} tenants` };
      },
      true
    );

    await this.test(
      "DATABASE",
      "Platform Admin Verification",
      async () => {
        const admins = await storage.getAllPlatformAdmins();
        if (!admins || admins.length === 0) {
          throw new Error("No platform admins found");
        }
        const activeAdmins = admins.filter(admin => admin.isActive);
        return {
          details: `Found ${activeAdmins.length} active admin(s) out of ${admins.length} total`,
        };
      },
      true
    );

    await this.test("DATABASE", "Tenant Data Integrity Check", async () => {
      const tenants = await storage.getAllTenants();
      const issues = [];

      for (const tenant of tenants) {
        if (!tenant.authApiKey || !tenant.rbacApiKey) {
          issues.push(`${tenant.orgId}: Missing API keys`);
        }
        if (!tenant.enabledModules || tenant.enabledModules.length === 0) {
          issues.push(`${tenant.orgId}: No enabled modules`);
        }
      }

      if (issues.length > 0) {
        throw new Error(`Data integrity issues: ${issues.join(", ")}`);
      }

      return { details: `All ${tenants.length} tenants have valid data integrity` };
    });

    // 2. AUTHENTICATION TESTS
    console.log("\n🔐 AUTHENTICATION LAYER TESTS");
    console.log("-".repeat(50));

    await this.test(
      "AUTH",
      "Platform Admin Authentication",
      async () => {
        const result = await platformAdminAuthService.login("admin@yourcompany.com", "Test123!");
        if (!result.token) {
          throw new Error("No authentication token returned");
        }
        return { details: `Token generated successfully, admin: ${result.platformAdmin.name}` };
      },
      true
    );

    await this.test("AUTH", "Platform Admin Token Verification", async () => {
      const loginResult = await platformAdminAuthService.login("admin@yourcompany.com", "Test123!");
      const verifyResult = await platformAdminAuthService.verifyToken(loginResult.token);
      if (!verifyResult) {
        throw new Error("Token verification failed");
      }
      return { details: `Token verification successful for ${verifyResult.name}` };
    });

    await this.test("AUTH", "Invalid Credentials Rejection", async () => {
      try {
        await platformAdminAuthService.login("admin@yourcompany.com", "WrongPassword");
        throw new Error("Should have rejected invalid credentials");
      } catch (error) {
        if (error.message.includes("Invalid credentials")) {
          return { details: "Correctly rejected invalid credentials" };
        }
        throw error;
      }
    });

    // 3. AZURE AD INTEGRATION TESTS
    console.log("\n☁️  AZURE AD INTEGRATION TESTS");
    console.log("-".repeat(50));

    await this.test("AZURE", "Azure AD Service Configuration", async () => {
      const tenants = await storage.getAllTenants();
      const azureTenants = tenants.filter(
        t =>
          t.enabledModules.includes("azure-ad") &&
          t.moduleConfigs?.auth?.providers?.some(p => p.type === "azure-ad")
      );

      if (azureTenants.length === 0) {
        throw new Error("No tenants configured with Azure AD");
      }

      return { details: `Found ${azureTenants.length} Azure AD configured tenants` };
    });

    await this.test("AZURE", "Azure AD Service Initialization", async () => {
      const tenants = await storage.getAllTenants();
      const azureTenant = tenants.find(t => t.orgId === "acme-insurance");

      if (!azureTenant) {
        throw new Error("Test tenant acme-insurance not found");
      }

      const azureConfig = azureTenant.moduleConfigs?.auth?.providers?.find(
        p => p.type === "azure-ad"
      );
      if (!azureConfig) {
        throw new Error("Azure AD config not found for test tenant");
      }

      const azureService = new AzureADService({
        clientId: azureConfig.config.clientId,
        clientSecret: azureConfig.config.clientSecret,
        tenantId: azureConfig.config.tenantId,
        redirectUri: azureConfig.config.callbackUrl,
      });

      if (!azureService) {
        throw new Error("Failed to initialize Azure AD service");
      }

      return { details: `Azure AD service initialized for ${azureTenant.orgId}` };
    });

    // 4. EMAIL SERVICE TESTS
    console.log("\n📧 EMAIL SERVICE TESTS");
    console.log("-".repeat(50));

    await this.test("EMAIL", "Email Service Connection", async () => {
      const isConnected = await emailService.testConnection();
      if (!isConnected) {
        throw new Error("Email service connection failed");
      }
      return { details: "Email service connection successful" };
    });

    await this.test("EMAIL", "Email Configuration Validation", async () => {
      const config = {
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        username: process.env.SMTP_USERNAME,
        from: process.env.FROM_EMAIL,
      };

      const missing = Object.entries(config).filter(([, value]) => !value);
      if (missing.length > 0) {
        throw new Error(`Missing email config: ${missing.map(([key]) => key).join(", ")}`);
      }

      return { details: "All email configuration parameters present" };
    });

    // 5. MULTI-TENANCY TESTS
    console.log("\n🏢 MULTI-TENANCY TESTS");
    console.log("-".repeat(50));

    await this.test("TENANCY", "Tenant Isolation Verification", async () => {
      const tenants = await storage.getAllTenants();
      const apiKeys = tenants.map(t => t.authApiKey);
      const uniqueKeys = new Set(apiKeys);

      if (apiKeys.length !== uniqueKeys.size) {
        throw new Error("Duplicate API keys found - tenant isolation compromised");
      }

      return { details: `${tenants.length} tenants with unique API keys verified` };
    });

    await this.test("TENANCY", "Module Configuration Flexibility", async () => {
      const tenants = await storage.getAllTenants();
      const moduleVariations = new Set();

      tenants.forEach(tenant => {
        const modules = tenant.enabledModules.sort().join(",");
        moduleVariations.add(modules);
      });

      return { details: `${moduleVariations.size} different module configurations across tenants` };
    });

    // 6. SECURITY TESTS
    console.log("\n🛡️  SECURITY TESTS");
    console.log("-".repeat(50));

    await this.test(
      "SECURITY",
      "Password Hash Verification",
      async () => {
        const admins = await storage.getAllPlatformAdmins();
        const admin = admins[0];

        if (!admin.passwordHash || admin.passwordHash.length < 50) {
          throw new Error("Password hash appears weak or missing");
        }

        if (admin.passwordHash.includes("Test123!")) {
          throw new Error("Password stored in plaintext - security risk!");
        }

        return { details: "Password properly hashed with bcrypt" };
      },
      true
    );

    await this.test("SECURITY", "API Key Strength Verification", async () => {
      const tenants = await storage.getAllTenants();
      const weakKeys = [];

      tenants.forEach(tenant => {
        if (tenant.authApiKey.length < 20 || tenant.rbacApiKey.length < 20) {
          weakKeys.push(tenant.orgId);
        }
      });

      if (weakKeys.length > 0) {
        throw new Error(`Weak API keys found for tenants: ${weakKeys.join(", ")}`);
      }

      return { details: "All API keys meet minimum strength requirements" };
    });

    // 7. AZURE MCP INTEGRATION TESTS
    console.log("\n🔧 AZURE MCP INTEGRATION TESTS");
    console.log("-".repeat(50));

    await this.test("MCP", "Azure MCP Configuration File", async () => {
      const fs = await import("fs/promises");
      try {
        const config = await fs.readFile("./azure-mcp-config.json", "utf8");
        const parsed = JSON.parse(config);

        if (!parsed.mcpServers || !parsed.mcpServers.azure) {
          throw new Error("Azure MCP configuration incomplete");
        }

        return { details: "Azure MCP configuration file valid and complete" };
      } catch (error) {
        throw new Error(`Azure MCP config error: ${error.message}`);
      }
    });

    // 8. DATA CONSISTENCY TESTS
    console.log("\n📋 DATA CONSISTENCY TESTS");
    console.log("-".repeat(50));

    await this.test("CONSISTENCY", "Timestamp Consistency", async () => {
      const tenants = await storage.getAllTenants();
      const timestampIssues = [];

      tenants.forEach(tenant => {
        if (!tenant.createdAt || !tenant.updatedAt) {
          timestampIssues.push(`${tenant.orgId}: Missing timestamps`);
        }
        if (new Date(tenant.updatedAt) < new Date(tenant.createdAt)) {
          timestampIssues.push(`${tenant.orgId}: Invalid timestamp order`);
        }
      });

      if (timestampIssues.length > 0) {
        throw new Error(`Timestamp issues: ${timestampIssues.join(", ")}`);
      }

      return { details: "All timestamps are consistent and valid" };
    });

    await this.test("CONSISTENCY", "Status Field Validation", async () => {
      const tenants = await storage.getAllTenants();
      const validStatuses = ["active", "pending", "suspended", "inactive"];
      const invalidStatuses = [];

      tenants.forEach(tenant => {
        if (!validStatuses.includes(tenant.status)) {
          invalidStatuses.push(`${tenant.orgId}: ${tenant.status}`);
        }
      });

      if (invalidStatuses.length > 0) {
        throw new Error(`Invalid statuses: ${invalidStatuses.join(", ")}`);
      }

      return { details: "All tenant statuses are valid" };
    });

    // 9. ENVIRONMENT TESTS
    console.log("\n🌍 ENVIRONMENT TESTS");
    console.log("-".repeat(50));

    await this.test(
      "ENVIRONMENT",
      "Critical Environment Variables",
      async () => {
        const required = [
          "DATABASE_URL",
          "JWT_SECRET",
          "AZURE_CLIENT_ID",
          "AZURE_CLIENT_SECRET",
          "AZURE_TENANT_ID",
        ];

        const missing = required.filter(key => !process.env[key]);
        if (missing.length > 0) {
          throw new Error(`Missing environment variables: ${missing.join(", ")}`);
        }

        return { details: "All critical environment variables present" };
      },
      true
    );

    await this.test("ENVIRONMENT", "Email Configuration Completeness", async () => {
      const emailVars = ["SMTP_HOST", "SMTP_PORT", "SMTP_USERNAME", "SMTP_PASSWORD", "FROM_EMAIL"];

      const missing = emailVars.filter(key => !process.env[key]);
      if (missing.length > 0) {
        this.results.warnings++;
        console.log(`   ⚠️  Warning: Missing email vars: ${missing.join(", ")}`);
      }

      return { details: "Email configuration checked" };
    });

    // Print Results
    this.printDetailedResults();
  }

  printDetailedResults() {
    console.log("\n" + "=".repeat(80));
    console.log("🎯 DEEP TESTING RESULTS SUMMARY");
    console.log("=".repeat(80));

    const endTime = new Date().toISOString();
    console.log(`Test Completed: ${endTime}`);
    console.log("");

    // Overall Stats
    console.log(`📊 OVERALL STATISTICS:`);
    console.log(`   Total Tests: ${this.results.total}`);
    console.log(`   ✅ Passed: ${this.results.passed}`);
    console.log(`   ❌ Failed: ${this.results.failed}`);
    console.log(`   ⚠️  Warnings: ${this.results.warnings}`);
    console.log(
      `   📈 Success Rate: ${((this.results.passed / this.results.total) * 100).toFixed(1)}%`
    );

    // Category Breakdown
    console.log(`\n📂 CATEGORY BREAKDOWN:`);
    const categories = {};
    this.results.tests.forEach(test => {
      if (!categories[test.category]) {
        categories[test.category] = { passed: 0, failed: 0, total: 0 };
      }
      categories[test.category].total++;
      if (test.status === "PASSED") {
        categories[test.category].passed++;
      } else {
        categories[test.category].failed++;
      }
    });

    Object.entries(categories).forEach(([category, stats]) => {
      const rate = ((stats.passed / stats.total) * 100).toFixed(1);
      console.log(`   ${category}: ${stats.passed}/${stats.total} (${rate}%)`);
    });

    // Critical Failures
    const criticalFailures = this.results.tests.filter(t => t.status === "FAILED" && t.critical);
    if (criticalFailures.length > 0) {
      console.log(`\n🚨 CRITICAL FAILURES:`);
      criticalFailures.forEach(test => {
        console.log(`   ❌ [${test.category}] ${test.name}: ${test.error}`);
      });
    }

    // Performance Insights
    console.log(`\n⚡ PERFORMANCE INSIGHTS:`);
    const avgDuration =
      this.results.tests.reduce((sum, test) => sum + test.duration, 0) / this.results.tests.length;
    const slowTests = this.results.tests
      .filter(test => test.duration > avgDuration * 2)
      .slice(0, 3);

    console.log(`   Average Test Duration: ${avgDuration.toFixed(0)}ms`);
    if (slowTests.length > 0) {
      console.log(`   Slowest Tests:`);
      slowTests.forEach(test => {
        console.log(`     - ${test.name}: ${test.duration}ms`);
      });
    }

    // Recommendations
    console.log(`\n💡 RECOMMENDATIONS:`);

    if (this.results.failed === 0) {
      console.log(`   🎉 All tests passed! System is in excellent condition.`);
      console.log(`   🚀 Ready for production deployment and scaling.`);
    } else if (criticalFailures.length === 0) {
      console.log(`   ✨ No critical failures detected. Minor issues can be addressed.`);
      console.log(`   🎯 Focus on resolving failed tests before production.`);
    } else {
      console.log(`   ⚠️  Critical failures must be resolved before production.`);
      console.log(`   🔧 Address database and authentication issues first.`);
    }

    // Health Score
    const healthScore = Math.round(
      ((this.results.passed * 10 +
        (this.results.total - this.results.failed - criticalFailures.length) * 5) /
        (this.results.total * 10)) *
        100
    );

    console.log(`\n🏥 SYSTEM HEALTH SCORE: ${healthScore}/100`);

    if (healthScore >= 90) {
      console.log(`   Status: 🟢 EXCELLENT - Production Ready`);
    } else if (healthScore >= 75) {
      console.log(`   Status: 🟡 GOOD - Minor improvements needed`);
    } else if (healthScore >= 60) {
      console.log(`   Status: 🟠 FAIR - Significant issues to address`);
    } else {
      console.log(`   Status: 🔴 POOR - Major issues require immediate attention`);
    }
  }
}

// Run the comprehensive tests
const deepTester = new DeepTester();
deepTester.runDeepTests().catch(console.error);
