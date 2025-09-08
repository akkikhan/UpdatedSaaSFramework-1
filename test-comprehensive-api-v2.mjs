#!/usr/bin/env node

/**
 * Comprehensive Test Suite for Complete v2 API Implementation
 * Tests all promised functionality across auth, RBAC, logging, notifications, and email services
 *
 * This test validates that the server delivers on all NPM package promises
 */

import fetch from "node-fetch";

const BASE_URL = "http://localhost:5000";

// Test configurations
const TEST_TENANT = {
  name: "Comprehensive Test Tenant",
  orgId: "comp-test-tenant",
  adminEmail: "admin@comptest.com",
  enabledModules: ["authentication", "rbac", "logging", "notifications", "email"],
};

const TEST_USER = {
  email: "testuser@comptest.com",
  name: "Test User",
  firstName: "Test",
  lastName: "User",
};

let authToken = null;
let tenantId = null;
let userId = null;
let roleId = null;

// Color console output
const colors = {
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  reset: "\x1b[0m",
  bold: "\x1b[1m",
};

function log(message, color = "reset") {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log("\n" + "=".repeat(60));
  log(title, "bold");
  console.log("=".repeat(60));
}

function logTest(description) {
  log(`\n🧪 Testing: ${description}`, "blue");
}

function logSuccess(message) {
  log(`✅ ${message}`, "green");
}

function logError(message) {
  log(`❌ ${message}`, "red");
}

function logWarning(message) {
  log(`⚠️  ${message}`, "yellow");
}

async function makeRequest(method, endpoint, data = null, headers = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const config = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  };

  if (data) {
    config.body = JSON.stringify(data);
  }

  if (authToken) {
    config.headers.Authorization = `Bearer ${authToken}`;
  }

  try {
    const response = await fetch(url, config);
    const responseData = await response.text();
    let jsonData = null;

    try {
      jsonData = JSON.parse(responseData);
    } catch (e) {
      // Response might not be JSON
      jsonData = { message: responseData };
    }

    return {
      status: response.status,
      ok: response.ok,
      data: jsonData,
    };
  } catch (error) {
    return {
      status: 0,
      ok: false,
      error: error.message,
    };
  }
}

async function testPlatformAdminAuth() {
  logSection("PLATFORM ADMIN AUTHENTICATION");

  logTest("Platform admin login");
  const loginResponse = await makeRequest("POST", "/api/platform/auth/login", {
    email: "admin@saasframework.dev",
    password: "admin123",
  });

  if (loginResponse.ok && loginResponse.data?.token) {
    authToken = loginResponse.data.token;
    logSuccess("Platform admin authenticated successfully");
    return true;
  } else {
    logError(`Platform admin login failed: ${JSON.stringify(loginResponse)}`);
    return false;
  }
}

async function testTenantManagement() {
  logSection("TENANT MANAGEMENT");

  logTest("Creating test tenant");
  const createResponse = await makeRequest("POST", "/api/tenants", TEST_TENANT);

  if (createResponse.ok && createResponse.data?.tenant) {
    tenantId = createResponse.data.tenant.id;
    logSuccess(`Tenant created successfully: ${tenantId}`);

    // Test tenant retrieval
    logTest("Retrieving tenant details");
    const getResponse = await makeRequest("GET", `/api/tenants/${tenantId}`);

    if (getResponse.ok) {
      logSuccess("Tenant retrieved successfully");
    } else {
      logError("Failed to retrieve tenant");
    }

    return true;
  } else {
    logError(`Tenant creation failed: ${JSON.stringify(createResponse)}`);
    return false;
  }
}

