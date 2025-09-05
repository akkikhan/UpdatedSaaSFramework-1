import { Component, OnInit, computed, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { MatCardModule } from "@angular/material/card";
import { MatChipsModule } from "@angular/material/chips";
import { ClaimsService, ClaimItem } from "../services/claims.service";
import { TenantService } from "../services/tenant.service";
import { RbacService } from "../services/rbac.service";

@Component({
  standalone: true,
  selector: "app-dashboard",
  imports: [CommonModule, MatCardModule, MatChipsModule],
  template: `
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px">
      <mat-card>
        <mat-card-title>Open</mat-card-title>
        <mat-card-content
          ><h2>{{ kpi().open }}</h2></mat-card-content
        >
      </mat-card>
      <mat-card>
        <mat-card-title>Pending</mat-card-title>
        <mat-card-content
          ><h2>{{ kpi().pending }}</h2></mat-card-content
        >
      </mat-card>
      <mat-card>
        <mat-card-title>Approved</mat-card-title>
        <mat-card-content
          ><h2>{{ kpi().approved }}</h2></mat-card-content
        >
      </mat-card>
      <mat-card>
        <mat-card-title>Rejected</mat-card-title>
        <mat-card-content
          ><h2>{{ kpi().rejected }}</h2></mat-card-content
        >
      </mat-card>
    </div>

    <mat-card style="margin-top:16px">
      <mat-card-title>Enabled Modules</mat-card-title>
      <mat-card-content>
        <mat-chip-set>
          <mat-chip *ngFor="let m of modules">{{ m }}</mat-chip>
        </mat-chip-set>
      </mat-card-content>
    </mat-card>
  `,
})
export class DashboardComponent implements OnInit {
  claims: ClaimItem[] = [];
  modules: string[] = [];
  profile: { roles: any[]; permissions: string[] } | null = null;

  kpi = signal({ open: 0, pending: 0, approved: 0, rejected: 0 });

  constructor(
    private claimsSvc: ClaimsService,
    private tenantSvc: TenantService,
    private rbac: RbacService
  ) {}

  async ngOnInit() {
    this.tenantSvc.enabledModules.subscribe(m => (this.modules = m || []));
    this.profile = await this.rbac.profile();
    this.refresh();
  }

  refresh() {
    this.claimsSvc.list().subscribe(list => {
      this.claims = list || [];
      const k = { open: 0, pending: 0, approved: 0, rejected: 0 } as any;
      for (const c of this.claims) k[c.status] = (k[c.status] || 0) + 1;
      this.kpi.set(k);
    });
  }
}
