import { Component } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { MatCardModule } from "@angular/material/card";
import { MatButtonModule } from "@angular/material/button";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { Router } from "@angular/router";
import {
  handleSuccessFromUrl,
  startAzure,
  loginWithPassword,
  getToken,
} from "@saas-framework/auth-client";

const BASE = localStorage.getItem("claims_base") || "http://localhost:5000";

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
  ],
  template: `
    <mat-card style="max-width:520px;margin:48px auto">
      <mat-card-title>Sign In</mat-card-title>
      <mat-card-content>
        <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:center">
          <mat-form-field appearance="outline"
            ><mat-label>Org ID</mat-label><input matInput [(ngModel)]="orgId" placeholder="acme"
          /></mat-form-field>
          <button mat-raised-button color="primary" (click)="signinMicrosoft()">
            Sign in with Microsoft
          </button>
        </div>
        <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:center;margin-top:12px">
          <mat-form-field appearance="outline"
            ><mat-label>Email</mat-label><input matInput [(ngModel)]="email"
          /></mat-form-field>
          <mat-form-field appearance="outline"
            ><mat-label>Password</mat-label><input matInput [(ngModel)]="password" type="password"
          /></mat-form-field>
          <button mat-stroked-button (click)="signinLocal()">Continue with Email</button>
        </div>
        <div class="muted" style="margin-top:8px">SSO recommended. Token is stored locally.</div>
      </mat-card-content>
    </mat-card>
  `,
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
    await startAzure(this.orgId, { baseUrl: BASE });
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
