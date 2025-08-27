#!/usr/bin/env node

/**
 * Smart Test Controller
 * Manages server lifecycle and API testing without unnecessary restarts
 */

import { exec, spawn } from 'child_process';
import fetch from 'node-fetch';
import { promisify } from 'util';

const execAsync = promisify(exec);

class SmartTestController {
  constructor() {
    this.serverUrl = 'http://localhost:5000';
    this.serverPort = 5000;
    this.maxRetries = 3;
    this.retryDelay = 2000;
  }

  async checkServerHealth() {
    try {
      const response = await fetch(`${this.serverUrl}/api/health`, {
        timeout: 5000
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  async checkPortInUse() {
    try {
      const { stdout } = await execAsync(`netstat -ano | findstr :${this.serverPort}`);
      return stdout.trim().length > 0;
    } catch (error) {
      return false;
    }
  }

  async waitForServer(maxWaitTime = 30000) {
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitTime) {
      if (await this.checkServerHealth()) {
        console.log('✅ Server is healthy and responsive');
        return true;
      }

      console.log('⏳ Waiting for server to be ready...');
      await this.sleep(1000);
    }

    return false;
  }

  async ensureServerRunning() {
    console.log('🔍 Checking server status...');

    // First check if server is healthy
    if (await this.checkServerHealth()) {
      console.log('✅ Server is already running and healthy');
      return true;
    }

    // Check if port is in use but server isn't responding
    if (await this.checkPortInUse()) {
      console.log('⚠️  Port is in use but server not responding. This is normal for hot reload.');

      // Wait a bit for hot reload to complete
      if (await this.waitForServer(10000)) {
        return true;
      }

      console.log('❌ Server on port but not responding. May need restart.');
      return false;
    }

    // No server running, start it
    console.log('🚀 Starting development server...');
    return this.startServer();
  }

  async startServer() {
    return new Promise(resolve => {
      const serverProcess = spawn('npm', ['run', 'dev'], {
        stdio: 'pipe',
        shell: true,
        cwd: process.cwd()
      });

      let serverStarted = false;

      serverProcess.stdout.on('data', data => {
        const output = data.toString();
        console.log(`[Server] ${output.trim()}`);

        // Look for server ready indicators
        if (output.includes('localhost:5000') || output.includes('Server running')) {
          if (!serverStarted) {
            serverStarted = true;
            console.log('✅ Server started successfully');
            resolve(true);
          }
        }
      });

      serverProcess.stderr.on('data', data => {
        const error = data.toString();
        if (!error.includes('ExperimentalWarning')) {
          console.error(`[Server Error] ${error.trim()}`);
        }
      });

      // Timeout fallback
      setTimeout(async () => {
        if (!serverStarted) {
          if (await this.checkServerHealth()) {
            serverStarted = true;
            resolve(true);
          } else {
            console.log('❌ Server start timeout');
            resolve(false);
          }
        }
      }, 15000);
    });
  }

  async runApiTest(endpoint, options = {}) {
    try {
      console.log(`🧪 Testing ${endpoint}...`);

      const response = await fetch(`${this.serverUrl}${endpoint}`, {
        timeout: 10000,
        ...options
      });

      const result = {
        endpoint,
        status: response.status,
        ok: response.ok,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries())
      };

      try {
        result.data = await response.json();
      } catch (e) {
        result.data = await response.text();
      }

      if (response.ok) {
        console.log(`✅ ${endpoint} - ${response.status} ${response.statusText}`);
      } else {
        console.log(`❌ ${endpoint} - ${response.status} ${response.statusText}`);
      }

      return result;
    } catch (error) {
      console.log(`❌ ${endpoint} - Network Error: ${error.message}`);
      return {
        endpoint,
        error: error.message,
        ok: false
      };
    }
  }

  async runTestSuite(testSuite) {
    console.log(`\n🎯 Running ${testSuite.name} Test Suite`);
    console.log('='.repeat(50));

    const results = [];

    for (const test of testSuite.tests) {
      const result = await this.runApiTest(test.endpoint, test.options);
      results.push(result);

      // Small delay between tests
      await this.sleep(100);
    }

    const passed = results.filter(r => r.ok).length;
    const total = results.length;

    console.log(`\n📊 ${testSuite.name} Results: ${passed}/${total} passed`);

    if (passed === total) {
      console.log('✅ All tests passed!');
    } else {
      console.log('❌ Some tests failed');
      results
        .filter(r => !r.ok)
        .forEach(r => {
          console.log(`   - ${r.endpoint}: ${r.error || r.statusText}`);
        });
    }

    return { passed, total, results };
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export for use in other modules
export default SmartTestController;

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const controller = new SmartTestController();

  const command = process.argv[2];

  switch (command) {
    case 'check':
      console.log('Checking server health...');
      controller.checkServerHealth().then(healthy => {
        console.log(healthy ? '✅ Server is healthy' : '❌ Server is not responding');
        process.exit(healthy ? 0 : 1);
      });
      break;

    case 'ensure':
      console.log('Ensuring server is running...');
      controller.ensureServerRunning().then(running => {
        console.log(running ? '✅ Server is ready' : '❌ Failed to start server');
        process.exit(running ? 0 : 1);
      });
      break;

    case 'start':
      console.log('Starting server...');
      controller.startServer().then(started => {
        console.log(started ? '✅ Server started' : '❌ Failed to start server');
        process.exit(started ? 0 : 1);
      });
      break;

    default:
      console.log('Usage: node smart-test-controller.js [check|ensure|start]');
      console.log('  check  - Check if server is healthy');
      console.log('  ensure - Ensure server is running (start if needed)');
      console.log('  start  - Start the server');
  }
}
