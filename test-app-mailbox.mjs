import { ConfidentialClientApplication } from "@azure/msal-node";
import { Client } from "@microsoft/microsoft-graph-client";
import dotenv from "dotenv";

dotenv.config();

async function testApplicationMailbox() {
  console.log("🧪 Testing application mailbox approach...");

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
    console.log("🔍 Token scopes available:", tokenResponse.tokenType);

    const graphClient = Client.initWithMiddleware({
      authProvider: {
        getAccessToken: async () => {
          return tokenResponse.accessToken;
        },
      },
    });

    // Let's first check if we can now access users with the new permission
    console.log("🔍 Checking users with new permissions...");
    try {
      const users = await graphClient
        .api("/users")
        .top(5)
        .select("mail,userPrincipalName,displayName")
        .get();
      console.log("✅ Users found:");
      users.value.forEach(user => {
        console.log(`   - ${user.displayName}: ${user.mail || user.userPrincipalName}`);
      });

      // Now try to send email from the first user
      if (users.value.length > 0) {
        const firstUser = users.value[0];
        const senderEmail = firstUser.mail || firstUser.userPrincipalName;

        console.log(`\n📧 Testing email send from: ${senderEmail}`);

        const message = {
          subject: "Microsoft Graph Success Test",
          body: {
            contentType: "HTML",
            content: `
                            <h2>🎉 Microsoft Graph Email Working!</h2>
                            <p>Successfully sent email via Microsoft Graph API</p>
                            <p><strong>Sender:</strong> ${senderEmail}</p>
                            <p><strong>Time:</strong> ${new Date().toISOString()}</p>
                        `,
          },
          toRecipients: [{ emailAddress: { address: "akki@primussoft.com" } }],
        };

        await graphClient.api(`/users/${senderEmail}/sendMail`).post({ message });

        console.log("✅ EMAIL SENT SUCCESSFULLY!");
        console.log("🎯 Microsoft Graph integration is now working!");
      }
    } catch (error) {
      console.error("❌ Error:", error.message);
      console.error("Status:", error.statusCode);

      // If user access fails, let's try application-level sending
      if (error.statusCode === 403 || error.statusCode === 401) {
        console.log("\n🔄 Trying alternative approach with application context...");

        try {
          // Try to use the application to send email directly
          const message = {
            subject: "Test from Application Context",
            body: {
              contentType: "HTML",
              content: "<p>Test email from application context</p>",
            },
            toRecipients: [{ emailAddress: { address: "akki@primussoft.com" } }],
          };

          // Try without specifying a user - let the application decide
          await graphClient.api("/me/sendMail").post({ message });
          console.log("✅ Email sent via application context!");
        } catch (appError) {
          console.error("❌ Application context failed:", appError.message);
          console.error("Status:", appError.statusCode);
        }
      }
    }
  } catch (error) {
    console.error("❌ Token acquisition failed:", error.message);
  }
}

testApplicationMailbox();
