import { ConfidentialClientApplication } from "@azure/msal-node";
import { Client } from "@microsoft/microsoft-graph-client";
import dotenv from "dotenv";

dotenv.config();

async function debugGraphAccess() {
  console.log("🔍 Debugging Microsoft Graph access...");

  const msalClient = new ConfidentialClientApplication({
    auth: {
      clientId: process.env.AZURE_CLIENT_ID,
      clientSecret: process.env.AZURE_CLIENT_SECRET,
      authority: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}`,
    },
  });

  try {
    const tokenResponse = await msalClient.acquireTokenByClientCredential({
      scopes: ["https://graph.microsoft.com/.default"],
    });

    console.log("✅ Token acquired");

    const graphClient = Client.initWithMiddleware({
      authProvider: {
        getAccessToken: async () => {
          return tokenResponse.accessToken;
        },
      },
    });

    // Try to list users first
    console.log("🔍 Checking available users...");
    try {
      const users = await graphClient
        .api("/users")
        .select("mail,userPrincipalName,displayName")
        .get();
      console.log("📋 Available users:");
      users.value.forEach(user => {
        console.log(`   - ${user.displayName} (${user.mail || user.userPrincipalName})`);
      });

      // Try with the first available user
      if (users.value.length > 0) {
        const testUser = users.value[0];
        const fromEmail = testUser.mail || testUser.userPrincipalName;
        console.log(`\n📧 Attempting to send email from: ${fromEmail}`);

        const message = {
          subject: "Test Email - " + new Date().toLocaleString(),
          body: {
            contentType: "HTML",
            content: "<p>Test email from Microsoft Graph API</p>",
          },
          toRecipients: [{ emailAddress: { address: "akki@primussoft.com" } }],
        };

        await graphClient.api(`/users/${fromEmail}/sendMail`).post({ message });

        console.log("✅ Email sent successfully!");
      }
    } catch (userError) {
      console.error("❌ Error accessing users:", userError.message);
      console.error("Status:", userError.statusCode);
    }
  } catch (error) {
    console.error("❌ Token error:", error.message);
  }
}

debugGraphAccess();
