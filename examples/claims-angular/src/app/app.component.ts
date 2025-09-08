import { Component, OnInit } from "@angular/core";
import { RouterOutlet, RouterLink, NavigationEnd } from "@angular/router";
import { CommonModule } from "@angular/common";
import { MatSidenavModule } from "@angular/material/sidenav";
import { MatToolbarModule } from "@angular/material/toolbar";
import { MatListModule } from "@angular/material/list";
import { MatIconModule } from "@angular/material/icon";
import { MatButtonModule } from "@angular/material/button";
import { MatMenuModule } from "@angular/material/menu";
import { getToken, clearToken } from "@saas-framework/auth-client";
import { Router } from "@angular/router";
import { filter } from "rxjs/operators";

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
    MatMenuModule,
  ],
  template: `
    <!-- Show navigation layout only when logged in -->
    <mat-sidenav-container *ngIf="isLoggedIn" class="app-container">
      <mat-sidenav mode="side" opened class="app-sidenav">
        <div class="sidenav-header">
          <mat-icon class="brand-icon">business</mat-icon>
          <h3 class="brand-title">Claims Portal</h3>
          <p class="brand-subtitle">Enterprise Management</p>
        </div>

        <mat-nav-list class="navigation-list">
          <h4 class="nav-section-title">MAIN</h4>
          <a mat-list-item routerLink="/dashboard" class="nav-item">
            <mat-icon class="nav-icon">dashboard</mat-icon>
            <span class="nav-text">Dashboard</span>
          </a>
          <a mat-list-item routerLink="/claims" class="nav-item">
            <mat-icon class="nav-icon">assignment</mat-icon>
            <span class="nav-text">Claims</span>
            <span class="nav-badge">2</span>
          </a>

          <h4 class="nav-section-title">ACCOUNT</h4>
          <a mat-list-item routerLink="/logs" class="nav-item">
            <mat-icon class="nav-icon">list_alt</mat-icon>
            <span class="nav-text">Activity Logs</span>
          </a>
          <a mat-list-item routerLink="/profile" class="nav-item">
            <mat-icon class="nav-icon">person</mat-icon>
            <span class="nav-text">Profile</span>
          </a>
        </mat-nav-list>
      </mat-sidenav>

      <mat-sidenav-content class="app-content">
        <mat-toolbar class="app-toolbar">
          <div class="toolbar-left">
            <span class="toolbar-title">Azure AD • RBAC • Logging</span>
          </div>
          <div class="toolbar-right">
            <button mat-icon-button [matMenuTriggerFor]="userMenu" class="user-menu-btn">
              <mat-icon>account_circle</mat-icon>
            </button>

            <mat-menu #userMenu="matMenu" class="user-dropdown">
              <button mat-menu-item routerLink="/profile">
                <mat-icon>person</mat-icon>
                <span>Profile</span>
              </button>
              <button mat-menu-item (click)="logout()">
                <mat-icon>logout</mat-icon>
                <span>Logout</span>
              </button>
            </mat-menu>
          </div>
        </mat-toolbar>

        <div class="main-content">
          <router-outlet></router-outlet>
        </div>
      </mat-sidenav-content>
    </mat-sidenav-container>

    <!-- Show login page without navigation when not logged in -->
    <div *ngIf="!isLoggedIn" class="login-container">
      <router-outlet></router-outlet>
    </div>
  `,
  styles: [
    `
      .app-container {
        height: 100vh;
        background: #f8fafc;
      }

      .app-sidenav {
        width: 280px;
        background: #244866;
        border: none;
      }

      .sidenav-header {
        padding: 24px 20px;
        background: linear-gradient(135deg, #244866 0%, #1e3a5f 100%);
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        text-align: center;
        color: white;
      }

      .brand-icon {
        font-size: 32px;
        width: 32px;
        height: 32px;
        color: #60a5fa;
        margin-bottom: 8px;
      }

      .brand-title {
        margin: 8px 0 4px 0;
        font-size: 20px;
        font-weight: 600;
        color: white;
      }

      .brand-subtitle {
        margin: 0;
        font-size: 12px;
        color: #94a3b8;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .navigation-list {
        padding: 16px 0;
      }

      .nav-section-title {
        padding: 16px 20px 8px;
        margin: 0;
        font-size: 11px;
        font-weight: 600;
        color: #94a3b8;
        text-transform: uppercase;
        letter-spacing: 1px;
      }

      .nav-item {
        height: 48px !important;
        color: white !important;
        margin: 2px 12px;
        border-radius: 8px;
        transition: all 0.2s ease;
        position: relative;
      }

      .nav-item:hover {
        background: rgba(255, 255, 255, 0.1) !important;
        color: white !important;
      }

      .nav-item.mdc-list-item--activated {
        background: rgba(96, 165, 250, 0.15) !important;
        color: #60a5fa !important;
      }

      .nav-icon {
        color: inherit;
        margin-right: 16px;
        width: 20px;
        height: 20px;
        font-size: 20px;
      }

      .nav-text {
        font-size: 14px;
        font-weight: 500;
        color: inherit;
      }

      .nav-badge {
        margin-left: auto;
        background: #ef4444;
        color: white;
        border-radius: 10px;
        padding: 2px 8px;
        font-size: 11px;
        font-weight: 600;
      }

      .app-toolbar {
        background: white;
        color: #1e293b;
        border-bottom: 1px solid #e2e8f0;
        height: 64px;
        padding: 0 24px;
        box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
      }

      .toolbar-left {
        flex: 1;
      }

      .toolbar-title {
        font-size: 14px;
        font-weight: 500;
        color: #64748b;
      }

      .toolbar-right {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .login-btn {
        color: #244866;
      }

      .user-menu-btn {
        color: #244866;
      }

      .user-dropdown {
        margin-top: 8px;
      }

      .main-content {
        padding: 24px;
        background: #f8fafc;
        min-height: calc(100vh - 64px);
        max-width: 1400px;
        margin: 0 auto;
        width: 100%;
      }

      .login-container {
        height: 100vh;
        width: 100vw;
        background: #f8fafc;
        display: flex;
        align-items: center;
        justify-content: center;
      }
    `,
  ],
})
export class AppComponent implements OnInit {
  isLoggedIn = false;

  constructor(private router: Router) {}

  ngOnInit() {
    this.checkAuthStatus();

    // Listen to router events to check auth status on navigation
    this.router.events.pipe(filter(event => event instanceof NavigationEnd)).subscribe(() => {
      this.checkAuthStatus();
    });
  }

  checkAuthStatus() {
    const token = getToken();
    const wasLoggedIn = this.isLoggedIn;
    this.isLoggedIn = !!token;

    // Handle authentication state changes
    if (!token) {
      // No token - redirect to login if not already there
      if (this.router.url !== "/login") {
        this.router.navigate(["/login"]);
      }
    } else if (this.router.url === "/login" || this.router.url === "/") {
      // Has token - redirect from login to dashboard if needed
      this.router.navigate(["/dashboard"]);
    }
  }

  logout() {
    clearToken();
    this.isLoggedIn = false;
    this.router.navigate(["/login"]);
  }
}
