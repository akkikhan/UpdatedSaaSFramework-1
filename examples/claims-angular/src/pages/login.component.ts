import { Component } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { MatCardModule } from "@angular/material/card";
import { MatButtonModule } from "@angular/material/button";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatIconModule } from "@angular/material/icon";
import { Router } from "@angular/router";
import {
  handleSuccessFromUrl,
  startAzure,
  loginWithPassword,
  getToken,
} from "@saas-framework/auth-client";
import { BASE } from "../services/api-base";

@Component({
  standalone: true,
  selector: "app-login",
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
  ],
  template: `
    <div class="login-container">
      <div class="login-left">
        <div class="brand-section">
          <div class="brand-icon">
            <mat-icon class="bank-icon">account_balance</mat-icon>
          </div>
          <h1 class="brand-title">Claims Portal</h1>
          <p class="brand-subtitle">Enterprise Claims Management System</p>

          <div class="feature-list">
            <div class="feature-item">
              <mat-icon class="feature-icon">security</mat-icon>
              <div class="feature-content">
                <h3>Azure AD Authentication</h3>
                <p>Secure single sign-on with Microsoft Azure Active Directory</p>
              </div>
            </div>

            <div class="feature-item">
              <mat-icon class="feature-icon">verified_user</mat-icon>
              <div class="feature-content">
                <h3>Role-Based Access Control</h3>
                <p>Granular permissions and role management for secure operations</p>
              </div>
            </div>

            <div class="feature-item">
              <mat-icon class="feature-icon">analytics</mat-icon>
              <div class="feature-content">
                <h3>Advanced Logging & Analytics</h3>
                <p>Comprehensive audit trails and real-time monitoring</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="login-right">
        <div class="login-form-container">
          <div class="login-header">
            <h2 class="login-title">Welcome back</h2>
            <p class="login-subtitle">Please sign in to your account to continue</p>
          </div>

          <div class="login-form">
            <div class="organization-section">
              <div class="section-header">
                <mat-icon>business</mat-icon>
                <h3>Organization</h3>
              </div>

              <mat-form-field appearance="outline" class="org-field">
                <mat-label>Organization ID</mat-label>
                <input
                  matInput
                  [(ngModel)]="orgId"
                  placeholder="Enter organization ID (e.g., acme)"
                />
                <mat-icon matSuffix>domain</mat-icon>
              </mat-form-field>
            </div>

            <div class="sso-section">
              <div class="section-header">
                <mat-icon>cloud</mat-icon>
                <h3>Single Sign-On</h3>
              </div>

              <button
                mat-raised-button
                color="primary"
                (click)="signinMicrosoft()"
                class="microsoft-btn"
                [disabled]="!orgId"
              >
                <div class="button-content">
                  <mat-icon>login</mat-icon>
                  <span>Continue with Microsoft</span>
                </div>
              </button>

              <p class="sso-note">Recommended for enhanced security</p>
            </div>

            <div class="divider">
              <span class="divider-text">or</span>
            </div>

            <div class="email-section">
              <div class="section-header">
                <mat-icon>email</mat-icon>
                <h3>Email Authentication</h3>
              </div>

              <div class="email-fields">
                <mat-form-field appearance="outline" class="email-field">
                  <mat-label>Email Address</mat-label>
                  <input matInput [(ngModel)]="email" type="email" placeholder="Enter your email" />
                  <mat-icon matSuffix>alternate_email</mat-icon>
                </mat-form-field>

                <mat-form-field appearance="outline" class="password-field">
                  <mat-label>Password</mat-label>
                  <input
                    matInput
                    [(ngModel)]="password"
                    type="password"
                    placeholder="Enter your password"
                  />
                  <mat-icon matSuffix>lock</mat-icon>
                </mat-form-field>
              </div>

              <button
                mat-stroked-button
                (click)="signinLocal()"
                class="email-btn"
                [disabled]="!orgId || !email || !password"
              >
                <div class="button-content">
                  <mat-icon>login</mat-icon>
                  <span>Sign in with Email</span>
                </div>
              </button>
            </div>

            <div class="security-note">
              <mat-icon class="info-icon">info</mat-icon>
              <p>Your session token will be stored securely in your browser's local storage.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .login-container {
        min-height: 100vh;
        display: flex;
        background: #f8fafc;
      }

      .login-left {
        flex: 1;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        padding: 48px;
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
        overflow: hidden;
      }

      .login-left::before {
        content: "";
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: url('data:image/svg+xml,<svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"><circle cx="20" cy="20" r="1" fill="white" opacity="0.1"/></svg>');
      }

      .brand-section {
        position: relative;
        z-index: 1;
        text-align: center;
        max-width: 480px;
      }

      .brand-icon {
        margin-bottom: 24px;
      }

      .bank-icon {
        font-size: 64px;
        width: 64px;
        height: 64px;
        color: white;
        filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2));
      }

      .brand-title {
        font-size: 36px;
        font-weight: 700;
        color: white;
        margin: 0 0 12px 0;
        letter-spacing: -0.5px;
      }

      .brand-subtitle {
        font-size: 18px;
        color: rgba(255, 255, 255, 0.9);
        margin: 0 0 48px 0;
        font-weight: 300;
      }

      .feature-list {
        display: flex;
        flex-direction: column;
        gap: 24px;
        text-align: left;
      }

      .feature-item {
        display: flex;
        gap: 16px;
        align-items: flex-start;
      }

      .feature-icon {
        font-size: 24px;
        width: 24px;
        height: 24px;
        color: white;
        margin-top: 4px;
      }

      .feature-content h3 {
        font-size: 16px;
        font-weight: 600;
        color: white;
        margin: 0 0 4px 0;
      }

      .feature-content p {
        font-size: 14px;
        color: rgba(255, 255, 255, 0.8);
        margin: 0;
        line-height: 1.5;
      }

      .login-right {
        flex: 1;
        padding: 48px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: white;
      }

      .login-form-container {
        width: 100%;
        max-width: 480px;
      }

      .login-header {
        text-align: center;
        margin-bottom: 40px;
      }

      .login-title {
        font-size: 28px;
        font-weight: 700;
        color: #1e293b;
        margin: 0 0 8px 0;
      }

      .login-subtitle {
        font-size: 16px;
        color: #64748b;
        margin: 0;
      }

      .login-form {
        display: flex;
        flex-direction: column;
        gap: 32px;
      }

      .section-header {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 16px;
      }

      .section-header mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
        color: #6366f1;
      }

      .section-header h3 {
        font-size: 16px;
        font-weight: 600;
        color: #374151;
        margin: 0;
      }

      .org-field {
        width: 100%;
      }

      .microsoft-btn {
        width: 100%;
        height: 48px;
        border-radius: 8px;
        font-weight: 600;
        font-size: 16px;
        background: linear-gradient(135deg, #0078d4 0%, #106ebe 100%);
        margin-bottom: 8px;
      }

      .microsoft-btn:not([disabled]):hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(16, 110, 190, 0.3);
      }

      .button-content {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .sso-note {
        font-size: 12px;
        color: #6b7280;
        margin: 0;
        text-align: center;
      }

      .divider {
        position: relative;
        text-align: center;
        margin: 8px 0;
      }

      .divider::before {
        content: "";
        position: absolute;
        top: 50%;
        left: 0;
        right: 0;
        height: 1px;
        background: #e5e7eb;
      }

      .divider-text {
        background: white;
        padding: 0 16px;
        color: #9ca3af;
        font-size: 14px;
        position: relative;
      }

      .email-fields {
        display: flex;
        flex-direction: column;
        gap: 16px;
        margin-bottom: 16px;
      }

      .email-field,
      .password-field {
        width: 100%;
      }

      .email-btn {
        width: 100%;
        height: 48px;
        border-radius: 8px;
        font-weight: 600;
        font-size: 16px;
        border: 2px solid #6366f1;
        color: #6366f1;
      }

      .email-btn:not([disabled]):hover {
        background: #6366f1;
        color: white;
        transform: translateY(-1px);
      }

      .security-note {
        display: flex;
        align-items: flex-start;
        gap: 8px;
        padding: 12px 16px;
        background: #f0f9ff;
        border-radius: 8px;
        border-left: 4px solid #0ea5e9;
      }

      .info-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
        color: #0ea5e9;
        margin-top: 2px;
      }

      .security-note p {
        font-size: 12px;
        color: #0c4a6e;
        margin: 0;
        line-height: 1.4;
      }

      ::ng-deep .mat-mdc-form-field-outline {
        border-radius: 8px;
      }

      ::ng-deep .mat-mdc-button:disabled {
        opacity: 0.5;
      }

      @media (max-width: 768px) {
        .login-container {
          flex-direction: column;
          min-height: auto;
        }

        .login-left {
          padding: 24px;
          min-height: 40vh;
        }

        .brand-title {
          font-size: 28px;
        }

        .feature-list {
          gap: 16px;
        }

        .login-right {
          padding: 24px;
        }
      }
    `,
  ],
})
export class LoginComponent {
  orgId = localStorage.getItem("claims_orgId") || "";
  email = "";
  password = "";
  constructor(private router: Router) {
    try {
      handleSuccessFromUrl();
    } catch {}
    if (getToken()) this.router.navigateByUrl("/dashboard");
  }
  async signinMicrosoft() {
    if (!this.orgId) return;
    localStorage.setItem("claims_orgId", this.orgId);
    await startAzure(this.orgId, {
      baseUrl: BASE,
      // Send the browser back to this Angular app after Azure callback
      redirectBase: window.location.origin,
      redirectTo: "/dashboard",
    } as any);
  }
  async signinLocal() {
    if (!this.orgId) return;
    localStorage.setItem("claims_orgId", this.orgId);
    await loginWithPassword({
      orgId: this.orgId,
      email: this.email,
      password: this.password,
      baseUrl: BASE,
    });
    this.router.navigateByUrl("/dashboard");
  }
}
