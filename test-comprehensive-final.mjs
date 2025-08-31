// Comprehensive SaaS Framework Testing - Independent Version
import { config } from "dotenv";
import pkg from "pg";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import fs from "fs/promises";

const { Client } = pkg;
config();

class ComprehensiveTester {
  constructor() {
    this.results = {
      total: 0,
      passed: 0,
      failed: 0,
      warnings: 0,
      tests: [],
    };
    this.db = null;
  }

  async initialize() {
    this.db = new Client({
      connectionString: process.env.DATABASE_URL,
    });
    await this.db.connect();
  }

  async cleanup() {
    if (this.db) {
      await this.db.end();
    }
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

  async runComprehensiveTests() {
    console.log("🚀 STARTING COMPREHENSIVE SAAS FRAMEWORK TESTING");
    console.log("=".repeat(80));
    console.log(`Test Started: ${new Date().toISOString()}`);
    console.log("=".repeat(80));

    await this.initialize();

    try {
      // 1. DATABASE INFRASTRUCTURE TESTS
      console.log("\n📊 DATABASE INFRASTRUCTURE TESTS");
      console.log("-".repeat(50));

      await this.test(
        "DATABASE",
        "Connection and Basic Queries",
        async () => {
          const result = await this.db.query("SELECT NOW() as current_time");
          if (!result.rows[0].current_time) {
            throw new Error("Failed to get current time from database");
          }
          return { details: `Database time: ${result.rows[0].current_time}` };
        },
        true
      );

      await this.test(
        "DATABASE",
        "Tenant Data Verification",
        async () => {
          const result = await this.db.query("SELECT COUNT(*) as count FROM tenants");
          const count = parseInt(result.rows[0].count);
          if (count === 0) {
            throw new Error("No tenants found in database");
          }

          const tenantsData = await this.db.query(`
          SELECT org_id, status, enabled_modules, auth_api_key, rbac_api_key 
          FROM tenants
        `);

          const issues = [];
          tenantsData.rows.forEach(tenant => {
            if (!tenant.auth_api_key || !tenant.rbac_api_key) {
              issues.push(`${tenant.org_id}: Missing API keys`);
            }
            if (!tenant.enabled_modules || tenant.enabled_modules.length === 0) {
              issues.push(`${tenant.org_id}: No enabled modules`);
            }
          });

          if (issues.length > 0) {
            throw new Error(`Data integrity issues: ${issues.join(", ")}`);
          }

          return { details: `${count} tenants verified with complete data` };
        },
        true
      );

      await this.test(
        "DATABASE",
        "Platform Admin Verification",
        async () => {
          const result = await this.db.query(
            "SELECT COUNT(*) as count FROM platform_admins WHERE is_active = true"
          );
          const count = parseInt(result.rows[0].count);
          if (count === 0) {
            throw new Error("No active platform admins found");
          }
          return { details: `${count} active platform admin(s) found` };
        },
        true
      );

      await this.test("DATABASE", "Multi-Tenancy Isolation Check", async () => {
        const result = await this.db.query("SELECT auth_api_key, rbac_api_key FROM tenants");
        const authKeys = result.rows.map(row => row.auth_api_key);
        const rbacKeys = result.rows.map(row => row.rbac_api_key);

        const uniqueAuth = new Set(authKeys);
        const uniqueRbac = new Set(rbacKeys);

        if (authKeys.length !== uniqueAuth.size) {
          throw new Error("Duplicate auth API keys found - tenant isolation compromised");
        }
        if (rbacKeys.length !== uniqueRbac.size) {
          throw new Error("Duplicate RBAC API keys found - tenant isolation compromised");
        }

        return { details: `${result.rows.length} tenants with unique API keys verified` };
      });

      // 2. AUTHENTICATION & SECURITY TESTS
      console.log("\n🔐 AUTHENTICATION & SECURITY TESTS");
      console.log("-".repeat(50));

      await this.test(
        "AUTH",
        "Password Hash Security",
        async () => {
          const result = await this.db.query("SELECT password_hash FROM platform_admins LIMIT 1");
          if (result.rows.length === 0) {
            throw new Error("No platform admin found to test");
          }

          const hash = result.rows[0].password_hash;
          if (!hash || hash.length < 50) {
            throw new Error("Password hash appears weak or missing");
          }

          // Test if it's a bcrypt hash
          if (!hash.startsWith("$2")) {
            throw new Error("Password not using bcrypt hashing");
          }

          return { details: "Password properly hashed with bcrypt" };
        },
        true
      );

      await this.test("AUTH", "JWT Token Generation and Validation", async () => {
        const payload = { userId: "test-123", role: "admin" };
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "1h" });

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded.userId !== payload.userId) {
          throw new Error("JWT token validation failed");
        }

        return { details: "JWT generation and validation working correctly" };
      });

