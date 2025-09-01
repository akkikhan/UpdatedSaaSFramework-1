# PowerShell script to test creating a tenant
$token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhZG1pbklkIjoiZDA5NzEyMjMtMTg1NC00YzA0LWFlYzktNmZmMGMzZTU5ODVlIiwiZW1haWwiOiJhZG1pbkB5b3VyY29tcGFueS5jb20iLCJuYW1lIjoiUGxhdGZvcm0gQWRtaW5pc3RyYXRvciIsInJvbGUiOiJzdXBlcl9hZG1pbiIsInR5cGUiOiJwbGF0Zm9ybV9hZG1pbiIsImlhdCI6MTc1Njc1NjgwOCwiZXhwIjoxNzU2Nzg1NjA4fQ.VHuXRQhH31RPsmzqNbBRlpmzzPBSM8_BEyH8Mq0Diic"

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

$body = @{
    orgId = "demo-org-$(Get-Date -Format 'yyyyMMddHHmmss')"
    name = "Demo Organization"
    adminEmail = "demo@example.com"
    enabledModules = @("auth", "rbac")
    moduleConfigs = @{}
    sendEmail = $false
} | ConvertTo-Json

Write-Host "Creating new tenant..." -ForegroundColor Yellow
$response = Invoke-RestMethod -Method Post -Uri "http://localhost:5000/api/tenants" -Headers $headers -Body $body

Write-Host "`n✅ Tenant created successfully!" -ForegroundColor Green
Write-Host "Tenant Details:" -ForegroundColor Cyan
$response | ConvertTo-Json -Depth 10