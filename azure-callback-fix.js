// Azure AD Callback Fix
// This file contains the corrected code section for the Azure AD callback issue

const azureCallbackFix = `
      // Create Azure AD service instance
      let azureADService;
      
      if (fallbackToPlatform) {
        console.log("Using platform Azure AD configuration...");
        azureADService = new AzureADService({
          tenantId: process.env.AZURE_TENANT_ID || "common",
          clientId: process.env.AZURE_CLIENT_ID || "",
          clientSecret: process.env.AZURE_CLIENT_SECRET || "",
          redirectUri: \`\${req.protocol}://\${req.get("host")}/api/auth/azure/callback\`,
        });
      } else {
        console.log("Using tenant-specific Azure AD configuration...");
        
        // Double-check that azureProvider and config exist
        if (!azureProvider || !azureProvider.config) {
          console.error("Azure AD provider or config is missing for tenant:", tenant.orgId);
          return res.status(400).json({
            message: "Azure AD configuration is incomplete for this tenant",
            tenantId: tenant.id,
            orgId: tenant.orgId,
          });
        }

        // Validate required configuration fields
        const { tenantId, clientId, clientSecret } = azureProvider.config;
        if (!tenantId || !clientId || !clientSecret) {
          console.error("Incomplete Azure AD configuration for tenant:", tenant.orgId, {
            hasTenantId: !!tenantId,
            hasClientId: !!clientId,
            hasClientSecret: !!clientSecret,
          });
          return res.status(400).json({
            message: "Azure AD configuration is incomplete",
            missing: {
              tenantId: !tenantId,
              clientId: !clientId,
              clientSecret: !clientSecret,
            },
          });
        }

        azureADService = new AzureADService({
          tenantId: azureProvider.config.tenantId,
          clientId: azureProvider.config.clientId,
          clientSecret: azureProvider.config.clientSecret,
          redirectUri:
            azureProvider.config.redirectUri ||
            azureProvider.config.callbackUrl ||
            \`\${req.protocol}://\${req.get("host")}/api/auth/azure/callback\`,
        });
      }
`;

module.exports = { azureCallbackFix };