      await this.test("AUTH", "API Key Strength Analysis", async () => {
        const result = await this.db.query(
          "SELECT auth_api_key, rbac_api_key, org_id FROM tenants"
        );
        const weakKeys = [];

        result.rows.forEach(tenant => {
          if (tenant.auth_api_key.length < 20 || tenant.rbac_api_key.length < 20) {
            weakKeys.push(tenant.org_id);
          }
        });

        if (weakKeys.length > 0) {
          throw new Error(`Weak API keys found for tenants: ${weakKeys.join(", ")}`);
        }

        return { details: "All API keys meet minimum strength requirements" };
      });

      // 3. AZURE AD INTEGRATION TESTS
      console.log("\n☁️  AZURE AD INTEGRATION TESTS");
      console.log("-".repeat(50));

      await this.test(
        "AZURE",
        "Azure Environment Configuration",
        async () => {
          const required = ["AZURE_CLIENT_ID", "AZURE_CLIENT_SECRET", "AZURE_TENANT_ID"];
          const missing = required.filter(key => !process.env[key]);

          if (missing.length > 0) {
            throw new Error(`Missing Azure environment variables: ${missing.join(", ")}`);
          }

          return { details: "All Azure environment variables configured" };
        },
        true
      );

      await this.test("AZURE", "Tenant Azure AD Configuration", async () => {
        const result = await this.db.query(`
          SELECT org_id, module_configs 
          FROM tenants 
          WHERE enabled_modules @> '["azure-ad"]'::jsonb
        `);

        if (result.rows.length === 0) {
          throw new Error("No tenants configured with Azure AD module");
        }

        let configuredTenants = 0;
        result.rows.forEach(tenant => {
          const authConfig = tenant.module_configs?.auth;
          if (authConfig && authConfig.providers) {
            const azureProvider = authConfig.providers.find(p => p.type === "azure-ad");
            if (azureProvider && azureProvider.config) {
              configuredTenants++;
            }
          }
        });

        return {
          details: `${result.rows.length} tenants with Azure AD module, ${configuredTenants} fully configured`,
        };
      });

      await this.test("AZURE", "Azure MCP Configuration File", async () => {
        try {
          const configContent = await fs.readFile("./azure-mcp-config.json", "utf8");
          const config = JSON.parse(configContent);

          if (!config.mcpServers || !config.mcpServers.azure) {
            throw new Error("Azure MCP configuration incomplete");
          }

          return { details: "Azure MCP configuration file valid and complete" };
        } catch (error) {
          if (error.code === "ENOENT") {
            throw new Error("Azure MCP configuration file not found");
          }
          throw error;
        }
      });

      // 4. EMAIL SERVICE TESTS
      console.log("\n📧 EMAIL SERVICE TESTS");
      console.log("-".repeat(50));

      await this.test("EMAIL", "SMTP Configuration Validation", async () => {
        const emailVars = [
          "SMTP_HOST",
          "SMTP_PORT",
          "SMTP_USERNAME",
          "SMTP_PASSWORD",
          "FROM_EMAIL",
        ];
        const missing = emailVars.filter(key => !process.env[key]);

        if (missing.length > 0) {
          this.results.warnings++;
          console.log(`   ⚠️  Warning: Missing email config: ${missing.join(", ")}`);
        }

        return {
          details: `Email configuration: ${emailVars.length - missing.length}/${emailVars.length} variables present`,
        };
      });

