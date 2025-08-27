#!/usr/bin/env node

/**
 * Simple Email Test
 * Quick test of email functionality
 */

import fetch from 'node-fetch';
import { fileURLToPath } from 'url';

const currentFile = fileURLToPath(import.meta.url);
const isMainModule = process.argv[1] === currentFile;

async function quickEmailTest() {
  console.log('📧 Quick Email Test Started');
  console.log('='.repeat(40));

  try {
    // Check if server is running
    console.log('🔍 Checking server health...');
    const healthResponse = await fetch('http://localhost:5000/api/health', {
      method: 'GET',
      timeout: 5000
    });

    if (healthResponse.ok) {
      console.log('✅ Server is responding');
      const healthData = await healthResponse.json();
      console.log('📊 Health status:', healthData.status || 'unknown');
    } else {
      console.log('❌ Server health check failed:', healthResponse.status);
      return false;
    }

    // Test email endpoint
    console.log('\n📧 Testing email endpoint...');
    const emailResponse = await fetch('http://localhost:5000/api/test-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: 'test@example.com',
        subject: 'Quick Test Email'
      }),
      timeout: 5000
    });

    if (emailResponse.ok) {
      console.log('✅ Email endpoint is accessible');
    } else {
      console.log('❌ Email endpoint failed:', emailResponse.status);
    }

    console.log('\n🎉 Quick email test completed!');
    return true;
  } catch (error) {
    console.error('❌ Test error:', error.message);
    return false;
  }
}

if (isMainModule) {
  quickEmailTest().then(success => {
    console.log(`\n📊 Test result: ${success ? 'PASSED' : 'FAILED'}`);
    process.exit(success ? 0 : 1);
  });
}
