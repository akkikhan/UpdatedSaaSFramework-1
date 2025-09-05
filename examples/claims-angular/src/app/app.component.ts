import { Component } from "@angular/core";
import { RouterOutlet, RouterLink } from "@angular/router";
import { CommonModule } from "@angular/common";
import { MatSidenavModule } from "@angular/material/sidenav";
import { MatToolbarModule } from "@angular/material/toolbar";
import { MatListModule } from "@angular/material/list";
import { MatIconModule } from "@angular/material/icon";
import { MatButtonModule } from "@angular/material/button";
import { MatBadgeModule } from "@angular/material/badge";
import { MatMenuModule } from "@angular/material/menu";

@Component({
  selector: "app-root",
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    MatSidenavModule,
    MatToolbarModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    MatBadgeModule,
    MatMenuModule,
  ],
  template: `
    <div class="app-container">
      <!-- Modern Sidebar -->
      <aside class="sidebar">
        <div class="sidebar-header">
          <div class="brand-section">
            <div class="brand-icon">
              <mat-icon>account_balance</mat-icon>
            </div>
            <div class="brand-info">
              <h2 class="brand-title">Claims Portal</h2>
              <p class="brand-subtitle">Enterprise Management</p>
            </div>
          </div>
        </div>

        <nav class="sidebar-nav">
          <div class="nav-section">
            <span class="nav-section-title">Main</span>
            <a class="nav-item" routerLink="/dashboard" routerLinkActive="active">
              <div class="nav-item-icon">
                <mat-icon>dashboard</mat-icon>
              </div>
              <span class="nav-item-text">Dashboard</span>
              <div class="nav-item-indicator"></div>
            </a>

            <a class="nav-item" routerLink="/claims" routerLinkActive="active">
              <div class="nav-item-icon">
                <mat-icon>assignment</mat-icon>
              </div>
              <span class="nav-item-text">Claims</span>
              <div class="nav-item-badge">
                <span class="badge-count">12</span>
              </div>
              <div class="nav-item-indicator"></div>
            </a>

            <a class="nav-item" routerLink="/logs" routerLinkActive="active">
              <div class="nav-item-icon">
                <mat-icon>list_alt</mat-icon>
              </div>
              <span class="nav-item-text">Activity Logs</span>
              <div class="nav-item-indicator"></div>
            </a>
          </div>

          <div class="nav-section">
            <span class="nav-section-title">Account</span>
            <a class="nav-item" routerLink="/profile" routerLinkActive="active">
              <div class="nav-item-icon">
                <mat-icon>person</mat-icon>
              </div>
              <span class="nav-item-text">Profile</span>
              <div class="nav-item-indicator"></div>
            </a>
          </div>
        </nav>

        <div class="sidebar-footer">
          <div class="user-profile-mini">
            <div class="user-avatar">
              <mat-icon>account_circle</mat-icon>
            </div>
            <div class="user-info">
              <span class="user-name">John Doe</span>
              <span class="user-role">Administrator</span>
            </div>
          </div>
        </div>
      </aside>

      <!-- Main Content Area -->
      <main class="main-content">
        <!-- Modern Header -->
        <header class="app-header">
          <div class="header-left">
            <div class="breadcrumb">
              <span class="breadcrumb-item">Azure AD</span>
              <mat-icon class="breadcrumb-separator">chevron_right</mat-icon>
              <span class="breadcrumb-item">RBAC</span>
              <mat-icon class="breadcrumb-separator">chevron_right</mat-icon>
              <span class="breadcrumb-item active">Logging</span>
            </div>
          </div>

          <div class="header-right">
            <button class="header-action-btn" mat-icon-button>
              <mat-icon matBadge="3" matBadgeColor="warn" matBadgeSize="small"
                >notifications</mat-icon
              >
            </button>

            <button class="header-action-btn" mat-icon-button>
              <mat-icon>search</mat-icon>
            </button>

            <button class="user-menu-btn" mat-button [matMenuTriggerFor]="userMenu">
              <div class="user-menu-avatar">
                <mat-icon>account_circle</mat-icon>
              </div>
              <span class="user-menu-text">Account</span>
              <mat-icon class="user-menu-arrow">expand_more</mat-icon>
            </button>

            <mat-menu #userMenu="matMenu" class="user-dropdown">
              <a mat-menu-item routerLink="/profile">
                <mat-icon>person</mat-icon>
                <span>Profile Settings</span>
              </a>
              <a mat-menu-item routerLink="/login">
                <mat-icon>logout</mat-icon>
                <span>Sign Out</span>
              </a>
            </mat-menu>
          </div>
        </header>

        <!-- Content Area -->
        <div class="content-wrapper">
          <div class="content-container">
            <router-outlet></router-outlet>
          </div>
        </div>
      </main>
    </div>
  `,
  styles: [
    `
      .app-container {
        display: flex;
        height: 100vh;
        background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
      }

      /* Modern Sidebar Styles */
      .sidebar {
        width: 280px;
        background: linear-gradient(
          180deg,
          rgba(255, 255, 255, 0.95) 0%,
          rgba(255, 255, 255, 0.9) 100%
        );
        -webkit-backdrop-filter: blur(20px);
        backdrop-filter: blur(20px);
        border-right: 1px solid rgba(255, 255, 255, 0.2);
        display: flex;
        flex-direction: column;
        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
      }

      .sidebar-header {
        padding: 2rem 1.5rem 1rem;
        border-bottom: 1px solid rgba(0, 0, 0, 0.05);
      }

      .brand-section {
        display: flex;
        align-items: center;
        gap: 1rem;
      }

      .brand-icon {
        width: 48px;
        height: 48px;
        background: var(--gradient-primary);
        border-radius: var(--radius-lg);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        box-shadow: var(--shadow-md);
      }

      .brand-icon mat-icon {
        font-size: 24px;
        width: 24px;
        height: 24px;
      }

      .brand-info {
        flex: 1;
      }

      .brand-title {
        font-size: 1.25rem;
        font-weight: 600;
        margin: 0 0 0.25rem 0;
        color: var(--color-gray-800);
      }

      .brand-subtitle {
        font-size: 0.75rem;
        color: var(--color-gray-500);
        margin: 0;
        font-weight: 500;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }

      /* Navigation Styles */
      .sidebar-nav {
        flex: 1;
        padding: 1rem 0;
        overflow-y: auto;
      }

      .nav-section {
        margin-bottom: 2rem;
      }

      .nav-section-title {
        font-size: 0.75rem;
        font-weight: 600;
        color: var(--color-gray-400);
        text-transform: uppercase;
        letter-spacing: 0.1em;
        padding: 0 1.5rem 0.75rem;
        display: block;
      }

      .nav-item {
        display: flex;
        align-items: center;
        padding: 0.75rem 1.5rem;
        margin: 0 0.75rem;
        border-radius: var(--radius-lg);
        color: var(--color-gray-600);
        text-decoration: none;
        transition: all 0.2s ease;
        position: relative;
        gap: 0.75rem;
      }

      .nav-item:hover {
        background: rgba(59, 130, 246, 0.08);
        color: var(--color-gray-800);
        transform: translateX(4px);
      }

      .nav-item.active {
        background: linear-gradient(
          135deg,
          rgba(59, 130, 246, 0.15) 0%,
          rgba(147, 197, 253, 0.15) 100%
        );
        color: #1d4ed8;
        font-weight: 500;
      }

      .nav-item.active .nav-item-indicator {
        opacity: 1;
        transform: translateX(0);
      }

      .nav-item-icon {
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .nav-item-icon mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
      }

      .nav-item-text {
        flex: 1;
        font-size: 0.875rem;
      }

      .nav-item-badge {
        margin-left: auto;
      }

      .badge-count {
        background: var(--gradient-primary);
        color: white;
        font-size: 0.75rem;
        font-weight: 600;
        padding: 0.25rem 0.5rem;
        border-radius: 9999px;
        min-width: 1.25rem;
        text-align: center;
        box-shadow: var(--shadow-sm);
      }

      .nav-item-indicator {
        position: absolute;
        right: 0;
        top: 50%;
        transform: translateY(-50%) translateX(10px);
        width: 3px;
        height: 20px;
        background: var(--gradient-primary);
        border-radius: 2px;
        opacity: 0;
        transition: all 0.2s ease;
      }

      /* Sidebar Footer */
      .sidebar-footer {
        padding: 1rem 1.5rem;
        border-top: 1px solid rgba(0, 0, 0, 0.05);
      }

      .user-profile-mini {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0.5rem;
        border-radius: var(--radius-md);
      }

      .user-avatar {
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--color-gray-500);
      }

      .user-avatar mat-icon {
        font-size: 32px;
        width: 32px;
        height: 32px;
      }

      .user-info {
        display: flex;
        flex-direction: column;
      }

      .user-name {
        font-size: 0.875rem;
        font-weight: 500;
        color: var(--color-gray-700);
      }

      .user-role {
        font-size: 0.75rem;
        color: var(--color-gray-500);
      }

      /* Main Content Styles */
      .main-content {
        flex: 1;
        display: flex;
        flex-direction: column;
        min-width: 0;
      }

      /* Modern Header */
      .app-header {
        background: rgba(255, 255, 255, 0.95);
        -webkit-backdrop-filter: blur(20px);
        backdrop-filter: blur(20px);
        border-bottom: 1px solid rgba(255, 255, 255, 0.2);
        padding: 1rem 2rem;
        display: flex;
        align-items: center;
        justify-content: space-between;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
        position: sticky;
        top: 0;
        z-index: 10;
      }

      .header-left {
        display: flex;
        align-items: center;
      }

      .breadcrumb {
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }

      .breadcrumb-item {
        font-size: 0.875rem;
        color: var(--color-gray-600);
        font-weight: 500;
      }

      .breadcrumb-item.active {
        color: var(--color-gray-900);
        font-weight: 600;
      }

      .breadcrumb-separator {
        font-size: 16px;
        color: var(--color-gray-400);
      }

      .header-right {
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }

      .header-action-btn {
        width: 40px;
        height: 40px;
        border-radius: var(--radius-md);
        color: var(--color-gray-600);
        transition: all 0.2s ease;
      }

      .header-action-btn:hover {
        background: rgba(59, 130, 246, 0.08);
        color: #1d4ed8;
      }

      .user-menu-btn {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.5rem 1rem;
        border-radius: var(--radius-md);
        color: var(--color-gray-700);
        font-weight: 500;
        transition: all 0.2s ease;
      }

      .user-menu-btn:hover {
        background: rgba(59, 130, 246, 0.08);
      }

      .user-menu-avatar {
        color: var(--color-gray-600);
      }

      .user-menu-text {
        font-size: 0.875rem;
      }

      .user-menu-arrow {
        font-size: 18px;
        color: var(--color-gray-500);
      }

      /* Content Area */
      .content-wrapper {
        flex: 1;
        overflow-y: auto;
        padding: 2rem;
      }

      .content-container {
        max-width: 1400px;
        margin: 0 auto;
        width: 100%;
      }

      /* Custom scrollbar for sidebar */
      .sidebar-nav::-webkit-scrollbar {
        width: 4px;
      }

      .sidebar-nav::-webkit-scrollbar-track {
        background: transparent;
      }

      .sidebar-nav::-webkit-scrollbar-thumb {
        background: rgba(0, 0, 0, 0.1);
        border-radius: 2px;
      }

      /* Responsive adjustments */
      @media (max-width: 768px) {
        .sidebar {
          width: 240px;
        }

        .content-wrapper {
          padding: 1rem;
        }

        .app-header {
          padding: 1rem;
        }

        .breadcrumb {
          display: none;
        }
      }
    `,
  ],
})
export class AppComponent {}
