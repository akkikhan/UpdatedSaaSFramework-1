#!/usr/bin/env node

/**
 * Test Runner for SaaS Framework
 * Executes the testing modules in sequence
 */

import { execSync } from 'child_process';

console.log('🚀 SaaS Framework Test Runner Started');
console.log('='.repeat(50));

// Test order: Health Check → Email → Notification → Monitoring → All Tests
const tests = [
  {
    name: 'Health Check',
    command: 'node quick-email-test.js',
    description: 'Quick server health and email endpoint test'
  },
  {
    name: 'Email Module',
    command: 'node test-email-module.js',
    description: 'Comprehensive email functionality testing'
  },
  {
    name: 'Notification Module',
    command: 'node test-notification-module.js',
    description: 'Notification system testing'
  },
  {
    name: 'Monitoring Module',
    command: 'node test-monitoring-module.js',
    description: 'Health monitoring and metrics testing'
  },
  {
    name: 'Complete Test Suite',
    command: 'node run-all-tests.js',
    description: 'Full integrated test suite execution'
  }
];

async function runTests() {
  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📋 Running: ${test.name}`);
    console.log(`📝 Description: ${test.description}`);
    console.log(`⚡ Command: ${test.command}`);
    console.log(`${'='.repeat(60)}`);

    try {
      const startTime = Date.now();

      // Execute the test command
      const output = execSync(test.command, {
        encoding: 'utf8',
        timeout: 30000 // 30 second timeout
      });

      const duration = Date.now() - startTime;

      console.log(output);
      console.log(`\n✅ ${test.name} PASSED (${duration}ms)`);
      passed++;
    } catch (error) {
      console.error(`\n❌ ${test.name} FAILED`);
      console.error(`Error: ${error.message}`);
      if (error.stdout) {
        console.log('Output:', error.stdout);
      }
      if (error.stderr) {
        console.error('Error Output:', error.stderr);
      }
      failed++;
    }

    // Brief pause between tests
    console.log('\n⏳ Preparing next test...');
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  // Final summary
  console.log('\n' + '='.repeat(80));
  console.log('📊 FINAL TEST SUMMARY');
  console.log('='.repeat(80));
  console.log(`✅ Tests Passed: ${passed}`);
  console.log(`❌ Tests Failed: ${failed}`);
  console.log(`📈 Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`);

  if (failed === 0) {
    console.log('\n🎉 🎉 🎉 ALL TESTS PASSED! 🎉 🎉 🎉');
    console.log('✨ Your SaaS Framework is working perfectly!');
  } else {
    console.log('\n⚠️  Some tests need attention');
    console.log('📝 Check the failed tests above for details');
  }

  return failed === 0;
}

runTests()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('❌ Test runner error:', error);
    process.exit(1);
  });