      await this.test("EMAIL", "SMTP Connection Test", async () => {
        if (!process.env.SMTP_HOST) {
          throw new Error("SMTP configuration not available for testing");
        }

        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT || "587"),
          secure: process.env.SMTP_PORT === "465",
          auth: {
            user: process.env.SMTP_USERNAME,
            pass: process.env.SMTP_PASSWORD,
          },
        });

        await transporter.verify();
        return { details: "SMTP connection verified successfully" };
      });

      // 5. DATA CONSISTENCY TESTS
      console.log("\n📋 DATA CONSISTENCY TESTS");
      console.log("-".repeat(50));

      await this.test("CONSISTENCY", "Timestamp Integrity", async () => {
        const result = await this.db.query(`
          SELECT org_id, created_at, updated_at 
          FROM tenants 
          WHERE created_at IS NULL OR updated_at IS NULL OR updated_at < created_at
        `);

        if (result.rows.length > 0) {
          const issues = result.rows.map(row => `${row.org_id}: Invalid timestamps`);
          throw new Error(`Timestamp issues found: ${issues.join(", ")}`);
        }

        return { details: "All timestamps are consistent and valid" };
      });

      await this.test("CONSISTENCY", "Status Field Validation", async () => {
        const result = await this.db.query(`
          SELECT org_id, status 
          FROM tenants 
          WHERE status NOT IN ('active', 'pending', 'suspended', 'inactive')
        `);

        if (result.rows.length > 0) {
          const issues = result.rows.map(row => `${row.org_id}: ${row.status}`);
          throw new Error(`Invalid statuses found: ${issues.join(", ")}`);
        }

        return { details: "All tenant statuses are valid" };
      });

      // 6. AUDIT AND LOGGING TESTS
      console.log("\n📝 AUDIT AND LOGGING TESTS");
      console.log("-".repeat(50));

      await this.test("AUDIT", "Audit Log Functionality", async () => {
        const result = await this.db.query("SELECT COUNT(*) as count FROM compliance_audit_logs");
        const count = parseInt(result.rows[0].count);
        return { details: `${count} audit log entries found` };
      });

      await this.test("AUDIT", "System Logs Table", async () => {
        const result = await this.db.query("SELECT COUNT(*) as count FROM system_logs");
        const count = parseInt(result.rows[0].count);
        return { details: `${count} system log entries found` };
      });

      // 7. ENVIRONMENT CONFIGURATION TESTS
      console.log("\n🌍 ENVIRONMENT CONFIGURATION TESTS");
      console.log("-".repeat(50));

      await this.test(
        "ENVIRONMENT",
        "Critical Environment Variables",
        async () => {
          const critical = ["DATABASE_URL", "JWT_SECRET"];
          const missing = critical.filter(key => !process.env[key]);

          if (missing.length > 0) {
            throw new Error(`Missing critical environment variables: ${missing.join(", ")}`);
          }

          return { details: "All critical environment variables present" };
        },
        true
      );

      await this.test("ENVIRONMENT", "Optional Configuration Check", async () => {
        const optional = ["NODE_ENV", "PORT", "SESSION_SECRET"];
        const present = optional.filter(key => process.env[key]);

        return {
          details: `Optional config: ${present.length}/${optional.length} variables present`,
        };
      });

      // 8. PERFORMANCE AND SCALABILITY TESTS
      console.log("\n⚡ PERFORMANCE TESTS");
      console.log("-".repeat(50));

      await this.test("PERFORMANCE", "Database Query Performance", async () => {
        const startTime = Date.now();
        await this.db.query("SELECT COUNT(*) FROM tenants");
        await this.db.query("SELECT COUNT(*) FROM users");
        await this.db.query("SELECT COUNT(*) FROM platform_admins");
        const duration = Date.now() - startTime;

        if (duration > 1000) {
          throw new Error(`Database queries took ${duration}ms - performance issue detected`);
        }

        return { details: `Database queries completed in ${duration}ms` };
      });

      await this.test("PERFORMANCE", "Connection Pool Health", async () => {
        // Test multiple concurrent queries
        const queries = Array(5)
          .fill()
          .map(() => this.db.query("SELECT 1 as test"));

        await Promise.all(queries);
        return { details: "Connection pool handles concurrent queries successfully" };
      });
    } finally {
      await this.cleanup();
    }

    // Print comprehensive results
    this.printDetailedResults();
  }

  printDetailedResults() {
    console.log("\n" + "=".repeat(80));
    console.log("🎯 COMPREHENSIVE TESTING RESULTS");
    console.log("=".repeat(80));

    const endTime = new Date().toISOString();
    console.log(`Test Completed: ${endTime}`);
    console.log("");

    // Overall Statistics
    console.log(`📊 OVERALL STATISTICS:`);
    console.log(`   Total Tests: ${this.results.total}`);
    console.log(`   ✅ Passed: ${this.results.passed}`);
    console.log(`   ❌ Failed: ${this.results.failed}`);
    console.log(`   ⚠️  Warnings: ${this.results.warnings}`);
    const successRate = ((this.results.passed / this.results.total) * 100).toFixed(1);
    console.log(`   📈 Success Rate: ${successRate}%`);

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
      const status = rate === "100.0" ? "🟢" : rate >= "80.0" ? "🟡" : "🔴";
      console.log(`   ${status} ${category}: ${stats.passed}/${stats.total} (${rate}%)`);
    });

    // Critical Failures
    const criticalFailures = this.results.tests.filter(t => t.status === "FAILED" && t.critical);
    if (criticalFailures.length > 0) {
      console.log(`\n🚨 CRITICAL FAILURES:`);
      criticalFailures.forEach(test => {
        console.log(`   ❌ [${test.category}] ${test.name}`);
        console.log(`      Error: ${test.error}`);
      });
    }

    // Performance Analysis
    console.log(`\n⚡ PERFORMANCE ANALYSIS:`);
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

    // Overall Health Assessment
    console.log(`\n🏥 SYSTEM HEALTH ASSESSMENT:`);

    let healthScore = 0;

    // Base score from pass rate
    healthScore += (this.results.passed / this.results.total) * 60;

    // Bonus for zero critical failures
    if (criticalFailures.length === 0) {
      healthScore += 20;
    }

    // Bonus for good performance
    if (avgDuration < 100) {
      healthScore += 10;
    }

    // Bonus for comprehensive coverage
    if (this.results.total >= 20) {
      healthScore += 10;
    }

    healthScore = Math.round(healthScore);

    console.log(`   🎯 Health Score: ${healthScore}/100`);

    if (healthScore >= 90) {
      console.log(`   Status: 🟢 EXCELLENT - Production Ready`);
      console.log(`   🚀 System is ready for production deployment`);
      console.log(`   📈 All critical systems operational`);
    } else if (healthScore >= 75) {
      console.log(`   Status: 🟡 GOOD - Minor Issues Present`);
      console.log(`   🔧 Address non-critical issues before production`);
      console.log(`   ✅ Core functionality is solid`);
    } else if (healthScore >= 60) {
      console.log(`   Status: 🟠 FAIR - Significant Issues`);
      console.log(`   ⚠️  Multiple issues need resolution`);
      console.log(`   🔧 Focus on critical failures first`);
    } else {
      console.log(`   Status: 🔴 POOR - Major Issues Present`);
      console.log(`   🚨 Critical issues must be resolved immediately`);
      console.log(`   ❌ Not ready for production deployment`);
    }

    // Final Recommendations
    console.log(`\n💡 RECOMMENDATIONS:`);

    if (criticalFailures.length === 0 && this.results.failed === 0) {
      console.log(`   🎉 Perfect score! System is production-ready`);
      console.log(`   📊 Consider load testing and monitoring setup`);
      console.log(`   🚀 Ready for user onboarding and scaling`);
    } else if (criticalFailures.length === 0) {
      console.log(`   ✨ No critical failures - good foundation`);
      console.log(`   🔧 Address remaining ${this.results.failed} minor issues`);
      console.log(`   📋 Review warnings for optimization opportunities`);
    } else {
      console.log(`   ⚠️  ${criticalFailures.length} critical failure(s) need immediate attention`);
      console.log(`   🔧 Fix critical issues before proceeding to production`);
      console.log(`   📋 Database and authentication issues are highest priority`);
    }

    console.log(
      `\n🏁 Testing Complete - Framework Status: ${healthScore >= 80 ? "READY" : "NEEDS WORK"}`
    );
    console.log("=".repeat(80));
  }
}

// Run the comprehensive tests
const tester = new ComprehensiveTester();
tester.runComprehensiveTests().catch(console.error);
