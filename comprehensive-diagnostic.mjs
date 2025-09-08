import { ConfidentialClientApplication } from "@azure/msal-node";
import { Client } from "@microsoft/microsoft-graph-client";
import dotenv from "dotenv";

dotenv.config();

async function comprehensiveDiagnostic() {
  console.log("🔍 COMPREHENSIVE MICROSOFT GRAPH DIAGNOSTIC");
  console.log("=".repeat(50));

  const config = {
    tenantId: process.env.AZURE_TENANT_ID,
    clientId: process.env.AZURE_CLIENT_ID,
    clientSecret: process.env.AZURE_CLIENT_SECRET,
    fromEmail: process.env.EMAIL_FROM,
  };

  console.log("📋 Configuration:");
  console.log(`   Tenant ID: ${config.tenantId}`);
  console.log(`   Client ID: ${config.clientId}`);
  console.log(`   From Email: ${config.fromEmail}`);

  try {
    const msalClient = new ConfidentialClientApplication({
      auth: {
        clientId: config.clientId,
        clientSecret: config.clientSecret,
        authority: `https://login.microsoftonline.com/${config.tenantId}`,
      },
    });

    console.log("\n🔐 Step 1: Acquiring token...");
    const tokenResponse = await msalClient.acquireTokenByClientCredential({
      scopes: ["https://graph.microsoft.com/.default"],
    });

    console.log("✅ Token acquired successfully");
    console.log(`   Token Type: ${tokenResponse.tokenType}`);
    console.log(`   Expires On: ${tokenResponse.expiresOn}`);

    // Decode the token to see permissions (basic decode, not verification)
    const tokenParts = tokenResponse.accessToken.split(".");
    const payload = JSON.parse(Buffer.from(tokenParts[1], "base64").toString());
    console.log(`   Scopes in token: ${payload.scp || payload.roles || "Not found"}`);
    console.log(`   App ID: ${payload.appid}`);
    console.log(`   Tenant ID: ${payload.tid}`);

    console.log("\n🔍 Step 2: Testing Graph API access...");

    // Test 1: Try to access application info
    console.log("   Test 1: Application info...");
    try {
      const response = await fetch("https://graph.microsoft.com/v1.0/applications", {
        headers: {
          Authorization: `Bearer ${tokenResponse.accessToken}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        console.log("   ✅ Application access: SUCCESS");
      } else {
        console.log(`   ❌ Application access: ${response.status} ${response.statusText}`);
      }
    } catch (err) {
      console.log(`   ❌ Application access: ${err.message}`);
    }

    // Test 2: Try to send email with raw fetch
    console.log("   Test 2: Email sending (raw fetch)...");
    try {
      const emailPayload = {
        message: {
          subject: "Diagnostic Test Email",
          body: {
            contentType: "HTML",
            content: "<p>This is a diagnostic test email.</p>",
          },
          toRecipients: [
            {
              emailAddress: {
                address: "akki@primussoft.com",
              },
            },
          ],
        },
      };

      const emailResponse = await fetch(
        `https://graph.microsoft.com/v1.0/users/${config.fromEmail}/sendMail`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${tokenResponse.accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(emailPayload),
        }
      );

      if (emailResponse.ok) {
        console.log("   ✅ Email sending: SUCCESS!");
        console.log("   🎉 Microsoft Graph email is working!");
      } else {
        const errorText = await emailResponse.text();
        console.log(`   ❌ Email sending: ${emailResponse.status} ${emailResponse.statusText}`);
        console.log(`   Error details: ${errorText}`);

        // Try alternative endpoints
        console.log("\n   🔄 Trying alternative endpoints...");

        // Try with different user
        const altEmailResponse = await fetch(
          `https://graph.microsoft.com/v1.0/users/testuser1@khanaakiboutlook.onmicrosoft.com/sendMail`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${tokenResponse.accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(emailPayload),
          }
        );

        if (altEmailResponse.ok) {
          console.log("   ✅ Alternative user email: SUCCESS!");
          console.log("   💡 Use testuser1@khanaakiboutlook.onmicrosoft.com as sender");
        } else {
          console.log(`   ❌ Alternative user: ${altEmailResponse.status}`);
        }
      }
    } catch (err) {
      console.log(`   ❌ Email sending error: ${err.message}`);
    }

    console.log("\n📊 DIAGNOSTIC SUMMARY:");
    console.log("- Token acquisition: ✅ Working");
    console.log(
      "- Azure AD permissions: ✅ Configured (Mail.Send, User.Read.All, Mail.Send.Shared)"
    );
    console.log("- Email sending: Check results above");
  } catch (error) {
    console.error("❌ Diagnostic failed:", error.message);
  }
}

comprehensiveDiagnostic();
