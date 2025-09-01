#!/usr/bin/env pwsh

# SaaS Framework - Package Testing Script
# This script tests all SDK packages before publishing

Write-Host "=== SaaS Framework Package Testing ===" -ForegroundColor Cyan
Write-Host "Testing all SDK packages..." -ForegroundColor Green

# Define packages to test
$packages = @(
    @{Name="email"; Path="packages/email"},
    @{Name="auth"; Path="packages/auth"},
    @{Name="logging"; Path="packages/logging"},
    @{Name="rbac"; Path="packages/rbac"}
)

$testResults = @()

# Test 1: TypeScript Compilation
Write-Host "`n=== Test 1: TypeScript Compilation ===" -ForegroundColor Cyan

foreach ($pkg in $packages) {
    Write-Host "Testing $($pkg.Name) compilation..." -ForegroundColor Yellow
    
    try {
        Set-Location $pkg.Path
        npm run build
        Write-Host "✅ $($pkg.Name) compiles successfully" -ForegroundColor Green
        $testResults += @{Package=$pkg.Name; Test="Compilation"; Status="Pass"}
        Set-Location ../..
    } catch {
        Write-Host "❌ $($pkg.Name) compilation failed" -ForegroundColor Red
        $testResults += @{Package=$pkg.Name; Test="Compilation"; Status="Fail"}
        Set-Location ../..
    }
}

# Test 2: Package Structure Validation
Write-Host "`n=== Test 2: Package Structure Validation ===" -ForegroundColor Cyan

foreach ($pkg in $packages) {
    Write-Host "Validating $($pkg.Name) structure..." -ForegroundColor Yellow
    
    $packagePath = $pkg.Path
    $requiredFiles = @("package.json", "README.md", "src/index.ts", "tsconfig.json")
    $missingFiles = @()
    
    foreach ($file in $requiredFiles) {
        $filePath = Join-Path $packagePath $file
        if (-not (Test-Path $filePath)) {
            $missingFiles += $file
        }
    }
    
    if ($missingFiles.Count -eq 0) {
        Write-Host "✅ $($pkg.Name) structure is valid" -ForegroundColor Green
        $testResults += @{Package=$pkg.Name; Test="Structure"; Status="Pass"}
    } else {
        Write-Host "❌ $($pkg.Name) missing files: $($missingFiles -join ', ')" -ForegroundColor Red
        $testResults += @{Package=$pkg.Name; Test="Structure"; Status="Fail"}
    }
}

# Test 3: Package.json Validation
Write-Host "`n=== Test 3: Package.json Validation ===" -ForegroundColor Cyan

foreach ($pkg in $packages) {
    Write-Host "Validating $($pkg.Name) package.json..." -ForegroundColor Yellow
    
    $packageJsonPath = Join-Path $pkg.Path "package.json"
    
    try {
        $packageJson = Get-Content $packageJsonPath | ConvertFrom-Json
        
        $requiredFields = @("name", "version", "description", "main", "types", "author", "license")
        $missingFields = @()
        
        foreach ($field in $requiredFields) {
            if (-not $packageJson.$field) {
                $missingFields += $field
            }
        }
        
        if ($missingFields.Count -eq 0) {
            Write-Host "✅ $($pkg.Name) package.json is valid" -ForegroundColor Green
            $testResults += @{Package=$pkg.Name; Test="Package.json"; Status="Pass"}
        } else {
            Write-Host "❌ $($pkg.Name) package.json missing: $($missingFields -join ', ')" -ForegroundColor Red
            $testResults += @{Package=$pkg.Name; Test="Package.json"; Status="Fail"}
        }
    } catch {
        Write-Host "❌ $($pkg.Name) package.json is invalid JSON" -ForegroundColor Red
        $testResults += @{Package=$pkg.Name; Test="Package.json"; Status="Fail"}
    }
}

# Test 4: TypeScript Declarations
Write-Host "`n=== Test 4: TypeScript Declarations ===" -ForegroundColor Cyan

foreach ($pkg in $packages) {
    Write-Host "Checking $($pkg.Name) TypeScript declarations..." -ForegroundColor Yellow
    
    $distPath = Join-Path $pkg.Path "dist"
    $declarationFile = Join-Path $distPath "index.d.ts"
    
    if (Test-Path $declarationFile) {
        Write-Host "✅ $($pkg.Name) TypeScript declarations exist" -ForegroundColor Green
        $testResults += @{Package=$pkg.Name; Test="Declarations"; Status="Pass"}
    } else {
        Write-Host "❌ $($pkg.Name) TypeScript declarations missing" -ForegroundColor Red
        $testResults += @{Package=$pkg.Name; Test="Declarations"; Status="Fail"}
    }
}

# Test 5: Import Syntax Validation
Write-Host "`n=== Test 5: Import Syntax Validation ===" -ForegroundColor Cyan

foreach ($pkg in $packages) {
    Write-Host "Validating $($pkg.Name) import syntax..." -ForegroundColor Yellow
    
    $distPath = Join-Path $pkg.Path "dist"
    $indexFile = Join-Path $distPath "index.js"
    
    if (Test-Path $indexFile) {
        # Check if file has proper exports
        $content = Get-Content $indexFile -Raw
        if ($content -match "export" -or $content -match "module.exports") {
            Write-Host "✅ $($pkg.Name) has valid exports" -ForegroundColor Green
            $testResults += @{Package=$pkg.Name; Test="Exports"; Status="Pass"}
        } else {
            Write-Host "❌ $($pkg.Name) has no exports" -ForegroundColor Red
            $testResults += @{Package=$pkg.Name; Test="Exports"; Status="Fail"}
        }
    } else {
        Write-Host "❌ $($pkg.Name) compiled JavaScript not found" -ForegroundColor Red
        $testResults += @{Package=$pkg.Name; Test="Exports"; Status="Fail"}
    }
}

# Test Summary
Write-Host "`n=== Test Summary ===" -ForegroundColor Cyan

$totalTests = $testResults.Count
$passedTests = ($testResults | Where-Object { $_.Status -eq "Pass" }).Count
$failedTests = $totalTests - $passedTests

Write-Host "Total Tests: $totalTests" -ForegroundColor White
Write-Host "Passed: $passedTests" -ForegroundColor Green
Write-Host "Failed: $failedTests" -ForegroundColor Red

if ($failedTests -eq 0) {
    Write-Host "`n🎉 All tests passed! Packages are ready for publishing." -ForegroundColor Green
    exit 0
} else {
    Write-Host "`n❌ Some tests failed. Please fix issues before publishing:" -ForegroundColor Red
    
    $failedResults = $testResults | Where-Object { $_.Status -eq "Fail" }
    foreach ($result in $failedResults) {
        Write-Host "  - $($result.Package): $($result.Test)" -ForegroundColor Red
    }
    
    exit 1
}