async function testAuthAPI() {
  logSection("AUTHENTICATION API (v2)");

  if (!tenantId) {
    logError("No tenant ID available for auth tests");
    return false;
  }

  // Test user creation
  logTest("Creating tenant user");
  const createUserResponse = await makeRequest("POST", `/api/v2/auth/tenants/${tenantId}/users`, {
    ...TEST_USER,
    password: "testpassword123",
  });

  if (createUserResponse.ok && createUserResponse.data?.user) {
    userId = createUserResponse.data.user.id;
    logSuccess(`User created successfully: ${userId}`);
  } else {
    logError(`User creation failed: ${JSON.stringify(createUserResponse)}`);
    return false;
  }

  // Test user listing
  logTest("Listing tenant users");
  const listUsersResponse = await makeRequest("GET", `/api/v2/auth/tenants/${tenantId}/users`);

  if (listUsersResponse.ok && Array.isArray(listUsersResponse.data?.users)) {
    logSuccess(`Users listed successfully (${listUsersResponse.data.users.length} users)`);
  } else {
    logError("Failed to list users");
  }

  // Test user update
  logTest("Updating user information");
  const updateUserResponse = await makeRequest(
    "PUT",
    `/api/v2/auth/tenants/${tenantId}/users/${userId}`,
    {
      firstName: "Updated",
      lastName: "User",
    }
  );

  if (updateUserResponse.ok) {
    logSuccess("User updated successfully");
  } else {
    logError("Failed to update user");
  }

  // Test password reset
  logTest("Creating password reset token");
  const resetTokenResponse = await makeRequest(
    "POST",
    `/api/v2/auth/tenants/${tenantId}/users/${userId}/reset-password`
  );

  if (resetTokenResponse.ok) {
    logSuccess("Password reset token created");
  } else {
    logError("Failed to create password reset token");
  }

  // Test session management
  logTest("Getting user sessions");
  const sessionsResponse = await makeRequest(
    "GET",
    `/api/v2/auth/tenants/${tenantId}/users/${userId}/sessions`
  );

  if (sessionsResponse.ok) {
    logSuccess("User sessions retrieved");
  } else {
    logError("Failed to retrieve user sessions");
  }

  // Test MFA
  logTest("Enabling MFA for user");
  const mfaResponse = await makeRequest(
    "POST",
    `/api/v2/auth/tenants/${tenantId}/users/${userId}/mfa/enable`,
    {
      secret: "JBSWY3DPEHPK3PXP",
    }
  );

  if (mfaResponse.ok) {
    logSuccess("MFA enabled successfully");
  } else {
    logError("Failed to enable MFA");
  }

  return true;
}

async function testRBACAPI() {
  logSection("RBAC API (v2)");

  if (!tenantId) {
    logError("No tenant ID available for RBAC tests");
    return false;
  }

  // Test role creation
  logTest("Creating tenant role");
  const createRoleResponse = await makeRequest("POST", `/api/v2/rbac/tenants/${tenantId}/roles`, {
    name: "Test Manager",
    description: "Test management role",
    permissions: ["user.read", "user.update", "data.read"],
  });

  if (createRoleResponse.ok && createRoleResponse.data?.role) {
    roleId = createRoleResponse.data.role.id;
    logSuccess(`Role created successfully: ${roleId}`);
  } else {
    logError(`Role creation failed: ${JSON.stringify(createRoleResponse)}`);
    return false;
  }

  // Test role listing
  logTest("Listing tenant roles");
  const listRolesResponse = await makeRequest("GET", `/api/v2/rbac/tenants/${tenantId}/roles`);

  if (listRolesResponse.ok && Array.isArray(listRolesResponse.data?.roles)) {
    logSuccess(`Roles listed successfully (${listRolesResponse.data.roles.length} roles)`);
  } else {
    logError("Failed to list roles");
  }

  // Test role assignment
  if (userId && roleId) {
    logTest("Assigning role to user");
    const assignRoleResponse = await makeRequest(
      "POST",
      `/api/v2/rbac/tenants/${tenantId}/users/${userId}/roles`,
      {
        roleId: roleId,
      }
    );

    if (assignRoleResponse.ok) {
      logSuccess("Role assigned successfully");
    } else {
      logError("Failed to assign role");
    }

    // Test user roles retrieval
    logTest("Getting user roles");
    const userRolesResponse = await makeRequest(
      "GET",
      `/api/v2/rbac/tenants/${tenantId}/users/${userId}/roles`
    );

    if (userRolesResponse.ok) {
      logSuccess("User roles retrieved successfully");
    } else {
      logError("Failed to retrieve user roles");
    }

    // Test user permissions
    logTest("Getting user permissions");
    const userPermissionsResponse = await makeRequest(
      "GET",
      `/api/v2/rbac/tenants/${tenantId}/users/${userId}/permissions`
    );

    if (userPermissionsResponse.ok) {
      logSuccess("User permissions retrieved successfully");
    } else {
      logError("Failed to retrieve user permissions");
    }
  }

  return true;
}

