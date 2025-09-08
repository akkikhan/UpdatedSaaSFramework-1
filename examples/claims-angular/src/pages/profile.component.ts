import { Component, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { MatCardModule } from "@angular/material/card";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";
import { Router } from "@angular/router";
import { getToken, clearToken } from "@saas-framework/auth-client";
import { RbacService } from "../services/rbac.service";

@Component({
  standalone: true,
  selector: "app-profile",
  imports: [CommonModule, MatCardModule, MatButtonModule, MatIconModule],
  template: `
    <div class="profile-header">
      <h1 class="page-title">
        <mat-icon class="page-icon">person</mat-icon>
        User Profile
      </h1>
      <p class="page-subtitle">Manage your account settings and view your permissions</p>
    </div>

    <div class="profile-container">
      <div class="profile-card">
        <div class="profile-avatar">
          <div class="avatar-circle">
            <mat-icon class="avatar-icon">person</mat-icon>
          </div>
        </div>

        <div class="profile-info">
          <h2 class="user-name">{{ displayName || "Unknown User" }}</h2>
          <p class="user-email">{{ email || "No email available" }}</p>
        </div>

        <div class="profile-stats">
          <div class="stat-card">
            <div class="stat-icon">
              <mat-icon>security</mat-icon>
            </div>
            <div class="stat-content">
              <div class="stat-number">{{ permCount || 0 }}</div>
              <div class="stat-label">Permissions</div>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon">
              <mat-icon>access_time</mat-icon>
            </div>
            <div class="stat-content">
              <div class="stat-number">Active</div>
              <div class="stat-label">Session Status</div>
            </div>
          </div>
        </div>

        <div class="profile-actions">
          <button mat-raised-button color="warn" (click)="logout()" class="logout-btn">
            <mat-icon>exit_to_app</mat-icon>
            Sign Out
          </button>
        </div>
      </div>

      <div class="additional-info">
        <div class="info-section">
          <h3 class="section-title">
            <mat-icon>info</mat-icon>
            Account Information
          </h3>
          <div class="info-grid">
            <div class="info-item">
              <label>Authentication</label>
              <span>{{ authMethod || "Unknown" }}</span>
            </div>
            <div class="info-item">
              <label>Login Time</label>
              <span>{{ (loginTime | date: "MMM d, y, h:mm a") || "Not available" }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .profile-header {
        margin-bottom: 32px;
        padding: 0 8px;
      }

      .page-title {
        display: flex;
        align-items: center;
        gap: 12px;
        font-size: 28px;
        font-weight: 700;
        color: #1e293b;
        margin: 0 0 8px 0;
      }

      .page-icon {
        font-size: 32px;
        width: 32px;
        height: 32px;
        color: #6366f1;
      }

      .page-subtitle {
        color: #64748b;
        font-size: 16px;
        margin: 0;
        font-weight: 400;
      }

      .profile-container {
        display: grid;
        gap: 24px;
        max-width: 800px;
      }

      .profile-card {
        background: white;
        border-radius: 16px;
        box-shadow:
          0 1px 3px 0 rgb(0 0 0 / 0.1),
          0 1px 2px -1px rgb(0 0 0 / 0.1);
        padding: 32px;
        text-align: center;
      }

      .profile-avatar {
        margin-bottom: 24px;
      }

      .avatar-circle {
        width: 96px;
        height: 96px;
        border-radius: 50%;
        background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0 auto;
        box-shadow: 0 8px 32px rgb(99 102 241 / 0.3);
      }

      .avatar-icon {
        font-size: 48px;
        width: 48px;
        height: 48px;
        color: white;
      }

      .profile-info {
        margin-bottom: 32px;
      }

      .user-name {
        font-size: 24px;
        font-weight: 700;
        color: #1e293b;
        margin: 0 0 8px 0;
      }

      .user-email {
        font-size: 16px;
        color: #64748b;
        margin: 0;
      }

      .profile-stats {
        display: flex;
        gap: 16px;
        justify-content: center;
        margin-bottom: 32px;
        flex-wrap: wrap;
      }

      .stat-card {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 16px 20px;
        background: #f8fafc;
        border-radius: 12px;
        border: 1px solid #e2e8f0;
        min-width: 140px;
      }

      .stat-icon {
        width: 40px;
        height: 40px;
        border-radius: 10px;
        background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
      }

      .stat-content {
        flex: 1;
      }

      .stat-number {
        font-size: 18px;
        font-weight: 700;
        color: #1e293b;
        line-height: 1.2;
      }

      .stat-label {
        font-size: 12px;
        color: #64748b;
        font-weight: 500;
      }

      .profile-actions {
        display: flex;
        justify-content: center;
        gap: 12px;
      }

      .logout-btn {
        border-radius: 8px;
        font-weight: 600;
        padding: 12px 24px;
      }

      .additional-info {
        background: white;
        border-radius: 16px;
        box-shadow:
          0 1px 3px 0 rgb(0 0 0 / 0.1),
          0 1px 2px -1px rgb(0 0 0 / 0.1);
        padding: 24px;
      }

      .section-title {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 18px;
        font-weight: 600;
        color: #1e293b;
        margin: 0 0 16px 0;
      }

      .info-grid {
        display: grid;
        gap: 16px;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      }

      .info-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 0;
        border-bottom: 1px solid #f1f5f9;
      }

      .info-item:last-child {
        border-bottom: none;
      }

      .info-item label {
        font-weight: 500;
        color: #374151;
      }

      .info-item span {
        color: #6b7280;
      }

      @media (max-width: 640px) {
        .profile-stats {
          flex-direction: column;
        }

        .stat-card {
          justify-content: flex-start;
        }

        .info-item {
          flex-direction: column;
          align-items: flex-start;
          gap: 4px;
        }
      }
    `,
  ],
})
export class ProfileComponent implements OnInit {
  email = "";
  displayName = "";
  permCount = 0;
  authMethod = "Azure AD";
  loginTime = new Date();

  constructor(
    private router: Router,
    private rbac: RbacService
  ) {}

  async ngOnInit() {
    const token = getToken();
    if (token) {
      try {
        const p = JSON.parse(atob(token.split(".")[1] || ""));
        this.email = p.email || p.upn || p.preferred_username || "";
        this.displayName = p.name || p.displayName || this.email.split("@")[0] || "User";
      } catch {}
    }
    const prof = await this.rbac.profile();
    this.permCount = (prof?.permissions || []).length;
  }

  logout() {
    clearToken();
    this.router.navigateByUrl("/login");
  }
}
