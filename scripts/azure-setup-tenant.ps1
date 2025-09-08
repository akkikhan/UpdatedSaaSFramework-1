$ErrorActionPreference = "Stop"

function Require-Cli($name) {
  if (-not (Get-Command $name -ErrorAction SilentlyContinue)) {
    Write-Error "Required CLI '$name' not found in PATH. Please install it and re-run."
  }
}

Require-Cli az

param(
  [Parameter(Mandatory=$false)][string]$DisplayName = "SaaS Tenant - h",
  [Parameter(Mandatory=$false)][string]$RedirectUri = "http://localhost:5000/api/auth/azure/callback",
  [Parameter(Mandatory=$false)][string]$OrgId = "h",
  [Parameter(Mandatory=$false)][string]$PlatformBase = "http://localhost:5000"
)

Write-Host "\n=== Azure AD setup (device code login) ===" -ForegroundColor Cyan
az login --use-device-code | Out-Null

$tenantId = az account show --query tenantId -o tsv
if (-not $tenantId) { throw "Failed to obtain tenantId from 'az account show'" }
Write-Host "Tenant ID: $tenantId"

Write-Host "\nCreating Azure AD app registration: $DisplayName" -ForegroundColor Cyan
$appJson = az ad app create --display-name "$DisplayName" --sign-in-audience AzureADMyOrg --web-redirect-uris "$RedirectUri" | ConvertFrom-Json
$clientId = $appJson.appId
if (-not $clientId) { throw "Failed to create app registration" }
Write-Host "Client ID: $clientId"

Write-Host "\nCreating client secret..." -ForegroundColor Cyan
$credJson = az ad app credential reset --id $clientId --display-name "SaaS Secret" --years 1 | ConvertFrom-Json
$clientSecret = $credJson.password
if (-not $clientSecret) { throw "Failed to create client secret" }

Write-Host "\nNOTE: Grant Microsoft Graph permissions (User.Read) in Azure Portal → App registrations → API permissions → Add → Microsoft Graph (Delegated) → User.Read → Grant admin consent." -ForegroundColor Yellow

# Fetch tenant row by orgId to discover tenant UUID for config API
Write-Host "\nFetching tenant by orgId '$OrgId' from platform ($PlatformBase)..." -ForegroundColor Cyan
try {
  $tenant = Invoke-RestMethod -Method GET -Uri "$PlatformBase/api/tenants/by-org-id/$OrgId"
} catch {
  Write-Warning "Failed to fetch tenant from platform. Ensure the platform server is running and orgId is correct."
}

$payload = [ordered]@{
  tenantId    = $tenantId
  clientId    = $clientId
  clientSecret= $clientSecret
  callbackUrl = $RedirectUri
}

New-Item -ItemType Directory -Force -Path "$PSScriptRoot/../.local" | Out-Null
$outFile = "$PSScriptRoot/../.local/azure-$OrgId.json"
$payload | ConvertTo-Json | Set-Content -Path $outFile
Write-Host "\nSaved Azure config to $outFile" -ForegroundColor Green

if ($tenant.id) {
  Write-Host "\nYou can now configure the tenant in the platform with this one-liner (paste your Platform Admin JWT):" -ForegroundColor Cyan
  Write-Host ""
  Write-Host ("powershell -Command \"`$h=@{{'Content-Type'='application/json';'Authorization'='Bearer <PASTE_PLATFORM_ADMIN_TOKEN>'}};`$b=Get-Content -Raw '{0}'; Invoke-RestMethod -Method POST -Headers `$h -Uri '{1}/api/tenants/{2}/azure-ad/config' -Body `$b\"" -f $outFile, $PlatformBase, $tenant.id) -ForegroundColor Yellow
  Write-Host ""
} else {
  Write-Warning "Tenant UUID could not be resolved from the platform. Use the file above to configure via the Admin Portal or API."
}

Write-Host "\nDone. Next steps:" -ForegroundColor Green
Write-Host " - Grant Graph User.Read in Azure Portal and click 'Grant admin consent'"
Write-Host " - Configure the tenant with the generated JSON (Admin API or Admin Portal)"
Write-Host " - In Tenant Portal, click 'Validate Azure Config' then 'Test Azure SSO'"

