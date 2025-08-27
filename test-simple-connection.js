#!/usr/bin/env node

const http = require('http');

console.log('🔍 Testing simple connection to localhost:5000...');

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/health',
  method: 'GET',
  timeout: 5000
};

const req = http.request(options, res => {
  console.log(`✅ Server responded with status: ${res.statusCode}`);

  let data = '';
  res.on('data', chunk => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('📄 Response:', data);
    process.exit(0);
  });
});

req.on('error', err => {
  console.log('❌ Connection failed:', err.message);
  process.exit(1);
});

req.on('timeout', () => {
  console.log('⏰ Request timed out');
  req.destroy();
  process.exit(1);
});

req.setTimeout(5000);
req.end();
