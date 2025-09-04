import "zone.js";
import { bootstrapApplication } from "@angular/platform-browser";
import { Component, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import {
  handleSuccessFromUrl,
  startAzure,
  loginWithPassword,
  fetchWithAuth,
  getRbacProfile,
} from "@saas-framework/auth-client";

const BASE = ((): string => {
  try {
    return localStorage.getItem("claims_base") || "http://localhost:5000";
  } catch {
    return "http://localhost:5000";
  }
})();

@Component({
  selector: "app-root",
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; margin: 0;">
      <div style="position:sticky;top:0;background:#0ea5e9;color:#fff;padding:12px 16px;">
        <div
          style="max-width:1100px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;"
        >
          <div><strong>Claims Portal</strong> <span style="opacity:.9">(Angular Demo)</span></div>
          <nav style="display:flex;gap:12px;">
            <a
              href="#"
              (click)="$event.preventDefault(); setView('dashboard')"
              style="color:#e2e8f0;text-decoration:none;"
              >Dashboard</a
            >
            <a
              href="#"
              (click)="$event.preventDefault(); setView('claims')"
              style="color:#e2e8f0;text-decoration:none;"
              >Claims</a
            >
            <a
              href="#"
              (click)="$event.preventDefault(); setView('logs')"
              style="color:#e2e8f0;text-decoration:none;"
              >Logs</a
            >
            <a
              href="#"
              (click)="$event.preventDefault(); setView('profile')"
              style="color:#e2e8f0;text-decoration:none;"
              >Profile</a
            >
          </nav>
        </div>
      </div>
      <div style="max-width:1100px;margin:0 auto;padding:16px;">
        <div style="color:#475569">Auth (Azure AD), RBAC, and Logging via platform modules.</div>

        <div style="border:1px solid #e2e8f0; border-radius:8px; padding:12px; margin:12px 0;">
          <h3>Configuration</h3>
          <label
            >Org ID <input [(ngModel)]="orgId" placeholder="acme" style="margin-left:8px;"
          /></label>
          <button (click)="saveCfg()">Save</button>
          <label style="margin-left:16px;"
            >Logging API Key
            <input
              [(ngModel)]="logKey"
              placeholder="logging_..."
              style="min-width:300px; margin-left:8px;"
          /></label>
        </div>

        <div style="border:1px solid #e2e8f0; border-radius:8px; padding:12px; margin:12px 0;">
          <h3>Sign In</h3>
          <button (click)="signinMicrosoft()">Sign in with Microsoft</button>
          <span *ngIf="user()" style="margin-left:12px; color:#059669;"
            >Signed in as {{ user()?.email }}</span
          >
          <div style="margin-top:8px;">
            <input [(ngModel)]="email" placeholder="admin@tenant.com" />
            <input [(ngModel)]="password" type="password" placeholder="password" />
            <button (click)="signinLocal()">Local</button>
            <button (click)="verifyToken()" style="margin-left:8px;">Verify</button>
          </div>
        </div>

        <div
          *ngIf="view() === 'dashboard'"
          style="border:1px solid #e2e8f0; border-radius:8px; padding:12px; margin:12px 0;"
        >
          <h3>Dashboard</h3>
          <div style="color:#64748b">Signed in as {{ user()?.email || "anonymous" }}</div>
          <div style="margin-top:8px;">
            <strong>Enabled Modules:</strong>
            <span
              *ngFor="let m of enabledModules()"
              style="display:inline-block;border:1px solid #cbd5e1;border-radius:9999px;padding:2px 8px;margin-right:6px;"
              >{{ m }}</span
            >
          </div>
        </div>

        <div
          *ngIf="view() === 'claims'"
          style="border:1px solid #e2e8f0; border-radius:8px; padding:12px; margin:12px 0;"
        >
          <h3>Claims</h3>
          <div *ngIf="!user()" style="color:#ef4444">Sign in first.</div>
          <table *ngIf="user()" style="width:100%; border-collapse: collapse;">
            <thead>
              <tr>
                <th style="text-align:left; border-bottom:1px solid #e2e8f0;">ID</th>
                <th style="text-align:left; border-bottom:1px solid #e2e8f0;">Policy</th>
                <th style="text-align:left; border-bottom:1px solid #e2e8f0;">Amount</th>
                <th style="text-align:left; border-bottom:1px solid #e2e8f0;">Status</th>
                <th style="text-align:left; border-bottom:1px solid #e2e8f0;">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let c of claims()">
                <td>{{ c.id }}</td>
                <td>{{ c.policyId }}</td>
                <td>{{ c.amount | number: "1.2-2" }}</td>
                <td>{{ c.status }}</td>
                <td>
                  <button (click)="approve(c.id)" [disabled]="!canApprove()">Approve</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div
          *ngIf="view() === 'logs'"
          style="border:1px solid #e2e8f0; border-radius:8px; padding:12px; margin:12px 0;"
        >
          <h3>Logs</h3>
          <button (click)="sendLog()">Send Test Event</button>
          <button (click)="queryLogs()" style="margin-left:8px;">Query Recent</button>
          <pre
            style="background:#0f172a; color:#e2e8f0; padding:.75rem; border-radius:6px; white-space: pre-wrap;"
            >{{ output() }}</pre
          >
        </div>
        <div
          *ngIf="view() === 'profile'"
          style="border:1px solid #e2e8f0; border-radius:8px; padding:12px; margin:12px 0;"
        >
          <h3>Profile</h3>
          <div style="color:#64748b">Email: {{ user()?.email }}</div>
          <div style="margin-top:8px;">
            <button
              (click)="doLogout()"
              style="padding:.45rem .7rem; border-radius:6px; border:1px solid #cbd5e1; background:#fff; cursor:pointer;"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
})
class AppComponent {
  view = signal<"dashboard" | "claims" | "logs" | "profile">("dashboard");
  orgId = localStorage.getItem("claims_orgId") || "";
  logKey = localStorage.getItem("claims_logKey") || "";
  email = "";
  password = "";

  user = signal<any | null>(null);
  profile = signal<any | null>(null);
  claims = signal<any[]>([]);
  output = signal<string>("Ready.");
  enabledModules = signal<string[]>([]);

  constructor() {
    try {
      handleSuccessFromUrl();
    } catch {}
    this.loadClaims();
    this.refreshUser();
    this.refreshTenant();
  }

  setView(v: "dashboard" | "claims" | "logs" | "profile") {
    this.view.set(v);
  }

  saveCfg() {
    localStorage.setItem("claims_orgId", this.orgId.trim());
    localStorage.setItem("claims_logKey", this.logKey.trim());
    this.out({ saved: true, orgId: this.orgId });
  }

  async signinMicrosoft() {
    if (!this.orgId) return this.out("Enter Org ID first");
    await startAzure(this.orgId, { baseUrl: BASE });
  }

  async signinLocal() {
    if (!this.orgId) return this.out("Enter Org ID first");
    try {
      const r = await loginWithPassword({
        orgId: this.orgId,
        email: this.email,
        password: this.password,
        baseUrl: BASE,
      });
      this.out({ login: "ok", user: r?.user });
      await this.refreshUser();
      await this.loadClaims();
    } catch (e: any) {
      this.out(e?.message || String(e));
    }
  }

  async verifyToken() {
    try {
      const res = await fetchWithAuth(`${BASE}/api/v2/auth/verify`);
      this.out(await res.json());
    } catch (e: any) {
      this.out(e?.message || String(e));
    }
  }

  canApprove() {
    const p = this.profile();
    return Array.isArray(p?.permissions) && p.permissions.includes("claims.approve");
  }

  async loadClaims() {
    try {
      const res = await fetchWithAuth("http://localhost:5299/claims");
      if (!res.ok) throw new Error(String(res.status));
      this.claims.set(await res.json());
    } catch (e: any) {
      this.out(e?.message || String(e));
    }
  }

  async approve(id: string) {
    try {
      const res = await fetchWithAuth(
        `http://localhost:5299/claims/${encodeURIComponent(id)}/approve`,
        { method: "POST" }
      );
      this.out(await res.json());
      await this.loadClaims();
    } catch (e: any) {
      this.out(e?.message || String(e));
    }
  }

  async refreshUser() {
    try {
      const res = await fetchWithAuth(`${BASE}/api/v2/auth/verify`);
      if (!res.ok) {
        this.user.set(null);
        this.profile.set(null);
        return;
      }
      const data = await res.json();
      this.user.set(data?.user || null);
      const p = await getRbacProfile(BASE);
      this.profile.set(p);
    } catch {
      this.user.set(null);
      this.profile.set(null);
    }
  }

  async sendLog() {
    try {
      const key = this.logKey.trim();
      if (!key) return this.out("Enter Logging API key");
      const r = await fetch(`${BASE}/api/v2/logging/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-API-Key": key },
        body: JSON.stringify({
          level: "info",
          message: "Angular test event",
          category: "claims",
          metadata: { ts: new Date().toISOString() },
        }),
      });
      this.out(await r.json());
    } catch (e: any) {
      this.out(e?.message || String(e));
    }
  }

  async queryLogs() {
    try {
      const key = this.logKey.trim();
      if (!key) return this.out("Enter Logging API key");
      const r = await fetch(`${BASE}/api/v2/logging/events?category=claims&limit=5`, {
        headers: { "X-API-Key": key },
      });
      this.out(JSON.stringify(await r.json(), null, 2));
    } catch (e: any) {
      this.out(e?.message || String(e));
    }
  }

  out(o: any) {
    this.output.set(typeof o === "string" ? o : JSON.stringify(o, null, 2));
  }

  async refreshTenant() {
    try {
      if (!this.orgId) return;
      const r = await fetch(`${BASE}/api/tenants/by-org-id/${encodeURIComponent(this.orgId)}`);
      if (r.ok) {
        const t = await r.json();
        this.enabledModules.set((t?.enabledModules || []) as string[]);
      }
    } catch {}
  }

  doLogout() {
    try {
      localStorage.removeItem("tenant_token");
    } catch {}
    this.user.set(null);
    this.profile.set(null);
  }
}

bootstrapApplication(AppComponent).catch((err: unknown) => console.error(err));
