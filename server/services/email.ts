import nodemailer from 'nodemailer';
import { storage } from '../storage';

interface EmailConfig {
  smtpHost: string;
  smtpPort: number;
  smtpUsername: string;
  smtpPassword: string;
  fromEmail: string;
  fromName: string;
}

export class EmailService {
  private transporter: nodemailer.Transporter;
  private config: EmailConfig;

  constructor() {
    this.config = {
      smtpHost: 'smtp.office365.com',
      smtpPort: 587,
      smtpUsername: 'dev-saas@primussoft.com',
      smtpPassword: 'First@098',
      fromEmail: 'dev-saas@primussoft.com',
      fromName: 'SaaS Framework Platform'
    };

    this.transporter = nodemailer.createTransport({
      host: this.config.smtpHost,
      port: this.config.smtpPort,
      secure: false,
      auth: {
        user: this.config.smtpUsername,
        pass: this.config.smtpPassword,
      },
      tls: {
        ciphers: 'SSLv3'
      }
    });
  }

  async sendTenantOnboardingEmail(tenant: {
    id: string;
    name: string;
    orgId: string;
    adminEmail: string;
    authApiKey: string;
    rbacApiKey: string;
  }): Promise<boolean> {
    const subject = `Welcome to SaaS Framework - Your Tenant "${tenant.name}" is Ready`;
    
    const html = this.generateOnboardingEmailTemplate(tenant);
    
    try {
      await this.transporter.sendMail({
        from: `"${this.config.fromName}" <${this.config.fromEmail}>`,
        to: tenant.adminEmail,
        subject,
        html
      });
      
      // Log successful email
      await storage.logEmail({
        tenantId: tenant.id,
        recipientEmail: tenant.adminEmail,
        subject,
        templateType: 'onboarding',
        status: 'sent',
        errorMessage: null
      });
      
      return true;
    } catch (error) {
      console.error('Failed to send onboarding email:', error);
      
      // Log failed email
      await storage.logEmail({
        tenantId: tenant.id,
        recipientEmail: tenant.adminEmail,
        subject,
        templateType: 'onboarding',
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      });
      
      return false;
    }
  }

  private generateOnboardingEmailTemplate(tenant: {
    name: string;
    orgId: string;
    adminEmail: string;
    authApiKey: string;
    rbacApiKey: string;
  }): string {
    const baseUrl = process.env.BASE_URL || 'https://localhost:5000';
    const portalUrl = `${baseUrl}/tenant/${tenant.orgId}/login`;
    const docsUrl = `${baseUrl}/docs`;
    
    return `
<!DOCTYPE html>
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
            <p>Your tenant "${tenant.name}" is ready!</p>
        </div>
        
        <div class="content">
            <p class="welcome-text">
                Congratulations! Your multi-tenant SaaS platform has been successfully created and configured.
            </p>
            
            <div class="info-card">
                <h3>🔗 Tenant Portal Access</h3>
                <p><strong>Portal URL:</strong> ${portalUrl}</p>
                <p><strong>Admin Email:</strong> ${tenant.adminEmail}</p>
                <p><strong>Temporary Password:</strong> temp123!</p>
            </div>
            
            <a href="${portalUrl}" class="button">Access Your Tenant Portal</a>
            
            <div class="info-card">
                <h3>🔐 API Keys for Integration</h3>
                <p><strong>Auth API Key:</strong> ${tenant.authApiKey}</p>
                <p><strong>RBAC API Key:</strong> ${tenant.rbacApiKey}</p>
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
  apiKey: '${tenant.authApiKey}',
  baseUrl: '${baseUrl}/api/v2/auth'
});

const rbac = new SaaSRBAC({
  apiKey: '${tenant.rbacApiKey}',
  baseUrl: '${baseUrl}/api/v2/rbac'
});
            </div>
        </div>
        
        <div class="footer">
            <p>
                Need help? Visit our <a href="${docsUrl}" style="color: #3b82f6;">documentation</a> 
                or contact support at dev-saas@primussoft.com
            </p>
            <p>© 2025 SaaS Framework Platform. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
    `;
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      return true;
    } catch (error) {
      console.error('SMTP connection test failed:', error);
      return false;
    }
  }
}

export const emailService = new EmailService();
