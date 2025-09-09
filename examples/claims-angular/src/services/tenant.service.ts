import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { BehaviorSubject, timer } from "rxjs";
import { switchMap, catchError } from "rxjs/operators";
import { SnackbarService } from "./snackbar.service";
import { BASE } from "./api-base";

export interface TenantInfo {
  id: string;
  name: string;
  orgId: string;
  status: string;
  enabledModules: string[];
  moduleConfigs?: any;
}

// BASE now comes from centralized api-base helper

@Injectable({ providedIn: "root" })
export class TenantService {
  private tenant$ = new BehaviorSubject<TenantInfo | null>(null);
  private modules$ = new BehaviorSubject<string[]>([]);
  private refreshing = false;

  constructor(
    private http: HttpClient,
    private snack: SnackbarService
  ) {
    const orgId = localStorage.getItem("claims_orgId");
    if (orgId) this.startAutoRefresh(orgId);
  }

  get tenant() {
    return this.tenant$.asObservable();
  }
  get enabledModules() {
    return this.modules$.asObservable();
  }

  fetchByOrgId(orgId: string) {
    return this.http.get<TenantInfo>(`${BASE}/api/tenants/by-org-id/${orgId}`);
  }

  startAutoRefresh(orgId: string) {
    if (this.refreshing) return;
    this.refreshing = true;
    timer(0, 30000)
      .pipe(
        switchMap(() => this.fetchByOrgId(orgId)),
        catchError((err, _caught) => {
          console.warn("Tenant refresh failed", err);
          this.snack.error(err?.error?.message || "Failed to refresh tenant");
          throw err;
        })
      )
      .subscribe(t => {
        const prev = this.tenant$.value;
        this.tenant$.next(t);
        this.modules$.next(t?.enabledModules || []);
        if (prev && JSON.stringify(prev.enabledModules) !== JSON.stringify(t.enabledModules)) {
          this.snack.info("Tenant modules updated");
        }
      });
  }
}
