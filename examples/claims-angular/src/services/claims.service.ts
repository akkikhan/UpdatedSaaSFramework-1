import { Injectable } from "@angular/core";
import { HttpClient, HttpHeaders } from "@angular/common/http";
import { getToken } from "@saas-framework/auth-client";

export interface ClaimItem {
  id: string;
  claimant: string;
  amount: number;
  status: "open" | "pending" | "approved" | "rejected";
  createdAt?: string;
}

const API = localStorage.getItem("claims_api") || "http://localhost:5299";

@Injectable({ providedIn: "root" })
export class ClaimsService {
  constructor(private http: HttpClient) {}

  private authHeaders() {
    const token = getToken();
    return token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : undefined;
  }

  list() {
    return this.http.get<ClaimItem[]>(`${API}/claims`, { headers: this.authHeaders() });
  }

  approve(id: string) {
    return this.http.post(`${API}/claims/${id}/approve`, {}, { headers: this.authHeaders() });
  }
}
