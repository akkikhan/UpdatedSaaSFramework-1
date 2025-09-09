import { ConfidentialClientApplication } from "@azure/msal-node";
import { Client } from "@microsoft/microsoft-graph-client";
import dotenv from "dotenv";

// Load environment
dotenv.config();

async function testGraph() {
  console.log("🧪 Testing Microsoft Graph...");

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

    const message = {
      subject: "Test Email",
      body: {
        contentType: "HTML",
        content: "<p>Test email from Microsoft Graph</p>",
      },
      toRecipients: [{ emailAddress: { address: "akki@primussoft.com" } }],
    };

    await graphClient.api(`/users/${process.env.EMAIL_FROM}/sendMail`).post({ message });

    console.log("✅ Email sent successfully!");
  } catch (error) {
    console.error("❌ Error:", error.message);
    console.error("Status:", error.statusCode);
  }
}

testGraph();
