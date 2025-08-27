#!/usr/bin/env node

/**
 * Email Module Testing Suite
 * Tests email functionality without unnecessary server restarts
 */

import SmartTestController from './smart-test-controller.js';

console.log('📧 Email module loaded successfully');

const controller = new SmartTestController();

const emailTestSuite = {
  name: 'Email Module',
  tests: [
    {
      endpoint: '/api/health',
      options: { method: 'GET' },
      description: 'Check email service connectivity status'
    },
    {
      endpoint: '/api/test-email',
      options: {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: 'test@example.com',
          subject: 'Automated Test Email'
        })
      },
      description: 'Test email sending functionality'
    }
  ]
};

async function runEmailTests() {
  console.log('🔧 Email Module Testing Started');
  console.log('='.repeat(60));

  // Ensure server is running (won't restart if already healthy)
  console.log('🔍 Ensuring server is ready...');
  const serverReady = await controller.ensureServerRunning();

  if (!serverReady) {
    console.log('❌ Cannot proceed: Server is not ready');
    process.exit(1);
  }

  // Run the test suite
  const results = await controller.runTestSuite(emailTestSuite);

  // Additional email-specific tests
  console.log('\n📧 Running Extended Email Tests...');

  // Test SMTP configuration
  const smtpTest = await controller.runApiTest('/api/health');
  if (smtpTest.ok && smtpTest.data) {
    const emailStatus = smtpTest.data.services?.email;
    console.log(`📮 Email Service Status: ${emailStatus || 'unknown'}`);

    if (emailStatus === 'operational') {
      console.log('✅ SMTP configuration is working');
    } else {
      console.log('⚠️  SMTP may need configuration');
    }
  }

  console.log('\n📊 Email Module Test Summary');
  console.log('='.repeat(40));
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.total - results.passed}`);
  console.log(`📝 Total:  ${results.total}`);

  if (results.passed === results.total) {
    console.log('\n🎉 Email Module: ALL TESTS PASSED!');
    return true;
  } else {
    console.log('\n⚠️  Email Module: Some tests failed');
    return false;
  }
}

// Run if called directly
import { fileURLToPath } from 'url';
const currentFile = fileURLToPath(import.meta.url);
const isMainModule = process.argv[1] === currentFile;

console.log('🔍 Checking execution condition...');
console.log('Current file:', currentFile);
console.log('Process argv[1]:', process.argv[1]);
console.log('Is main module:', isMainModule);

if (isMainModule) {
  console.log('🔥 Running email tests directly...');
  runEmailTests()
    .then(success => {
      console.log(`🎯 Email tests completed with success: ${success}`);
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ Email test error:', error);
      process.exit(1);
    });
} else {
  console.log('📦 Module imported but not executed directly');
}

export { emailTestSuite, runEmailTests };
