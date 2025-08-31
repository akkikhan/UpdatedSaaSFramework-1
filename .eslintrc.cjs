module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true,
    jest: true,
  },
  extends: [
    'eslint:recommended',
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  rules: {
    // Basic rules for validation
    'no-unused-vars': 'warn',
    'no-console': 'off', // Allow console in development
    'prefer-const': 'error',
    'no-var': 'error',
  },
  ignorePatterns: [
    'dist/',
    'build/',
    'node_modules/',
    'coverage/',
    '*.config.js',
    '*.config.ts',
    '*.config.cjs',
    'vite.config.ts',
    'tailwind.config.ts',
    // Ignore TypeScript files for basic validation
    '**/*.ts',
    '**/*.tsx',
    // Include only JavaScript files for validation
    'client/src/**/*.js',
    'server/**/*.js',
  ],
};
