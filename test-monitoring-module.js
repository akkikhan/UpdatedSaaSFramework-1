#!/usr/bin/env node

/**
 * Monitoring Module Testing Suite
 * Tests monitoring and health check functionality
 */

import SmartTestController from './smart-test-controller.js';

const controller = new SmartTestController();

const monitoringTestSuite = {
  name: 'Monitoring Module',
  tests: [
    {
      endpoint: '/api/health',
      options: { method: 'GET' },
      description: 'System health check'
    },
    {
      endpoint: '/api/metrics',
      options: { method: 'GET' },
      description: 'System metrics collection'
    },
    {
      endpoint: '/api/monitoring/uptime',
      options: { method: 'GET' },
      description: 'Service uptime statistics'
    },
    {
      endpoint: '/api/monitoring/errors',
      options: { method: 'GET' },
      description: 'Error tracking and logs'
    }
  ]
};

async function runMonitoringTests() {
  console.log('📊 Monitoring Module Testing Started');
  console.log('='.repeat(60));

  // Smart server check
  console.log('🔍 Verifying server health...');
  const serverReady = await controller.ensureServerRunning();

  if (!serverReady) {
    console.log('❌ Cannot proceed: Server is not ready');
    process.exit(1);
  }

  // Run basic monitoring tests
  const results = await controller.runTestSuite(monitoringTestSuite);

  // Extended monitoring tests
  console.log('\n🔍 Running Extended Monitoring Tests...');

  // Test health check details
  const healthTest = await controller.runApiTest('/api/health');
  if (healthTest.ok && healthTest.data) {
    console.log('\n💊 Health Check Analysis:');
    const health = healthTest.data;

    console.log(`🟢 Status: ${health.status || 'unknown'}`);
    console.log(`⏱️  Uptime: ${health.uptime || 'unknown'}`);
    console.log(`💾 Memory: ${health.memory || 'unknown'}`);

    if (health.services) {
      console.log('\n🔧 Service Status:');
      for (const [service, status] of Object.entries(health.services)) {
        const icon = status === 'operational' ? '✅' : '❌';
        console.log(`${icon} ${service}: ${status}`);
      }
    }
  }

  // Test performance metrics
  console.log('\n📈 Performance Metrics Test...');
  const metricsTest = await controller.runApiTest('/api/metrics');
  if (metricsTest.ok) {
    console.log('✅ Metrics collection: Working');
    if (metricsTest.data) {
      const metrics = metricsTest.data;
      console.log(`📊 Response time: ${metrics.responseTime || 'N/A'}ms`);
      console.log(`💽 Memory usage: ${metrics.memoryUsage || 'N/A'}`);
      console.log(`🔄 Request count: ${metrics.requestCount || 'N/A'}`);
    }
  } else {
    console.log('❌ Metrics collection: Failed');
  }

  // Test error tracking
  console.log('\n🚨 Error Tracking Test...');
  const errorTest = await controller.runApiTest('/api/monitoring/errors');
  if (errorTest.ok) {
    console.log('✅ Error tracking: Working');
  } else {
    console.log('❌ Error tracking: Failed');
  }

  console.log('\n📊 Monitoring Module Test Summary');
  console.log('='.repeat(40));
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.total - results.passed}`);
  console.log(`📝 Total:  ${results.total}`);

  if (results.passed === results.total) {
    console.log('\n🎉 Monitoring Module: ALL TESTS PASSED!');
    return true;
  } else {
    console.log('\n⚠️  Monitoring Module: Some tests failed');
    return false;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runMonitoringTests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ Monitoring test error:', error);
      process.exit(1);
    });
}

export { monitoringTestSuite, runMonitoringTests };
