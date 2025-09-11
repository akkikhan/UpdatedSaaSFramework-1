export default [
  {
    ignores: [
      "dist/**",
      "build/**",
      "node_modules/**",
      "coverage/**",
      "*.config.js",
      "*.config.ts",
      "*.config.cjs",
      "vite.config.ts",
      "tailwind.config.ts",
      "**/comprehensive-demo*.js",
      "**/comprehensive-demo*.cjs",
      "**/demo-app/index.js",
      "**/test-*.js",
      "**/test-*.cjs",
      "**/server-fixed.js",
      "**/simple-api-test.js",
      "packages/*/example*.js",
      "packages/*/example*.jsx",
    ],
  },
  {
    files: ["**/*.{js,jsx,ts,tsx}"] ,
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: { browser: true, node: true, jest: true },
    },
    rules: {
      "no-unused-vars": "warn",
      "no-console": "off",
      "prefer-const": "error",
      "no-var": "error",
    },
  },
];
