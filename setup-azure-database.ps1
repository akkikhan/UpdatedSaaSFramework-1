# Azure PostgreSQL Database Setup Script for SaaS Platform
# This script creates an Azure PostgreSQL Flexible Server with all necessary configurations

Write-Host "`n🗄️  Azure PostgreSQL Database Setup for SaaS Platform`n" -ForegroundColor Cyan

# Configuration
$timestamp = (Get-Date).ToString("yyyyMMddHHmmss")
$resourceGroup = "saas-framework-rg"
$location = "eastus"
$serverName = "saas-db-$timestamp"
$dbName = "saasplatform"
$adminUser = "saasadmin"
$adminPassword = "SaaS@Secure2025!$(Get-Random -Minimum 1000 -Maximum 9999)"

Write-Host "📋 Configuration:" -ForegroundColor Yellow
Write-Host "   Resource Group: $resourceGroup"
Write-Host "   Location: $location"
Write-Host "   Server Name: $serverName"
Write-Host "   Database: $dbName"
Write-Host "   Admin User: $adminUser"
Write-Host ""

# Step 1: Create resource group
Write-Host "1️⃣  Creating resource group..." -ForegroundColor Green
try {
    az group create --name $resourceGroup --location $location --output table
    if ($LASTEXITCODE -ne 0) { throw "Resource group creation failed" }
    Write-Host "   ✅ Resource group created" -ForegroundColor Green
} catch {
    Write-Host "   ⚠️  Resource group may already exist or creation failed: $_" -ForegroundColor Yellow
}

# Step 2: Create PostgreSQL Flexible Server
Write-Host "`n2️⃣  Creating PostgreSQL Flexible Server..." -ForegroundColor Green
Write-Host "   ⏳ This takes 3-5 minutes, please wait..." -ForegroundColor Gray
Write-Host ""

try {
    az postgres flexible-server create `
        --resource-group $resourceGroup `
        --name $serverName `
        --location $location `
        --admin-user $adminUser `
        --admin-password $adminPassword `
        --sku-name Standard_B1ms `
        --tier Burstable `
        --storage-size 32 `
        --version 14 `
        --public-access 0.0.0.0 `
        --yes `
        --output table
    
    if ($LASTEXITCODE -ne 0) { throw "Server creation failed" }
    Write-Host "   ✅ PostgreSQL server created successfully" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Server creation failed: $_" -ForegroundColor Red
    exit 1
}

# Step 3: Create database
Write-Host "`n3️⃣  Creating database '$dbName'..." -ForegroundColor Green
try {
    az postgres flexible-server db create `
        --resource-group $resourceGroup `
        --server-name $serverName `
        --database-name $dbName `
        --output table
    
    if ($LASTEXITCODE -ne 0) { throw "Database creation failed" }
    Write-Host "   ✅ Database created" -ForegroundColor Green
} catch {
    Write-Host "   ⚠️  Database creation failed: $_" -ForegroundColor Yellow
}

# Step 4: Configure firewall - Allow Azure services
Write-Host "`n4️⃣  Configuring firewall rules..." -ForegroundColor Green
try {
    az postgres flexible-server firewall-rule create `
        --resource-group $resourceGroup `
        --name $serverName `
        --rule-name AllowAzureServices `
        --start-ip-address 0.0.0.0 `
        --end-ip-address 0.0.0.0 `
        --output table
    
    Write-Host "   ✅ Azure services firewall rule added" -ForegroundColor Green
} catch {
    Write-Host "   ⚠️  Azure services rule failed: $_" -ForegroundColor Yellow
}

# Step 5: Configure firewall - Allow your local IP
try {
    $myIp = (Invoke-WebRequest -Uri "https://api.ipify.org" -UseBasicParsing).Content
    Write-Host "   Your IP: $myIp"
    
    az postgres flexible-server firewall-rule create `
        --resource-group $resourceGroup `
        --name $serverName `
        --rule-name AllowLocalDevelopment `
        --start-ip-address $myIp `
        --end-ip-address $myIp `
        --output table
    
    Write-Host "   ✅ Local development firewall rule added" -ForegroundColor Green
} catch {
    Write-Host "   ⚠️  Local IP rule failed: $_" -ForegroundColor Yellow
}

# Generate connection string
$fqdn = "$serverName.postgres.database.azure.com"
$connectionString = "postgresql://${adminUser}:${adminPassword}@${fqdn}:5432/${dbName}?sslmode=require"

Write-Host "`n✅ Database Setup Complete!`n" -ForegroundColor Green

# Display connection information
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "📝 Database Connection Details" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""
Write-Host "Server FQDN: " -NoNewline; Write-Host $fqdn -ForegroundColor White
Write-Host "Database: " -NoNewline; Write-Host $dbName -ForegroundColor White
Write-Host "Admin User: " -NoNewline; Write-Host $adminUser -ForegroundColor White
Write-Host "Admin Password: " -NoNewline; Write-Host $adminPassword -ForegroundColor White
Write-Host ""
Write-Host "CONNECTION STRING (copy to .env):" -ForegroundColor Yellow
Write-Host "DATABASE_URL=$connectionString" -ForegroundColor White
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan

# Save credentials
$credentialsFile = "azure-db-credentials.txt"
@"
=================================================
Azure PostgreSQL Database Credentials
Created: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
=================================================

Resource Group: $resourceGroup
Location: $location
Server Name: $serverName
Full Server FQDN: $fqdn

Database Name: $dbName
Admin User: $adminUser
Admin Password: $adminPassword

CONNECTION STRING (for .env):
DATABASE_URL=$connectionString

=================================================
IMPORTANT: Keep this file secure and do not commit to version control!
=================================================
"@ | Out-File -FilePath $credentialsFile -Encoding UTF8

Write-Host "`n💾 Credentials saved to: " -NoNewline -ForegroundColor Yellow
Write-Host $credentialsFile -ForegroundColor White
Write-Host ""
Write-Host "🎯 Next Steps:" -ForegroundColor Cyan
Write-Host "   1. Copy the DATABASE_URL above to your .env file"
Write-Host "   2. Remove the BYPASS_ADMIN_AUTH=true line from .env"
Write-Host "   3. Run: npm run db:push (to create all tables)"
Write-Host "   4. Run: npm run setup:platform-admin (to create your admin account)"
Write-Host "   5. Restart the server: npm run dev"
Write-Host ""
