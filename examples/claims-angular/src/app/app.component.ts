import { Component } from "@angular/core";
import { RouterOutlet, RouterLink } from "@angular/router";
import { CommonModule } from "@angular/common";
import { MatSidenavModule } from "@angular/material/sidenav";
import { MatToolbarModule } from "@angular/material/toolbar";
import { MatListModule } from "@angular/material/list";
import { MatIconModule } from "@angular/material/icon";

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
  ],
  template: `
    <mat-sidenav-container style="height:100vh;">
      <mat-sidenav mode="side" opened>
        <div
          style="padding:12px 12px 0;color:#fff;background:linear-gradient(180deg,#187de7 0%, #0ea5e9 100%);height:100%"
        >
          <h3 style="margin:8px 4px 12px">Claims Portal</h3>
          <mat-nav-list>
            <a mat-list-item routerLink="/dashboard"
              ><mat-icon>dashboard</mat-icon><span style="margin-left:6px">Dashboard</span></a
            >
            <a mat-list-item routerLink="/claims"
              ><mat-icon>assignment</mat-icon><span style="margin-left:6px">Claims</span></a
            >
            <a mat-list-item routerLink="/logs"
              ><mat-icon>list_alt</mat-icon><span style="margin-left:6px">Logs</span></a
            >
            <a mat-list-item routerLink="/profile"
              ><mat-icon>person</mat-icon><span style="margin-left:6px">Profile</span></a
            >
          </mat-nav-list>
        </div>
      </mat-sidenav>
      <mat-sidenav-content>
        <mat-toolbar color="primary" style="justify-content:space-between">
          <div>Azure AD • RBAC • Logging</div>
          <a routerLink="/login" style="color:white;text-decoration:none">Login</a>
        </mat-toolbar>
        <div style="padding:16px; max-width:1200px; margin:0 auto;">
          <router-outlet></router-outlet>
        </div>
      </mat-sidenav-content>
    </mat-sidenav-container>
  `,
})
export class AppComponent {}