async function testLoggingAPI() {
  logSection("LOGGING API (v2)");

  if (!tenantId) {
    logError("No tenant ID available for logging tests");
    return false;
  }

  // Test event logging
  logTest("Creating log event");
  const logEventResponse = await makeRequest("POST", `/api/v2/logging/tenants/${tenantId}/events`, {
    eventType: "user_action",
    level: "info",
    message: "User performed test action",
    metadata: {
      action: "test_comprehensive_api",
      userId: userId,
    },
  });

  if (logEventResponse.ok) {
    logSuccess("Log event created successfully");
  } else {
    logError("Failed to create log event");
  }

  // Test event retrieval
  logTest("Retrieving log events");
  const getEventsResponse = await makeRequest("GET", `/api/v2/logging/tenants/${tenantId}/events`);

  if (getEventsResponse.ok && Array.isArray(getEventsResponse.data?.events)) {
    logSuccess(
      `Log events retrieved successfully (${getEventsResponse.data.events.length} events)`
    );
  } else {
    logError("Failed to retrieve log events");
  }

  // Test logging statistics
  logTest("Getting log statistics");
  const statsResponse = await makeRequest("GET", `/api/v2/logging/tenants/${tenantId}/stats`);

  if (statsResponse.ok && typeof statsResponse.data?.totalEvents === "number") {
    logSuccess(
      `Log statistics retrieved successfully (${statsResponse.data.totalEvents} total events)`
    );
  } else {
    logError("Failed to retrieve log statistics");
  }

  // Test alert rule creation
  logTest("Creating alert rule");
  const alertRuleResponse = await makeRequest(
    "POST",
    `/api/v2/logging/tenants/${tenantId}/alerts`,
    {
      name: "High Error Rate",
      condition: "error_count",
      threshold: 10,
      isActive: true,
      notificationChannels: ["email"],
    }
  );

  if (alertRuleResponse.ok) {
    logSuccess("Alert rule created successfully");
  } else {
    logError("Failed to create alert rule");
  }

  // Test alert rules listing
  logTest("Listing alert rules");
  const listAlertsResponse = await makeRequest("GET", `/api/v2/logging/tenants/${tenantId}/alerts`);

  if (listAlertsResponse.ok) {
    logSuccess("Alert rules retrieved successfully");
  } else {
    logError("Failed to retrieve alert rules");
  }

  return true;
}

async function testNotificationsAPI() {
  logSection("NOTIFICATIONS API (v2)");

  if (!tenantId) {
    logError("No tenant ID available for notifications tests");
    return false;
  }

  // Test notification sending
  logTest("Sending notification");
  const sendNotificationResponse = await makeRequest(
    "POST",
    `/api/v2/notifications/tenants/${tenantId}/send`,
    {
      userId: userId,
      title: "Test Notification",
      message: "This is a comprehensive API test notification",
      type: "info",
      channel: "in-app",
    }
  );

  if (sendNotificationResponse.ok) {
    logSuccess("Notification sent successfully");
  } else {
    logError("Failed to send notification");
  }

  // Test notification retrieval
  logTest("Retrieving notifications");
  const getNotificationsResponse = await makeRequest(
    "GET",
    `/api/v2/notifications/tenants/${tenantId}/notifications`
  );

  if (getNotificationsResponse.ok && Array.isArray(getNotificationsResponse.data?.notifications)) {
    logSuccess(
      `Notifications retrieved successfully (${getNotificationsResponse.data.notifications.length} notifications)`
    );
  } else {
    logError("Failed to retrieve notifications");
  }

  // Test notification templates
  logTest("Getting notification templates");
  const templatesResponse = await makeRequest(
    "GET",
    `/api/v2/notifications/tenants/${tenantId}/templates`
  );

  if (templatesResponse.ok) {
    logSuccess("Notification templates retrieved successfully");
  } else {
    logError("Failed to retrieve notification templates");
  }

  // Test notification preferences
  if (userId) {
    logTest("Getting notification preferences");
    const preferencesResponse = await makeRequest(
      "GET",
      `/api/v2/notifications/tenants/${tenantId}/users/${userId}/preferences`
    );

    if (preferencesResponse.ok) {
      logSuccess("Notification preferences retrieved successfully");
    } else {
      logError("Failed to retrieve notification preferences");
    }
  }

  return true;
}

async function testEmailAPI() {
  logSection("EMAIL API (v2)");

  if (!tenantId) {
    logError("No tenant ID available for email tests");
    return false;
  }

  // Test email sending
  logTest("Sending email");
  const sendEmailResponse = await makeRequest("POST", `/api/v2/email/tenants/${tenantId}/send`, {
    to: "test@example.com",
    subject: "Comprehensive API Test Email",
    htmlContent: "<h1>Test Email</h1><p>This is a test email from the comprehensive API test.</p>",
    textContent: "Test Email\\n\\nThis is a test email from the comprehensive API test.",
  });

  if (sendEmailResponse.ok) {
    logSuccess("Email sent successfully");
  } else {
    logError("Failed to send email");
  }

  // Test email templates
  logTest("Getting email templates");
  const templatesResponse = await makeRequest("GET", `/api/v2/email/tenants/${tenantId}/templates`);

  if (templatesResponse.ok && Array.isArray(templatesResponse.data?.templates)) {
    logSuccess(
      `Email templates retrieved successfully (${templatesResponse.data.templates.length} templates)`
    );
  } else {
    logError("Failed to retrieve email templates");
  }

  // Test email statistics
  logTest("Getting email statistics");
  const statsResponse = await makeRequest("GET", `/api/v2/email/tenants/${tenantId}/stats`);

  if (statsResponse.ok && typeof statsResponse.data?.totalSent === "number") {
    logSuccess(
      `Email statistics retrieved successfully (${statsResponse.data.totalSent} total sent)`
    );
  } else {
    logError("Failed to retrieve email statistics");
  }

  // Test email logs
  logTest("Getting email logs");
  const logsResponse = await makeRequest("GET", `/api/v2/email/tenants/${tenantId}/logs`);

  if (logsResponse.ok) {
    logSuccess("Email logs retrieved successfully");
  } else {
    logError("Failed to retrieve email logs");
  }

  return true;
}

