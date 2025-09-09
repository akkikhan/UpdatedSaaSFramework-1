import { Injectable } from "@angular/core";
import { HttpClient, HttpHeaders } from "@angular/common/http";
import { getToken, getRbacProfile, hasPermission } from "@saas-framework/auth-client";
import { TenantService } from "./tenant.service";

const BASE = localStorage.getItem("claims_base") || "http://localhost:5000";

@Injectable({ providedIn: "root" })
export class RbacService {
  constructor(private http: HttpClient, private tenant: TenantService) {}

  async profile() {
    return await getRbacProfile(BASE);
  }

  async can(permission: string, profile?: { permissions: string[] }) {
    return await hasPermission(permission, profile, BASE);
  }

  private apiHeaders(): HttpHeaders {
    const key = this.tenant.rbacKey;
    if (!key) throw new Error("RBAC API key missing");
    return new HttpHeaders({ "X-API-Key": key });
  }

  listRoles() {
    return this.http.get<any[]>(`${BASE}/api/v2/rbac/roles`, {
      headers: this.apiHeaders(),
    });
  }

  createRole(name: string, permissions: string[]) {
    return this.http.post(
      `${BASE}/api/v2/rbac/roles`,
      { name, permissions },
      { headers: this.apiHeaders() }
    );
  }

  private getUserIdFromToken(): string | null {
    const token = getToken();
    if (!token) return null;
    try {
      const payload = JSON.parse(atob(token.split(".")[1] || ""));
      return payload.sub || payload.userId || payload.id || null;
    } catch {
      return null;
    }
  }

  async explain(resource: string, action: string) {
    const token = getToken();
    const userId = this.getUserIdFromToken();
    if (!token || !userId) throw new Error("Not authenticated");
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    return this.http
      .post<any>(
        `${BASE}/api/v2/rbac/check-permission`,
        { userId, resource, action, explain: true },
        { headers }
      )
      .toPromise();
  }
}
