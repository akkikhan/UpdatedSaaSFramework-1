#!/usr/bin/env node

/**
 * Master Test Runner
 * Runs all module tests in sequence using smart server management
 */

import SmartTestController from './smart-test-controller.js';
import { runEmailTests } from './test-email-module.js';
import { runMonitoringTests } from './test-monitoring-module.js';
import { runNotificationTests } from './test-notification-module.js';

const controller = new SmartTestController();

async function runAllTests() {
  console.log('🚀 SaaS Framework Complete Testing Suite');
  console.log('='.repeat(80));
  console.log('🎯 Using Smart Test Controller - No unnecessary restarts!');
  console.log('='.repeat(80));

  const testModules = [
    { name: 'Email Module', runner: runEmailTests },
    { name: 'Notification Module', runner: runNotificationTests },
    { name: 'Monitoring Module', runner: runMonitoringTests }
  ];

  const results = [];
  let totalPassed = 0;
  let totalTests = 0;

  // Initial server check
  console.log('\n🔍 Initial Server Health Check...');
  const serverReady = await controller.ensureServerRunning();

  if (!serverReady) {
    console.log('❌ Cannot proceed: Server failed to start');
    process.exit(1);
  }

  console.log('✅ Server is ready - Beginning test execution...\n');

  // Run each test module
  for (let i = 0; i < testModules.length; i++) {
    const module = testModules[i];
    const moduleNumber = i + 1;

    console.log(
      `\n${'='.repeat(20)} Module ${moduleNumber}/${testModules.length}: ${module.name} ${'='.repeat(20)}`
    );

    try {
      const startTime = Date.now();
      const success = await module.runner();
      const duration = Date.now() - startTime;

      results.push({
        name: module.name,
        success,
        duration
      });

      if (success) {
        console.log(`✅ ${module.name} completed successfully in ${duration}ms`);
        totalPassed++;
      } else {
        console.log(`❌ ${module.name} failed in ${duration}ms`);
      }

      totalTests++;

      // Brief pause between modules
      if (i < testModules.length - 1) {
        console.log('\n⏳ Preparing next module...');
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.error(`💥 ${module.name} crashed:`, error.message);
      results.push({
        name: module.name,
        success: false,
        error: error.message
      });
      totalTests++;
    }
  }

  // Final summary
  console.log('\n' + '='.repeat(80));
  console.log('📋 COMPLETE TEST SUITE SUMMARY');
  console.log('='.repeat(80));

  for (const result of results) {
    const status = result.success ? '✅ PASS' : '❌ FAIL';
    const duration = result.duration ? ` (${result.duration}ms)` : '';
    console.log(`${status} ${result.name}${duration}`);
    if (result.error) {
      console.log(`    Error: ${result.error}`);
    }
  }

  console.log('\n📊 Overall Results:');
  console.log(`✅ Modules Passed: ${totalPassed}/${totalTests}`);
  console.log(`❌ Modules Failed: ${totalTests - totalPassed}/${totalTests}`);
  console.log(`📈 Success Rate: ${Math.round((totalPassed / totalTests) * 100)}%`);

  if (totalPassed === totalTests) {
    console.log('\n🎉 🎉 🎉 ALL MODULES PASSED! 🎉 🎉 🎉');
    console.log('✨ Your SaaS Framework is working perfectly!');
  } else {
    console.log('\n⚠️  Some modules need attention');
    console.log('📝 Review the failed tests above for details');
  }

  return totalPassed === totalTests;
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ Master test runner error:', error);
      process.exit(1);
    });
}
