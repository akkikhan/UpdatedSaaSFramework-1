#!/usr/bin/env node

// Test Microsoft Graph email functionality
import fs from 'fs';
import { Client } from '@microsoft/microsoft-graph-client';
import { ClientSecretCredential } from '@azure/msal-node';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const config = {
    tenantId: process.env.AZURE_TENANT_ID,
    clientId: process.env.AZURE_CLIENT_ID,
    clientSecret: process.env.AZURE_CLIENT_SECRET,
    fromEmail: process.env.EMAIL_FROM || 'dev-saas@primussoft.com'
};usr/bin/env node

import { EmailService } from "./server/services/email.js";

async function testGraphEmail() {
  console.log("🧪 Testing Microsoft Graph email sending...");

  try {
    const emailService = new EmailService();

    await emailService.sendEmail({
      to: "dev-saas@primussoft.com",
      subject: "Microsoft Graph Test Email - " + new Date().toLocaleString(),
      html: `
                <h2>✅ Success!</h2>
                <p>Microsoft Graph email service is working correctly.</p>
                <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
                <p><strong>From:</strong> dev-saas@primussoft.com</p>
                <p><strong>Method:</strong> Microsoft Graph API</p>
                <hr>
                <p><em>This email was sent using the Microsoft Graph SendMail API with proper Azure AD application permissions.</em></p>
            `,
    });

    console.log("✅ Email sent successfully via Microsoft Graph!");
    console.log("🎯 Migration from SMTP to Microsoft Graph completed successfully!");
  } catch (error) {
    console.error("❌ Email sending failed:", error.message);
    if (error.code) console.error("Error code:", error.code);
    if (error.statusCode) console.error("HTTP Status:", error.statusCode);
    process.exit(1);
  }
}

testGraphEmail();
