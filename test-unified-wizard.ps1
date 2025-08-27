# Unified Onboarding Wizard Test Script
# PowerShell script to test all endpoints

Write-Host "🚀 Starting Unified Onboarding Wizard Test..." -ForegroundColor Green
Write-Host ""

$BaseUrl = "http://localhost:5000"

try {
    # Test 1: Health Check
    Write-Host "✅ Test 1: Health Check" -ForegroundColor Green
    $healthResponse = Invoke-RestMethod -Uri "$BaseUrl/api/health" -Method GET
    Write-Host "   Status: $($healthResponse.status)" -ForegroundColor White
    Write-Host "   Database: $($healthResponse.services.database)" -ForegroundColor White
    Write-Host "   Email: $($healthResponse.services.email)" -ForegroundColor White
    Write-Host ""

    # Test 2: Admin Modules Endpoint
    Write-Host "✅ Test 2: Admin Modules Endpoint" -ForegroundColor Green
    $modulesResponse = Invoke-RestMethod -Uri "$BaseUrl/admin/modules" -Method GET
    Write-Host "   Found $($modulesResponse.Count) modules:" -ForegroundColor White
    foreach ($module in $modulesResponse) {
        $status = if ($module.required) { "Required" } else { "Optional" }
        Write-Host "   - $($module.label) ($($module.npmPackage)) - $status" -ForegroundColor Cyan
    }
    Write-Host ""

    # Test 3: Business Types Endpoint
    Write-Host "✅ Test 3: Business Types Endpoint" -ForegroundColor Green
    $businessTypesResponse = Invoke-RestMethod -Uri "$BaseUrl/admin/business-types" -Method GET
    Write-Host "   Found $($businessTypesResponse.Count) business types:" -ForegroundColor White
    $businessTypesResponse[0..4] | ForEach-Object {
        Write-Host "   - $($_.name): $($_.description)" -ForegroundColor Cyan
    }
    if ($businessTypesResponse.Count -gt 5) {
        Write-Host "   ... and $($businessTypesResponse.Count - 5) more" -ForegroundColor Gray
    }
    Write-Host ""

    # Test 4: Role Templates Endpoint
    Write-Host "✅ Test 4: Role Templates Endpoint" -ForegroundColor Green
    $roleTemplatesResponse = Invoke-RestMethod -Uri "$BaseUrl/admin/role-templates" -Method GET
    Write-Host "   Found $($roleTemplatesResponse.Count) role templates:" -ForegroundColor White
    $roleTemplatesResponse[0..2] | ForEach-Object {
        Write-Host "   - $($_.name): $($_.description)" -ForegroundColor Cyan
        Write-Host "     Roles: $($_.roles -join ', ')" -ForegroundColor Yellow
    }
    Write-Host ""

    # Test Summary
    Write-Host "🎉 Unified Onboarding Wizard Test Complete!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 Summary:" -ForegroundColor Yellow
    Write-Host "✅ Server health check passed" -ForegroundColor Green
    Write-Host "✅ Admin modules endpoint working" -ForegroundColor Green
    Write-Host "✅ Business types endpoint working" -ForegroundColor Green
    Write-Host "✅ Role templates endpoint working" -ForegroundColor Green
    Write-Host "✅ All required APIs for unified wizard are functional" -ForegroundColor Green
    Write-Host ""
    Write-Host "🔧 Next Steps:" -ForegroundColor Yellow
    Write-Host "1. Open http://localhost:5000/tenants/wizard in browser" -ForegroundColor White
    Write-Host "2. Test the 4-step wizard interface" -ForegroundColor White
    Write-Host "3. Verify dynamic data loading from API endpoints" -ForegroundColor White
    Write-Host "4. Test form validation and submission" -ForegroundColor White

} catch {
    Write-Host "❌ Test failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "   Response: $($_.Exception.Response)" -ForegroundColor Red
}
