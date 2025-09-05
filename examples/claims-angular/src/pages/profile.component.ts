import { Component, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { MatCardModule } from "@angular/material/card";
import { MatButtonModule } from "@angular/material/button";
import { Router } from "@angular/router";
import { getToken, clearToken } from "@saas-framework/auth-client";
import { RbacService } from "../services/rbac.service";

@Component({
  standalone: true,
  selector: "app-profile",
  imports: [CommonModule, MatCardModule, MatButtonModule],
  template: `
    <mat-card>
      <mat-card-title>Profile</mat-card-title>
      <mat-card-content>
        <div>
          Email: <b>{{ email }}</b>
        </div>
        <div>
          Permissions: <b>{{ permCount }}</b>
        </div>
      </mat-card-content>
      <div style="padding:12px">
        <button mat-stroked-button color="warn" (click)="logout()">Logout</button>
      </div>
    </mat-card>
  `,
})
export class ProfileComponent implements OnInit {
  email = "";
  permCount = 0;

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
