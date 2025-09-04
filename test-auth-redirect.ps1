# Test authentication redirect behavior
$url = "http://localhost:5000"

try {
    Write-Host "Testing authentication redirect for: $url" -ForegroundColor Yellow
    
    # Make the request
    $response = Invoke-WebRequest -Uri $url -UseBasicParsing -MaximumRedirection 0 -ErrorAction SilentlyContinue
    
    Write-Host "Status Code: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "Content Type: $($response.Headers['Content-Type'])" -ForegroundColor Green
    
    # Check if it's HTML content (should be the React app)
    if ($response.Content -like "*<div id=""root"">*") {
        Write-Host "✅ React app loaded successfully" -ForegroundColor Green
        
        # Check if the content contains the authentication guard logic
        if ($response.Content -like "*platformAdminToken*" -or $response.Content -like "*AuthGuard*") {
            Write-Host "✅ Authentication logic detected in the app" -ForegroundColor Green
        } else {
            Write-Host "⚠️  Authentication logic not found in response" -ForegroundColor Yellow
        }
    } else {
        Write-Host "❌ Unexpected response content" -ForegroundColor Red
    }
    
    Write-Host "`nTesting complete. The React app should handle client-side redirects." -ForegroundColor Cyan
    
} catch {
    Write-Host "Error testing: $($_.Exception.Message)" -ForegroundColor Red
}
