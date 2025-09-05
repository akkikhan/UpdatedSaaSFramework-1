import { Component, OnInit, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { MatCardModule } from "@angular/material/card";
import { MatIconModule } from "@angular/material/icon";
import { MatButtonModule } from "@angular/material/button";
import { MatTableModule } from "@angular/material/table";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { MatChipsModule } from "@angular/material/chips";
import { Router } from "@angular/router";
import { ClaimsService, ClaimItem } from "../services/claims.service";
import { RbacService } from "../services/rbac.service";

@Component({
  standalone: true,
  selector: "app-dashboard",
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatTableModule,
    MatProgressSpinnerModule,
    MatChipsModule,
  ],
  template: `
    <div class="dashboard-header">
      <h1 class="page-title">
        <mat-icon class="page-icon">dashboard</mat-icon>
        Dashboard
      </h1>
      <p class="page-subtitle">Overview of your claims management system</p>
    </div>

    <!-- KPI Cards -->
    <div class="kpi-grid">
      <mat-card class="kpi-card open-card">
        <div class="kpi-icon">
          <mat-icon>radio_button_unchecked</mat-icon>
        </div>
        <div class="kpi-content">
          <h3 class="kpi-number">{{ kpi().open || 0 }}</h3>
          <p class="kpi-label">Open Claims</p>
        </div>
      </mat-card>

      <mat-card class="kpi-card pending-card">
        <div class="kpi-icon">
          <mat-icon>schedule</mat-icon>
        </div>
        <div class="kpi-content">
          <h3 class="kpi-number">{{ kpi().pending || 0 }}</h3>
          <p class="kpi-label">Pending Review</p>
        </div>
      </mat-card>

      <mat-card class="kpi-card approved-card">
        <div class="kpi-icon">
          <mat-icon>check_circle</mat-icon>
        </div>
        <div class="kpi-content">
          <h3 class="kpi-number">{{ kpi().approved || 0 }}</h3>
          <p class="kpi-label">Approved</p>
        </div>
      </mat-card>

      <mat-card class="kpi-card rejected-card">
        <div class="kpi-icon">
          <mat-icon>cancel</mat-icon>
        </div>
        <div class="kpi-content">
          <h3 class="kpi-number">{{ kpi().rejected || 0 }}</h3>
          <p class="kpi-label">Rejected</p>
        </div>
      </mat-card>
    </div>

    <!-- Recent Claims Table -->
    <mat-card class="recent-claims-card">
      <mat-card-header>
        <mat-card-title class="section-title">
          <mat-icon>assignment</mat-icon>
          Recent Claims
        </mat-card-title>
        <button mat-button routerLink="/claims" class="view-all-btn">
          View All Claims
          <mat-icon>arrow_forward</mat-icon>
        </button>
      </mat-card-header>
      <mat-card-content>
        <div *ngIf="loading" class="loading-container">
          <mat-spinner diameter="40"></mat-spinner>
          <p>Loading claims...</p>
        </div>

        <div *ngIf="!loading && claims.length === 0" class="empty-state">
          <mat-icon class="empty-icon">assignment</mat-icon>
          <h3>No Claims Found</h3>
          <p>There are currently no claims in the system.</p>
        </div>

        <div *ngIf="!loading && claims.length > 0" class="claims-table-container">
          <table mat-table [dataSource]="recentClaims" class="claims-table">
            <ng-container matColumnDef="id">
              <th mat-header-cell *matHeaderCellDef>Claim ID</th>
              <td mat-cell *matCellDef="let claim">#{{ claim.id || "N/A" }}</td>
            </ng-container>

            <ng-container matColumnDef="claimant">
              <th mat-header-cell *matHeaderCellDef>Claimant</th>
              <td mat-cell *matCellDef="let claim">
                <div class="claimant-info">
                  <div class="avatar">{{ (claim.claimant || "N/A").charAt(0).toUpperCase() }}</div>
                  <span>{{ claim.claimant || "Unknown" }}</span>
                </div>
              </td>
            </ng-container>

            <ng-container matColumnDef="amount">
              <th mat-header-cell *matHeaderCellDef>Amount</th>
              <td mat-cell *matCellDef="let claim" class="amount-cell">
                {{ claim.amount || 0 | currency }}
              </td>
            </ng-container>

            <ng-container matColumnDef="status">
              <th mat-header-cell *matHeaderCellDef>Status</th>
              <td mat-cell *matCellDef="let claim">
                <mat-chip class="status-chip status-{{ claim.status || 'unknown' }}">
                  {{ claim.status || "Unknown" | titlecase }}
                </mat-chip>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns"></tr>
          </table>
        </div>
      </mat-card-content>
    </mat-card>
  `,
  styles: [
    `
      .dashboard-header {
        margin-bottom: 32px;
      }

      .page-title {
        display: flex;
        align-items: center;
        gap: 12px;
        font-size: 28px;
        font-weight: 700;
        color: #1e293b;
        margin: 0 0 8px 0;
      }

      .page-icon {
        color: #6366f1;
        font-size: 32px;
        width: 32px;
        height: 32px;
      }

      .page-subtitle {
        margin: 0;
        font-size: 16px;
        color: #64748b;
      }

      .kpi-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 24px;
        margin-bottom: 32px;
      }

      .kpi-card {
        background: white;
        border-radius: 16px;
        padding: 24px;
        box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
        border: 1px solid #f1f5f9;
        display: flex;
        align-items: center;
        gap: 20px;
        transition: all 0.2s ease;
      }

      .kpi-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px 0 rgba(0, 0, 0, 0.15);
      }

      .kpi-icon {
        width: 56px;
        height: 56px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }

      .open-card .kpi-icon {
        background: #dbeafe;
        color: #2563eb;
      }

      .pending-card .kpi-icon {
        background: #fef3c7;
        color: #d97706;
      }

      .approved-card .kpi-icon {
        background: #dcfce7;
        color: #16a34a;
      }

      .rejected-card .kpi-icon {
        background: #fee2e2;
        color: #dc2626;
      }

      .kpi-icon mat-icon {
        font-size: 24px;
        width: 24px;
        height: 24px;
      }

      .kpi-content {
        flex: 1;
      }

      .kpi-number {
        font-size: 32px;
        font-weight: 700;
        color: #1e293b;
        margin: 0 0 4px 0;
      }

      .kpi-label {
        font-size: 14px;
        color: #64748b;
        margin: 0;
        font-weight: 500;
      }

      .recent-claims-card {
        margin-bottom: 24px;
      }

      .section-title {
        display: flex;
        align-items: center;
        gap: 12px;
        font-size: 18px;
        font-weight: 600;
        color: #1e293b;
      }

      .view-all-btn {
        color: #6366f1;
        margin-left: auto;
      }

      mat-card-header {
        display: flex;
        align-items: center;
        width: 100%;
      }

      .loading-container {
        text-align: center;
        padding: 48px 24px;
      }

      .loading-container p {
        margin-top: 16px;
        color: #64748b;
      }

      .empty-state {
        text-align: center;
        padding: 48px 24px;
      }

      .empty-icon {
        font-size: 48px;
        width: 48px;
        height: 48px;
        color: #cbd5e1;
        margin-bottom: 16px;
      }

      .empty-state h3 {
        color: #475569;
        margin-bottom: 8px;
      }

      .empty-state p {
        color: #64748b;
      }

      .claims-table-container {
        overflow-x: auto;
      }

      .claims-table {
        width: 100%;
      }

      .claimant-info {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .avatar {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: #6366f1;
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        font-weight: 600;
      }

      .amount-cell {
        font-weight: 600;
        color: #059669;
      }

      .status-chip {
        font-size: 12px;
        border: none;
        font-weight: 500;
      }

      .status-open {
        background: #dbeafe;
        color: #2563eb;
      }

      .status-pending {
        background: #fef3c7;
        color: #d97706;
      }

      .status-approved {
        background: #dcfce7;
        color: #16a34a;
      }

      .status-rejected {
        background: #fee2e2;
        color: #dc2626;
      }
    `,
  ],
})
export class DashboardComponent implements OnInit {
  claims: ClaimItem[] = [];
  recentClaims: ClaimItem[] = [];
  loading = true;
  profile: { roles: any[]; permissions: string[] } | null = null;
  displayedColumns = ["id", "claimant", "amount", "status"];

