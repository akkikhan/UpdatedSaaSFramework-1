import { Injectable } from "@angular/core";
import { HttpClient, HttpHeaders, HttpParams } from "@angular/common/http";
import { SnackbarService } from "./snackbar.service";

const BASE = localStorage.getItem("claims_base") || "http://localhost:5000";

@Injectable({ providedIn: "root" })
export class LoggingService {
  private get apiKey(): string | null {
    return localStorage.getItem("claims_logging_key");
  }

  constructor(
    private http: HttpClient,
    private snack: SnackbarService
  ) {}

  setApiKey(key: string) {
    localStorage.setItem("claims_logging_key", key);
    this.snack.success("Logging API key saved");
  }

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
