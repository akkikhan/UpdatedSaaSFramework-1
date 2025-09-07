export default [
  {
    ignores: [
      'dist/',
      'build/',
      'node_modules/',
      '**/node_modules/**',
      'coverage/',
      'demo-app/',
      'scripts/',
      'tests/',
      '*.config.{js,ts,cjs}',
      'vite.config.ts',
      'tailwind.config.ts',
      '**/comprehensive-demo*.{js,cjs}',
      '**/test-*',
      'packages/*/example*',
      'server-fixed.js',
      'simple-api-test.js',
      '**/*.ts',
      '**/*.tsx'
    ]
  },
  {
    files: [
      'client/src/**/*.{js,jsx}',
      'server/**/*.{js,jsx}',
      'packages/**/*.{js,jsx}'
    ],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module'
    },
    rules: {
      'no-console': 'off',
      'prefer-const': 'error',
      'no-var': 'error',
      'no-unused-vars': 'warn'
    }
  }
];
