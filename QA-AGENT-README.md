# Automated QA Testing Agent

## 🤖 Overview

This is a comprehensive automated QA testing agent that simulates human tester
behavior with AI-powered testing strategies. It performs:

- ✅ **UI/Frontend Testing** - Page load, responsiveness, form validation
- ✅ **API Testing** - Endpoint validation, status codes, CORS
- ✅ **Database Testing** - Schema validation, data integrity, queries
- ✅ **Authentication Testing** - Login flows, unauthorized access, session
  management
- ✅ **Performance Testing** - Load times, API response times
- ✅ **Security Testing** - SQL injection, XSS, CSRF protection
- ✅ **E2E Workflows** - Complete user journeys

## 🚀 Quick Start

### 1. Install Dependencies

```powershell
# Install Playwright and dependencies
npm install -D playwright node-fetch
npx playwright install chromium
```

### 2. Run Tests

```powershell
# Full test suite
node automated-qa-agent.mjs

# Or use npm script (after adding to package.json)
npm run test:qa
```

### 3. View Results

The agent will:

- Display real-time test progress in console
- Show ✅/❌ for each test
- Take screenshots on failures
- Generate JSON report: `qa-report-{timestamp}.json`

## 📊 Test Categories

### Infrastructure Tests

- Server health check
- Database connectivity
- Schema validation

### UI Tests (Requires Playwright)

- Admin login page load
- Form elements validation
- Responsive design (mobile/desktop)
- Navigation and redirects

### API Tests

- Health endpoint
- Protected routes (401/403 validation)
- CORS headers
- 404 handling

### Authentication Tests

- Azure AD OAuth flow
- Local admin login
- Unauthorized access prevention
- Session management

### Database Tests

- Platform admin records
- Data integrity checks
- Orphaned records detection

### Performance Tests

- Page load time (<3s threshold)
- API response time (<500ms threshold)

### Security Tests

- SQL injection prevention
- XSS (Cross-Site Scripting) protection
- CSRF token validation

## 🎯 Example Output

```
═══════════════════════════════════════════════════════
🚀 Initializing QA Testing Agent...
═══════════════════════════════════════════════════════
✅ Database connection initialized
✅ Browser (Chromium) initialized
═══════════════════════════════════════════════════════

🏃 Running Test Suite...

🏗️  INFRASTRUCTURE TESTS
────────────────────────────────────────────────────────

🧪 Testing: Server Health Endpoint
✅ PASSED (124ms)

🧪 Testing: Database Connectivity
✅ PASSED (89ms)

🎨 UI/FRONTEND TESTS
────────────────────────────────────────────────────────

🧪 Testing: Admin Login Page Load
✅ PASSED (1876ms)

🧪 Testing: Admin Login Form Elements
✅ PASSED (523ms)

... (more tests)

═══════════════════════════════════════════════════════
📊 QA TEST REPORT
═══════════════════════════════════════════════════════

📈 Summary:
────────────────────────────────────────────────────────
Total Tests:  25
✅ Passed:     23 (92.0%)
❌ Failed:     2 (8.0%)
⏭️  Skipped:    0

📋 Results by Category:
────────────────────────────────────────────────────────

Infrastructure:
  ✅ Server Health Endpoint (124ms)
  ✅ Database Connectivity (89ms)
  ✅ Database Schema Validation (156ms)

UI:
  ✅ Admin Login Page Load (1876ms)
  ✅ Admin Login Form Elements (523ms)
  ❌ Responsive Design (Mobile) (892ms)
     Error: Horizontal scroll detected on mobile viewport

... (more categories)

💾 Detailed report saved: qa-report-1730123456789.json
```

## 🛠️ Configuration

The agent uses environment variables:

```env
BASE_URL=http://localhost:5000
DATABASE_URL=postgresql://user:pass@host:5432/db
```

## 📸 Screenshots

Failed tests automatically capture screenshots:

- `test-failure-{timestamp}.png` - Full page screenshot
- Saved in project root
- Listed in final report

## 🔧 Customization

### Add Custom Tests

```javascript
async testCustomFeature() {
  await this.test('My Custom Test', 'Custom', async () => {
    // Your test logic here
    if (somethingFailed) {
      throw new Error('Test failed because...');
    }
  });
}
```

### Modify Thresholds

```javascript
// In testPageLoadPerformance()
if (loadTime > 5000) {
  // Changed from 3000ms
  throw new Error(`Page load too slow: ${loadTime}ms`);
}
```

## 📋 Report Format

JSON report includes:

```json
{
  "timestamp": "2025-10-29T07:00:00.000Z",
  "baseUrl": "http://localhost:5000",
  "summary": {
    "total": 25,
    "passed": 23,
    "failed": 2,
    "skipped": 0,
    "passRate": "92.0"
  },
  "byCategory": {
    "Infrastructure": {
      "passed": 3,
      "failed": 0,
      "tests": [...]
    }
  },
  "allTests": [...],
  "screenshots": [...]
}
```

## 🚨 Troubleshooting

### Browser Not Available

```
⚠️  Browser initialization failed (Playwright not installed?)
   Install with: npm install -D playwright
   Some tests will be skipped.
```

**Fix:**

```powershell
npm install -D playwright
npx playwright install chromium
```

### Database Connection Failed

```
❌ FAILED: Database Connectivity
   Error: Database pool not initialized
```

**Fix:** Set DATABASE_URL in .env file

### Port 5000 Not Available

**Fix:** Start the server first:

```powershell
npm run dev
```

## 🎓 Best Practices

1. **Run before deployments** - Catch issues early
2. **Review failed tests** - Check screenshots and error messages
3. **Update thresholds** - Adjust performance targets for your needs
4. **Add custom tests** - Test your specific features
5. **CI/CD Integration** - Run in automated pipelines

## 🔄 CI/CD Integration

### GitHub Actions

```yaml
- name: Run QA Tests
  run: |
    npm run test:qa

- name: Upload Screenshots
  if: failure()
  uses: actions/upload-artifact@v3
  with:
    name: test-failures
    path: test-failure-*.png
```

### Azure DevOps

```yaml
- script: node automated-qa-agent.mjs
  displayName: "Run QA Tests"

- task: PublishTestResults@2
  inputs:
    testResultsFiles: "qa-report-*.json"
```

## 📚 Advanced Features

### Parallel Testing

The agent can be extended for parallel test execution:

```javascript
await Promise.all([
  this.testServerHealth(),
  this.testDatabaseConnection(),
  this.testHealthEndpoint(),
]);
```

### Custom Reporters

Export to different formats:

```javascript
// In generateReport()
await this.exportToJUnit();
await this.exportToHTML();
await this.sendToSlack();
```

### Performance Profiling

Track timing for all operations:

```javascript
performance.mark("test-start");
// ... test logic
performance.mark("test-end");
performance.measure("test-duration", "test-start", "test-end");
```

## 🤝 Contributing

Add new test categories:

1. Create test methods following naming: `test{Feature}()`
2. Use `await this.test()` wrapper
3. Add to `runAllTests()` suite
4. Update documentation

## 📄 License

MIT - Use freely in your projects
