# Azure Resources Management Script for SaaS Framework
# Generated on 2025-09-04

param(
    [Parameter(HelpMessage="Action to perform: list, create-secret, delete-app, or status")]
    [string]$Action = "status"
)

# Configuration
$appId = "4b4d65bc-f22c-4899-9f03-db50bb7ebafc"
$appName = "SaaS-Framework-Demo"

Write-Host "=== Azure Resources Management for SaaS Framework ===" -ForegroundColor Cyan
Write-Host "App ID: $appId" -ForegroundColor Yellow
Write-Host "App Name: $appName" -ForegroundColor Yellow
Write-Host ""

switch ($Action.ToLower()) {
    "status" {
        Write-Host "Checking Azure AD Application status..." -ForegroundColor Green
        az ad app show --id $appId --query "{appId:appId, displayName:displayName, signInAudience:signInAudience}" -o table
        
        Write-Host "`nChecking current Azure account..." -ForegroundColor Green
        az account show --query "{name:name, id:id, tenantId:tenantId, user:user.name}" -o table
    }
    
    "list" {
        Write-Host "Listing all Azure AD Applications..." -ForegroundColor Green
        az ad app list --display-name $appName --query "[].{AppId:appId, DisplayName:displayName, CreatedDateTime:createdDateTime}" -o table
    }
    
    "create-secret" {
        Write-Host "Creating new client secret..." -ForegroundColor Green
        $secret = az ad app credential reset --id $appId --append --query "{appId:appId, password:password, tenant:tenant}" -o json | ConvertFrom-Json
        
        Write-Host "New credentials generated:" -ForegroundColor Yellow
        Write-Host "App ID: $($secret.appId)" -ForegroundColor White
        Write-Host "Client Secret: $($secret.password)" -ForegroundColor White
        Write-Host "Tenant ID: $($secret.tenant)" -ForegroundColor White
        Write-Host ""
        Write-Host "IMPORTANT: Update your .env file with the new client secret!" -ForegroundColor Red
    }
    
    "delete-app" {
        Write-Host "WARNING: This will delete the Azure AD application!" -ForegroundColor Red
        $confirm = Read-Host "Are you sure? Type 'yes' to confirm"
        if ($confirm -eq "yes") {
            az ad app delete --id $appId
            Write-Host "Application deleted." -ForegroundColor Green
        } else {
            Write-Host "Operation cancelled." -ForegroundColor Yellow
        }
    }
    
    "permissions" {
        Write-Host "Checking API permissions..." -ForegroundColor Green
        az ad app show --id $appId --query "requiredResourceAccess" -o table
        
        Write-Host "`nTo grant admin consent for permissions, run:" -ForegroundColor Yellow
        Write-Host "az ad app permission admin-consent --id $appId" -ForegroundColor White
    }
    
    default {
        Write-Host "Available actions:" -ForegroundColor Green
        Write-Host "  status        - Show current application and account status"
        Write-Host "  list          - List Azure AD applications"
        Write-Host "  create-secret - Generate new client secret"
        Write-Host "  permissions   - Check and grant API permissions"
        Write-Host "  delete-app    - Delete the Azure AD application"
        Write-Host ""
        Write-Host "Usage: .\azure-credentials-manager.ps1 -Action <action>"
        Write-Host "Example: .\azure-credentials-manager.ps1 -Action status"
    }
}
