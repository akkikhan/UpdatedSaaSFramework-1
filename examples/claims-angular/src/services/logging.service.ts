import { Injectable } from "@angular/core";
import { HttpClient, HttpHeaders, HttpParams } from "@angular/common/http";
import { TenantService } from "./tenant.service";

const BASE = localStorage.getItem("claims_base") || "http://localhost:5000";

@Injectable({ providedIn: "root" })
export class LoggingService {
  private get apiKey(): string | null {
    return this.tenant.loggingKey;
  }

  constructor(
    private http: HttpClient,
    private tenant: TenantService
  ) {}

  private headers() {
    const key = this.apiKey;
    if (!key) throw new Error("Logging API key missing");
    return new HttpHeaders({ "X-API-Key": key });
  }

  send(
    level: "info" | "warning" | "error",
    message: string,
    opts?: { category?: string; metadata?: any; userId?: string }
  ) {
    const body = {
      level,
      message,
      category: opts?.category || "application",
      metadata: opts?.metadata || {},
      userId: opts?.userId || undefined,
    };
    return this.http.post(`${BASE}/api/v2/logging/events`, body, { headers: this.headers() });
  }

  query(params?: {
    level?: string;
    category?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  }) {
    let hp = new HttpParams();
    Object.entries(params || {}).forEach(([k, v]) => {
      if (v !== undefined && v !== null) hp = hp.set(k, String(v));
    });
    return this.http.get<any[]>(`${BASE}/api/v2/logging/events`, {
      headers: this.headers(),
      params: hp,
    });
  }
}