  kpi = signal({ open: 0, pending: 0, approved: 0, rejected: 0 });

  constructor(
    private claimsSvc: ClaimsService,
    private rbac: RbacService,
    private router: Router
  ) {}

  async ngOnInit() {
    this.profile = await this.rbac.profile();
    this.refresh();
  }

  refresh() {
    this.loading = true;
    this.claimsSvc.list().subscribe({
      next: list => {
        this.claims = list || [];
        this.recentClaims = this.claims.slice(0, 5); // Show only first 5 claims

        const k = { open: 0, pending: 0, approved: 0, rejected: 0 } as any;
        for (const c of this.claims) {
          const status = c.status || "unknown";
          if (k.hasOwnProperty(status)) {
            k[status] = (k[status] || 0) + 1;
          }
        }
        this.kpi.set(k);
        this.loading = false;
      },
      error: () => {
        // Add some dummy data for display
        this.claims = [
          { id: "CLM-1001", claimant: "John Doe", amount: 1500, status: "pending" },
          { id: "CLM-1002", claimant: "Jane Smith", amount: 2300, status: "approved" },
          { id: "CLM-1003", claimant: "Bob Johnson", amount: 1800, status: "open" },
        ] as ClaimItem[];
        this.recentClaims = this.claims;
        this.kpi.set({ open: 1, pending: 1, approved: 1, rejected: 0 });
        this.loading = false;
      },
    });
  }
}