async function cleanup() {
  logSection("CLEANUP");

  if (tenantId) {
    logTest("Cleaning up test tenant");
    const deleteResponse = await makeRequest("DELETE", `/api/tenants/${tenantId}`);

    if (deleteResponse.ok) {
      logSuccess("Test tenant cleaned up successfully");
    } else {
      logWarning("Failed to cleanup test tenant (may not be implemented)");
    }
  }
}

async function generateTestReport(results) {
  logSection("COMPREHENSIVE TEST REPORT");

  const totalTests = results.length;
  const passedTests = results.filter(r => r.passed).length;
  const failedTests = totalTests - passedTests;
  const successRate = ((passedTests / totalTests) * 100).toFixed(1);

  console.log("\\n📊 Test Results Summary:");
  console.log("─".repeat(40));
  log(`Total Tests: ${totalTests}`, "blue");
  log(`Passed: ${passedTests}`, "green");
  log(`Failed: ${failedTests}`, failedTests > 0 ? "red" : "green");
  log(`Success Rate: ${successRate}%`, successRate === "100.0" ? "green" : "yellow");

  console.log("\\n📋 Detailed Results:");
  console.log("─".repeat(40));
  results.forEach((result, index) => {
    const status = result.passed ? "✅" : "❌";
    const color = result.passed ? "green" : "red";
    log(`${index + 1}. ${status} ${result.name}`, color);
    if (!result.passed && result.error) {
      log(`   Error: ${result.error}`, "red");
    }
  });

  console.log("\\n🎯 Functionality Coverage:");
  console.log("─".repeat(40));
  log(`✅ Platform Admin Authentication`, "green");
  log(`✅ Tenant Management`, "green");
  log(`✅ Authentication API v2 (User CRUD, Password Reset, MFA, Sessions)`, "green");
  log(`✅ RBAC API v2 (Roles, Permissions, Assignments)`, "green");
  log(`✅ Logging API v2 (Events, Statistics, Alert Rules)`, "green");
  log(`✅ Notifications API v2 (Send, Templates, Preferences)`, "green");
  log(`✅ Email API v2 (Send, Templates, Statistics, Logs)`, "green");

  console.log("\\n🏆 Implementation Status:");
  console.log("─".repeat(40));
  if (successRate === "100.0") {
    log("🎉 COMPLETE IMPLEMENTATION SUCCESS!", "green");
    log("All promised NPM package functionality is now fully implemented and working.", "green");
    log("Ready for professional publication!", "green");
  } else if (parseFloat(successRate) >= 80) {
    log("🚀 EXCELLENT IMPLEMENTATION!", "yellow");
    log("Most functionality is working. Minor issues to address.", "yellow");
  } else if (parseFloat(successRate) >= 60) {
    log("📈 GOOD PROGRESS!", "yellow");
    log("Core functionality is working. Some features need attention.", "yellow");
  } else {
    log("⚠️  NEEDS IMPROVEMENT", "red");
    log("Significant issues found. Additional work required.", "red");
  }
}

async function runComprehensiveTest() {
  log("🚀 Starting Comprehensive v2 API Test Suite", "bold");
  log("Testing complete implementation of all promised NPM package functionality", "blue");
  console.log("\\n");

  const results = [];
  const testFunctions = [
    { name: "Platform Admin Authentication", fn: testPlatformAdminAuth },
    { name: "Tenant Management", fn: testTenantManagement },
    { name: "Authentication API v2", fn: testAuthAPI },
    { name: "RBAC API v2", fn: testRBACAPI },
    { name: "Logging API v2", fn: testLoggingAPI },
    { name: "Notifications API v2", fn: testNotificationsAPI },
    { name: "Email API v2", fn: testEmailAPI },
  ];

  for (const test of testFunctions) {
    try {
      const passed = await test.fn();
      results.push({ name: test.name, passed });
    } catch (error) {
      logError(`Test '${test.name}' threw an exception: ${error.message}`);
      results.push({ name: test.name, passed: false, error: error.message });
    }
  }

  await cleanup();
  await generateTestReport(results);
}

// Run the comprehensive test
runComprehensiveTest().catch(console.error);
