import { ConfidentialClientApplication } from "@azure/msal-node";
import { Client } from "@microsoft/microsoft-graph-client";
import dotenv from "dotenv";

dotenv.config();

async function testWithActualUser() {
  console.log("🧪 Testing with actual user email...");

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

    // Try with akki@primussoft.com as sender (since that's the recipient)
    const fromEmail = "akki@primussoft.com";
    console.log(`📧 Attempting to send email from: ${fromEmail}`);

    const message = {
      subject: "Microsoft Graph Test - " + new Date().toLocaleString(),
      body: {
        contentType: "HTML",
        content: `
                    <h2>✅ Success!</h2>
                    <p>Microsoft Graph email is working!</p>
                    <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
                    <p><strong>From:</strong> ${fromEmail}</p>
                `,
      },
      toRecipients: [{ emailAddress: { address: "akki@primussoft.com" } }],
    };

    await graphClient.api(`/users/${fromEmail}/sendMail`).post({ message });

    console.log("✅ Email sent successfully from Microsoft Graph!");
    console.log("🎯 The integration is working!");
  } catch (error) {
    console.error("❌ Error:", error.message);
    console.error("Status:", error.statusCode);

    if (error.statusCode === 404) {
      console.error("🔍 User not found. The email address may not exist in your Azure AD tenant.");
    } else if (error.statusCode === 401) {
      console.error("🔍 Authentication failed. Check Mail.Send permissions.");
    } else if (error.statusCode === 403) {
      console.error(
        "🔍 Forbidden. May need additional permissions or the user may not have a mailbox."
      );
    }
  }
}

testWithActualUser();
