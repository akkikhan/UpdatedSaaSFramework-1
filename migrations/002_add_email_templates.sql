CREATE TABLE email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  template_type VARCHAR(50) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  html_content TEXT NOT NULL,
  text_content TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, template_type)
);

-- Default onboarding template with placeholders
INSERT INTO email_templates (tenant_id, template_type, subject, html_content)
VALUES (
  NULL,
  'onboarding',
  'Welcome to SaaS Framework - Your Tenant "{{TENANT_NAME}}" is Ready',
  $$<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to SaaS Framework</title>
    <style>
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #334155;
            margin: 0;
            padding: 20px;
            background-color: #f8fafc;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }
        .header {
            background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
            padding: 40px 30px;
            text-align: center;
            color: white;
        }
        .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 700;
        }
        .content {
            padding: 40px 30px;
        }
        .welcome-text {
            font-size: 18px;
            margin-bottom: 30px;
            color: #1e293b;
        }
        .info-card {
            background: #f1f5f9;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
            border-left: 4px solid #3b82f6;
        }
        .info-card h3 {
            margin: 0 0 10px 0;
            color: #1e293b;
            font-size: 16px;
            font-weight: 600;
        }
        .info-card p {
            margin: 5px 0;
            font-family: 'Monaco', 'Menlo', monospace;
            font-size: 14px;
            color: #475569;
        }
        .button {
            display: inline-block;
            background: #3b82f6;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            margin: 20px 0;
        }
        .steps {
            background: #fefce8;
            border: 1px solid #fbbf24;
            border-radius: 8px;
            padding: 20px;
            margin: 30px 0;
        }
        .steps h3 {
            color: #92400e;
            margin: 0 0 15px 0;
        }
        .steps ol {
            margin: 0;
            padding-left: 20px;
        }
        .steps li {
            margin: 8px 0;
            color: #451a03;
        }
        .code-block {
            background: #1e293b;
            color: #e2e8f0;
            padding: 15px;
            border-radius: 6px;
            font-family: 'Monaco', 'Menlo', monospace;
            font-size: 14px;
            margin: 15px 0;
            overflow-x: auto;
        }
        .footer {
            background: #f8fafc;
            padding: 30px;
            text-align: center;
            color: #64748b;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 Welcome to SaaS Framework</h1>
            <p>Your tenant "{{TENANT_NAME}}" is ready!</p>
        </div>

        <div class="content">
            <p class="welcome-text">
                Congratulations! Your multi-tenant SaaS platform has been successfully created and configured.
            </p>

            <div class="info-card">
                <h3>🔗 Tenant Portal Access</h3>
                <p><strong>Portal URL:</strong> {{PORTAL_URL}}</p>
                <p><strong>Admin Email:</strong> {{ADMIN_EMAIL}}</p>
                <p><strong>Temporary Password:</strong> {{TEMP_PASSWORD}}</p>
            </div>

            <a href="{{PORTAL_URL}}" class="button">Access Your Tenant Portal</a>

      <div class="info-card">
        <h3>🔐 API Keys for Integration</h3>
        <p><strong>Tenant ID:</strong> {{TENANT_ORG_ID}}</p>
        <p><strong>Auth API Key:</strong> {{AUTH_API_KEY}}</p>
        <p><strong>RBAC API Key:</strong> {{RBAC_API_KEY}}</p>
      </div>

            <div class="steps">
                <h3>🚀 Next Steps</h3>
                <ol>
                    <li>Login to your tenant portal using the credentials above</li>
                    <li>Change your temporary password immediately</li>
                    <li>Set up users and roles for your team</li>
                    <li>Integrate our SDKs in your application</li>
                    <li>Start building your multi-tenant application!</li>
                </ol>
            </div>

            <h3>📦 SDK Integration</h3>
            <p>Install our authentication and RBAC SDKs:</p>

            <div class="code-block">
npm install @saas-framework/auth @saas-framework/rbac
            </div>

            <p>Example integration:</p>
            <div class="code-block">
import { SaaSAuth } from '@saas-framework/auth';
import { SaaSRBAC } from '@saas-framework/rbac';

const auth = new SaaSAuth({
  apiKey: '{{AUTH_API_KEY}}',
  baseUrl: '{{BASE_URL}}/api/v2/auth'
});

const rbac = new SaaSRBAC({
  apiKey: '{{RBAC_API_KEY}}',
  baseUrl: '{{BASE_URL}}/api/v2/rbac'
});
            </div>
        </div>

        <div class="footer">
            <p>
                Need help? Visit our <a href="{{DOCS_URL}}" style="color: #3b82f6;">documentation</a>
                or contact support at dev-saas@primussoft.com
            </p>
            <p>© 2025 SaaS Framework Platform. All rights reserved.</p>
        </div>
    </div>
</body>
</html>$$
);

-- Default module status template with placeholders
INSERT INTO email_templates (tenant_id, template_type, subject, html_content)
VALUES (
  NULL,
  'module_status',
  'Module Access Updated - {{TENANT_NAME}}',
  $$<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Module Access Updated</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #f8fafc; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: white; padding: 30px; border: 1px solid #e2e8f0; }
    .footer { background: #f8fafc; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; font-size: 14px; color: #64748b; }
    .module-list { background: #f1f5f9; padding: 15px; border-radius: 6px; margin: 15px 0; }
    .enabled { color: #059669; font-weight: 600; }
    .disabled { color: #dc2626; font-weight: 600; }
    .warning { background: #fef3c7; border: 1px solid #fbbf24; padding: 15px; border-radius: 6px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0; color: #1e293b;">Module Access Updated</h1>
      <p style="margin: 10px 0 0 0; color: #64748b;">Changes to your tenant access</p>
    </div>

    <div class="content">
      <p>Hello,</p>

      <p>Your tenant <strong>{{TENANT_NAME}}</strong> module access has been updated by an administrator.</p>

      {{ENABLED_MODULES}}
      {{DISABLED_MODULES}}
      {{WARNING_BLOCK}}

      <p>If you have questions about these changes, please contact your administrator.</p>

      <p>Best regards,<br>The SaaS Framework Team</p>
    </div>

    <div class="footer">
      <p>This is an automated notification from the SaaS Framework Platform.</p>
    </div>
  </div>
</body>
</html>$$
);
