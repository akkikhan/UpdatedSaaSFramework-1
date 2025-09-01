#!/usr/bin/env node

// Comprehensive Platform Validation Script
const http = require('http');
const https = require('https');

console.log('🚀 SaaS Platform - Comprehensive Validation Test\n');
console.log('=' .repeat(60));

const tests = [
  { name: 'Health Check', path: '/api/health', expectedStatus: 200 },
  { name: 'Admin Login Page', path: '/admin/login', expectedStatus: 200 },
  { name: 'Admin Dashboard', path: '/admin/dashboard', expectedStatus: 200 },
  { name: 'Tenant Registration', path: '/register', expectedStatus: 200 },
  { name: 'Azure AD Login (Redirect)', path: '/api/platform/auth/azure/login', expectedStatus: 302 },
  { name: 'Protected Tenants API', path: '/api/tenants', expectedStatus: 401 },
  { name: 'Protected Stats API', path: '/api/stats', expectedStatus: 401 },
];

let testsPassed = 0;
let testsTotal = tests.length;

function makeRequest(path, expectedStatus) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: path,
      method: 'GET',
      timeout: 5000
    };

    const req = http.request(options, (res) => {
      const success = res.statusCode === expectedStatus;
      resolve({
        success,
        actualStatus: res.statusCode,
        expectedStatus
      });
    });

    req.on('error', (error) => {
      resolve({
        success: false,
        actualStatus: 'ERROR',
        expectedStatus,
        error: error.message
      });
    });

    req.on('timeout', () => {
      resolve({
        success: false,
        actualStatus: 'TIMEOUT',
        expectedStatus
      });
    });

    req.end();
  });
}

async function runTests() {
  console.log('Running endpoint validation tests...\n');

  for (const test of tests) {
    process.stdout.write(`Testing ${test.name}... `);
    
    const result = await makeRequest(test.path, test.expectedStatus);
    
    if (result.success) {
      console.log(`✅ PASS (${result.actualStatus})`);
      testsPassed++;
    } else {
      console.log(`❌ FAIL (${result.actualStatus}, expected ${result.expectedStatus})`);
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
    }
  }

  console.log('\n' + '=' .repeat(60));
  console.log('📊 VALIDATION RESULTS');
  console.log('=' .repeat(60));
  console.log(`Tests Passed: ${testsPassed}/${testsTotal}`);
  console.log(`Success Rate: ${((testsPassed/testsTotal) * 100).toFixed(1)}%`);
  
  if (testsPassed === testsTotal) {
    console.log('🎉 ALL TESTS PASSED - Platform is ready!');
  } else {
    console.log('⚠️  Some tests failed - review issues above');
  }

  console.log('\n🔗 Quick Links:');
  console.log('   Admin Login: http://localhost:5000/admin/login');
  console.log('   Admin Dashboard: http://localhost:5000/admin/dashboard');
  console.log('   Tenant Registration: http://localhost:5000/register');
  console.log('   Health Check: http://localhost:5000/api/health');

  console.log('\n✨ Ready for Azure AD testing with khan.aakib@outlook.com');
}

runTests().catch(console.error);
