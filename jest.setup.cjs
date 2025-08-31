// Main Jest setup file
require('dotenv').config({ path: '.env.test' });

// Global test configuration
global.console = {
  ...console,
  // Suppress console.log during tests unless explicitly needed
  log: process.env.VERBOSE_TESTS === 'true' ? console.log : jest.fn(),
  debug: process.env.VERBOSE_TESTS === 'true' ? console.debug : jest.fn(),
  info: console.info,
  warn: console.warn,
  error: console.error,
};

// Increase timeout for async operations
jest.setTimeout(30000);
