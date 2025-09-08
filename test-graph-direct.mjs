#!// Test Microsoft Graph directly without authentication layers
import { Client } from '@microsoft/microsoft-graph-client';
import { ConfidentialClientApplication } from '@azure/msal-node';
import dotenv from 'dotenv';/bin/env node

// Test Microsoft Graph directly without authentication layers
import { Client } from "@microsoft/microsoft-graph-client";
import { ClientSecretCredential } from "@azure/msal-node";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const config = {
  tenantId: process.env.AZURE_TENANT_ID,
  clientId: process.env.AZURE_CLIENT_ID,
  clientSecret: process.env.AZURE_CLIENT_SECRET,
  fromEmail: process.env.EMAIL_FROM || "dev-saas@primussoft.com",
};

async function testGraphEmailDirect() {
  console.log("🧪 Testing Microsoft Graph email sending directly...");
  console.log(`📋 From: ${config.fromEmail}`);
  console.log(`📋 Client ID: ${config.clientId}`);

  try {
    // Create credential and get fresh token
    const credential = new ClientSecretCredential(
      config.tenantId,
      config.clientId,
      config.clientSecret
    );

    console.log("🔐 Getting fresh access token...");
    const tokenResponse = await credential.getToken(["https://graph.microsoft.com/.default"]);
    console.log("✅ Token acquired successfully");

    // Create Graph client with fresh token
    const graphClient = Client.init({
      authProvider: {
        getAccessToken: async () => tokenResponse.token,
      },
    });

    const message = {
      subject: `Microsoft Graph Test - ${new Date().toLocaleString()}`,
      body: {
        contentType: "HTML",
        content: `
                    <h2>✅ Success!</h2>
                    <p>Microsoft Graph email service is working correctly!</p>
                    <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
                    <p><strong>From:</strong> ${config.fromEmail}</p>
                    <p><strong>Method:</strong> Microsoft Graph API (Direct Test)</p>
                    <hr>
                    <p><em>This email was sent using the Microsoft Graph SendMail API with fresh token acquisition.</em></p>
                `,
      },
      toRecipients: [
        {
          emailAddress: {
            address: "akki@primussoft.com",
          },
        },
      ],
    };

    console.log("📧 Sending email...");

    // Send email using user-specific endpoint
    await graphClient.api(`/users/${config.fromEmail}/sendMail`).post({
      message: message,
    });

    console.log("✅ Email sent successfully via Microsoft Graph!");
    console.log("🎯 Migration from SMTP to Microsoft Graph is working!");

    process.exit(0);
  } catch (error) {
    console.error("❌ Email sending failed:", error.message);
    console.error("❌ Error details:", {
      code: error.code,
      statusCode: error.statusCode,
      name: error.name,
    });

    if (error.statusCode === 401) {
      console.error("🔍 This is an authentication error. Possible causes:");
      console.error("   - Mail.Send permission not properly configured");
      console.error("   - Admin consent not granted");
      console.error("   - Permission propagation delay");
    }

    process.exit(1);
  }
}

testGraphEmailDirect();
