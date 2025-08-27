#!/usr/bin/env node

/**
 * Notification Module Testing Suite
 * Tests notification functionality with smart server management
 */

import SmartTestController from './smart-test-controller.js';

const controller = new SmartTestController();

const notificationTestSuite = {
  name: 'Notification Module',
  tests: [
    {
      endpoint: '/api/notifications',
      options: { method: 'GET' },
      description: 'Fetch user notifications'
    },
    {
      endpoint: '/api/notifications/send',
      options: {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'info',
          message: 'Test notification from automated suite',
          userId: 'test-user'
        })
      },
      description: 'Send notification to user'
    },
    {
      endpoint: '/api/notifications/mark-read',
      options: {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notificationIds: ['test-notification-1']
        })
      },
      description: 'Mark notifications as read'
    }
  ]
};

async function runNotificationTests() {
  console.log('🔔 Notification Module Testing Started');
  console.log('='.repeat(60));

  // Smart server management - only restart if needed
  console.log('🔍 Checking server status...');
  const serverReady = await controller.ensureServerRunning();

  if (!serverReady) {
    console.log('❌ Cannot proceed: Server is not ready');
    process.exit(1);
  }

  // Run basic test suite
  const results = await controller.runTestSuite(notificationTestSuite);

  // Extended notification testing
  console.log('\n📱 Running Extended Notification Tests...');

  // Test notification channels
  const channels = ['email', 'in-app', 'sms'];
  for (const channel of channels) {
    console.log(`\n🔗 Testing ${channel} channel...`);
    const channelTest = await controller.runApiTest('/api/notifications/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'test',
        message: `Test notification via ${channel}`,
        channel: channel,
        userId: 'test-user'
      })
    });

    if (channelTest.ok) {
      console.log(`✅ ${channel} channel: Working`);
    } else {
      console.log(`❌ ${channel} channel: ${channelTest.error || 'Failed'}`);
    }
  }

  // Test notification preferences
  console.log('\n⚙️  Testing notification preferences...');
  const prefsTest = await controller.runApiTest('/api/notifications/preferences', {
    method: 'GET'
  });

  if (prefsTest.ok) {
    console.log('✅ Notification preferences: Accessible');
  } else {
    console.log('❌ Notification preferences: Not accessible');
  }

  console.log('\n📊 Notification Module Test Summary');
  console.log('='.repeat(40));
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.total - results.passed}`);
  console.log(`📝 Total:  ${results.total}`);

  if (results.passed === results.total) {
    console.log('\n🎉 Notification Module: ALL TESTS PASSED!');
    return true;
  } else {
    console.log('\n⚠️  Notification Module: Some tests failed');
    return false;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runNotificationTests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ Notification test error:', error);
      process.exit(1);
    });
}

export { notificationTestSuite, runNotificationTests };
