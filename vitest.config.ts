import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    root: '.',
    include: [
      'test/**/*.{test,spec}.{js,ts}',
      'server/**/*.{test,spec}.{js,ts}',
      'client/src/**/*.{test,spec}.{js,ts,jsx,tsx}'
    ],
    exclude: [
      'node_modules',
      'dist',
      'build'
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: [
        'server/**/*.{js,ts}',
        'client/src/**/*.{js,ts,jsx,tsx}',
        'shared/**/*.{js,ts}'
      ],
      exclude: [
        'node_modules',
        'test',
        'dist',
        'build',
        '**/*.test.{js,ts}',
        '**/*.spec.{js,ts}',
        '**/index.ts'
      ]
    },
    setupFiles: ['./test/setup.ts']
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './'),
      '@client': resolve(__dirname, './client/src'),
      '@server': resolve(__dirname, './server'),
      '@shared': resolve(__dirname, './shared')
    }
  }
});
