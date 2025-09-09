import { ConfidentialClientApplication } from "@azure/msal-node";
import { Client } from "@microsoft/microsoft-graph-client";
import dotenv from "dotenv";

dotenv.config();

async function testWithTestUser() {
  console.log("🧪 Testing with Test User 1...");

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

    // Test with testuser1 which should have a proper mailbox
    const testUserEmail = "testuser1@khanaakiboutlook.onmicrosoft.com";
    console.log(`📧 Testing email send from: ${testUserEmail}`);

    const message = {
      subject: "Microsoft Graph Test - FINAL ATTEMPT",
      body: {
        contentType: "HTML",
        content: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h1 style="color: #4CAF50;">🎉 Microsoft Graph Email Success!</h1>
                        <p>This email confirms that the Microsoft Graph integration is working correctly.</p>
                        
                        <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
                            <h3>📋 Test Details:</h3>
                            <ul>
                                <li><strong>Sender:</strong> ${testUserEmail}</li>
                                <li><strong>Method:</strong> Microsoft Graph API</li>
                                <li><strong>Authentication:</strong> Client Credentials Flow</li>
                                <li><strong>Permissions:</strong> Mail.Send + Mail.Send.Shared + User.Read.All</li>
                                <li><strong>Timestamp:</strong> ${new Date().toISOString()}</li>
                            </ul>
                        </div>
                        
                        <p style="color: #666; font-style: italic;">
                            Migration from SMTP to Microsoft Graph completed successfully! 🚀
                        </p>
                    </div>
                `,
      },
      toRecipients: [{ emailAddress: { address: "akki@primussoft.com" } }],
    };

    await graphClient.api(`/users/${testUserEmail}/sendMail`).post({ message });

    console.log("✅ EMAIL SENT SUCCESSFULLY FROM TEST USER!");
    console.log("🎯 Microsoft Graph integration is working!");
    console.log("💡 Now update your EmailService to use a valid sender email address");
  } catch (error) {
    console.error("❌ Final test failed:", error.message);
    console.error("Status:", error.statusCode);

    if (error.statusCode === 401) {
      console.log("\n🔍 Still getting 401. Possible issues:");
      console.log("   1. Permission propagation delay (wait 5-10 minutes)");
      console.log("   2. User mailbox not properly licensed");
      console.log("   3. Organization policies preventing app-only email");
      console.log("   4. Need to wait for Azure AD to sync permissions");
    }
  }
}

testWithTestUser();
