#!/usr/bin/env node

/**
 * Direct SaaS Framework Test Execution
 * Simple approach without external dependencies
 */

async function testHealthEndpoint() {
  console.log('🔍 Testing Health Endpoint...');

  try {
    const response = await fetch('http://localhost:5000/api/health');

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Health endpoint responding');
      console.log('📊 Status:', data.status || 'unknown');
      return true;
    } else {
      console.log('❌ Health endpoint failed:', response.status);
      return false;
    }
  } catch (error) {
    console.log('❌ Health test error:', error.message);
    return false;
  }
}

async function testEmailEndpoint() {
  console.log('\n📧 Testing Email Endpoint...');

  try {
    const response = await fetch('http://localhost:5000/api/test-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: 'test@example.com',
        subject: 'Automated Test Email'
      })
    });

    if (response.ok) {
      console.log('✅ Email endpoint responding');
      return true;
    } else {
      console.log('❌ Email endpoint failed:', response.status);
      return false;
    }
  } catch (error) {
    console.log('❌ Email test error:', error.message);
    return false;
  }
}

async function testNotificationEndpoint() {
  console.log('\n🔔 Testing Notification Endpoint...');

  try {
    const response = await fetch('http://localhost:5000/api/notifications');

    if (response.ok) {
      console.log('✅ Notification endpoint responding');
      return true;
    } else {
      console.log('❌ Notification endpoint failed:', response.status);
      return false;
    }
  } catch (error) {
    console.log('❌ Notification test error:', error.message);
    return false;
  }
}

async function runAllTests() {
  console.log('🚀 Direct SaaS Framework Testing Started');
  console.log('='.repeat(50));

  const tests = [
    { name: 'Health Check', runner: testHealthEndpoint },
    { name: 'Email Test', runner: testEmailEndpoint },
    { name: 'Notification Test', runner: testNotificationEndpoint }
  ];

  let passed = 0;
  let total = tests.length;

  for (const test of tests) {
    console.log(`\n${'='.repeat(40)}`);
    console.log(`🧪 ${test.name}`);
    console.log('='.repeat(40));

    const success = await test.runner();
    if (success) {
      passed++;
      console.log(`✅ ${test.name} PASSED`);
    } else {
      console.log(`❌ ${test.name} FAILED`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 FINAL TEST RESULTS');
  console.log('='.repeat(60));
  console.log(`✅ Tests Passed: ${passed}/${total}`);
  console.log(`❌ Tests Failed: ${total - passed}/${total}`);
  console.log(`📈 Success Rate: ${Math.round((passed / total) * 100)}%`);

  if (passed === total) {
    console.log('\n🎉 ALL TESTS PASSED! 🎉');
  } else {
    console.log('\n⚠️ Some tests failed - check output above');
  }

  return passed === total;
}

// Run the tests
runAllTests()
  .then(success => {
    console.log(`\n🏁 Testing completed with result: ${success ? 'SUCCESS' : 'FAILURE'}`);
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('💥 Testing crashed:', error);
    process.exit(1);
  });
