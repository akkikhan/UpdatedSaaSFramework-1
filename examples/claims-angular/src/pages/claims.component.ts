import { Component, ViewChild, OnInit, OnDestroy, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { MatCardModule } from "@angular/material/card";
import { MatTableDataSource, MatTableModule } from "@angular/material/table";
import { MatPaginator, MatPaginatorModule } from "@angular/material/paginator";
import { MatSort, MatSortModule } from "@angular/material/sort";
import { MatButtonModule } from "@angular/material/button";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatTooltipModule } from "@angular/material/tooltip";
import { MatIconModule } from "@angular/material/icon";
import { MatSelectModule } from "@angular/material/select";
import { MatDialog, MatDialogModule, MAT_DIALOG_DATA } from "@angular/material/dialog";
import { MatChipsModule } from "@angular/material/chips";
import { debounceTime, distinctUntilChanged } from "rxjs/operators";
import { FormControl, ReactiveFormsModule } from "@angular/forms";
import { ClaimsService, ClaimItem } from "../services/claims.service";
import { SnackbarService } from "../services/snackbar.service";
import { RbacService } from "../services/rbac.service";
import { LoggingService } from "../services/logging.service";

@Component({
  standalone: true,
  selector: "app-claims",
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatTooltipModule,
    MatIconModule,
    MatDialogModule,
    MatSelectModule,
    MatChipsModule,
  ],
  template: `
    <div class="claims-header">
      <h1 class="page-title">
        <mat-icon class="page-icon">assignment</mat-icon>
        Claims Management
      </h1>
      <p class="page-subtitle">Review and approve submitted claims</p>
    </div>

    <div class="claims-container">
      <div class="filters-section">
        <div class="filter-group">
          <mat-form-field appearance="outline" class="search-field">
            <mat-label>Search Claims</mat-label>
            <input matInput [formControl]="search" placeholder="Find by claimant, ID..." />
            <mat-icon matPrefix>search</mat-icon>
          </mat-form-field>

          <mat-form-field appearance="outline" class="status-field">
            <mat-label>Filter by Status</mat-label>
            <mat-select [formControl]="status">
              <mat-option value="">All Status</mat-option>
              <mat-option value="open">Open</mat-option>
              <mat-option value="pending">Pending</mat-option>
              <mat-option value="approved">Approved</mat-option>
              <mat-option value="rejected">Rejected</mat-option>
            </mat-select>
          </mat-form-field>
        </div>
      </div>

      <div class="table-container">
        <table mat-table [dataSource]="data" matSort class="modern-table">
          <ng-container matColumnDef="id">
            <th mat-header-cell *matHeaderCellDef mat-sort-header>Claim ID</th>
            <td mat-cell *matCellDef="let c" class="id-cell">#{{ c.id || "N/A" }}</td>
          </ng-container>

          <ng-container matColumnDef="claimant">
            <th mat-header-cell *matHeaderCellDef mat-sort-header>Claimant</th>
            <td mat-cell *matCellDef="let c" class="claimant-cell">
              <div class="claimant-info">
                <div class="avatar">{{ (c.claimant || "N/A").charAt(0).toUpperCase() }}</div>
                <span>{{ c.claimant || "Unknown" }}</span>
              </div>
            </td>
          </ng-container>

          <ng-container matColumnDef="amount">
            <th mat-header-cell *matHeaderCellDef mat-sort-header>Amount</th>
            <td mat-cell *matCellDef="let c" class="amount-cell">
              <span class="amount">{{ c.amount || 0 | currency }}</span>
            </td>
          </ng-container>

          <ng-container matColumnDef="status">
            <th mat-header-cell *matHeaderCellDef mat-sort-header>Status</th>
            <td mat-cell *matCellDef="let c" class="status-cell">
              <mat-chip class="status-chip status-{{ c.status || 'unknown' }}">
                <mat-icon class="status-icon">
                  {{ getStatusIcon(c.status || "unknown") }}
                </mat-icon>
                {{ c.status || "Unknown" | titlecase }}
              </mat-chip>
            </td>
          </ng-container>

          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef>Actions</th>
            <td mat-cell *matCellDef="let c" class="actions-cell">
              <div class="action-buttons">
                <button
                  mat-raised-button
                  color="primary"
                  class="approve-btn"
                  (click)="approve(c)"
                  [disabled]="!canApprove || c.status !== 'pending'"
                  [matTooltip]="
                    !canApprove ? 'Permission required: claims.approve' : 'Approve this claim'
                  "
                >
                  <mat-icon>check_circle</mat-icon>
                  Approve
                </button>

                <button
                  mat-icon-button
                  *ngIf="!canApprove"
                  (click)="whyDenied()"
                  class="help-btn"
                  matTooltip="Why can't I approve?"
                >
                  <mat-icon>help_outline</mat-icon>
                </button>
              </div>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="cols" class="table-header"></tr>
          <tr mat-row *matRowDef="let row; columns: cols" class="table-row"></tr>
        </table>

        <mat-paginator
          [pageSize]="10"
          [pageSizeOptions]="[5, 10, 25, 50]"
          showFirstLastButtons
          class="modern-paginator"
        >
        </mat-paginator>
      </div>
    </div>
  `,
  styles: [
    `
      .claims-header {
        margin-bottom: 32px;
        padding: 0 8px;
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
        font-size: 32px;
        width: 32px;
        height: 32px;
        color: #6366f1;
      }

      .page-subtitle {
        color: #64748b;
        font-size: 16px;
        margin: 0;
        font-weight: 400;
      }

      .claims-container {
        background: white;
        border-radius: 16px;
        box-shadow:
          0 1px 3px 0 rgb(0 0 0 / 0.1),
          0 1px 2px -1px rgb(0 0 0 / 0.1);
        overflow: hidden;
      }

      .filters-section {
        padding: 24px;
        border-bottom: 1px solid #e2e8f0;
        background: #f8fafc;
      }

      .filter-group {
        display: flex;
        gap: 16px;
        align-items: flex-end;
        flex-wrap: wrap;
      }

      .search-field {
        min-width: 320px;
        flex: 1;
      }

      .status-field {
        min-width: 180px;
      }

      .search-field ::ng-deep .mat-mdc-form-field-prefix {
        color: #6b7280;
      }

      .table-container {
        overflow-x: auto;
      }

      .modern-table {
        width: 100%;
        background: white;
      }

      .table-header {
        background: #f8fafc;
        font-weight: 600;
        color: #374151;
      }

      .table-row {
        transition: all 0.2s ease;
        border-bottom: 1px solid #f1f5f9;
      }

      .table-row:hover {
        background-color: #f8fafc;
      }

      .id-cell {
        font-family: "Courier New", monospace;
        font-weight: 600;
        color: #6366f1;
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
        background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 600;
        font-size: 14px;
      }

      .amount-cell .amount {
        font-weight: 600;
        font-size: 16px;
        color: #059669;
      }

      .status-chip {
        font-weight: 600;
        min-height: 32px;
        font-size: 12px;
        border-radius: 16px;
        display: flex;
        align-items: center;
        gap: 4px;
      }

      .status-chip.status-open {
        background-color: #dbeafe;
        color: #1d4ed8;
      }

      .status-chip.status-pending {
        background-color: #fef3c7;
        color: #d97706;
      }

      .status-chip.status-approved {
        background-color: #d1fae5;
        color: #059669;
      }

      .status-chip.status-rejected {
        background-color: #fee2e2;
        color: #dc2626;
      }

      .status-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
      }

      .action-buttons {
        display: flex;
        gap: 8px;
        align-items: center;
      }

      .approve-btn {
        border-radius: 8px;
        font-weight: 600;
        padding: 8px 16px;
        font-size: 13px;
      }

      .approve-btn:not([disabled]) {
        background: linear-gradient(135deg, #059669 0%, #10b981 100%);
        box-shadow: 0 2px 4px rgb(5 150 105 / 0.3);
      }

      .approve-btn:not([disabled]):hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 8px rgb(5 150 105 / 0.4);
      }

      .help-btn {
        color: #6b7280;
      }

      .help-btn:hover {
        color: #374151;
        background-color: #f3f4f6;
      }

      .modern-paginator {
        border-top: 1px solid #e2e8f0;
        background: #f8fafc;
      }

      ::ng-deep .mat-mdc-form-field-outline {
        border-radius: 8px;
      }

      ::ng-deep .mat-mdc-select-panel {
        border-radius: 8px;
      }
    `,
  ],
})
export class ClaimsComponent implements OnInit, OnDestroy {
  private claims = [] as ClaimItem[];
  data = new MatTableDataSource<ClaimItem>([]);
  cols = ["id", "claimant", "amount", "status", "actions"];
  canApprove = false;
  private permTimer: any;

  search = new FormControl("");
  status = new FormControl("");

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  private dialog = inject(MatDialog);

  constructor(
    private svc: ClaimsService,
    private snack: SnackbarService,
    private rbac: RbacService,
    private logging: LoggingService
  ) {}

  async ngOnInit() {
    this.refresh();
    await this.rbac.profile();
    this.canApprove = await this.rbac.can("claims.approve");

    this.search.valueChanges
      ?.pipe(debounceTime(200), distinctUntilChanged())
      .subscribe(() => this.applyFilters());
    this.status.valueChanges?.subscribe(() => this.applyFilters());

    // Poll RBAC permission to reflect role changes in near real-time
    this.permTimer = setInterval(async () => {
      try {
        const allowed = await this.rbac.can("claims.approve");
        if (allowed !== this.canApprove) {
          this.canApprove = allowed;
        }
      } catch {}
    }, 15000);
  }

  ngOnDestroy() {
    if (this.permTimer) clearInterval(this.permTimer);
  }

  refresh() {
    this.svc.list().subscribe(
      list => {
        this.claims = list || [];
        this.data = new MatTableDataSource(this.claims);
        if (this.paginator) this.data.paginator = this.paginator;
        if (this.sort) this.data.sort = this.sort;
        this.applyFilters();
      },
      err => {
        this.snack.error(err?.error?.message || "Failed to load claims");
      }
    );
  }

  applyFilters() {
    const q = (this.search.value || "").toLowerCase();
    const st = (this.status.value || "").toLowerCase();
    const filtered = this.claims.filter(c => {
      const matchesText = !q || `${c.id} ${c.claimant} ${c.amount}`.toLowerCase().includes(q);
      const matchesStatus = !st || c.status === st;
      return matchesText && matchesStatus;
    });
    this.data.data = filtered;
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case "open":
        return "radio_button_unchecked";
      case "pending":
        return "schedule";
      case "approved":
        return "check_circle";
      case "rejected":
        return "cancel";
      default:
        return "help";
    }
  }

  approve(c: ClaimItem) {
    this.svc.approve(c.id).subscribe({
      next: () => {
        c.status = "approved";
        this.applyFilters();
        this.snack.success("Claim approved");
        this.logging
          .send("info", "Claim approved", { category: "claims", metadata: { id: c.id } })
          .subscribe({ error: () => {} });
      },
      error: err => {
        if (err?.status === 403) this.snack.error("Permission denied");
        else this.snack.error(err?.error?.message || "Failed to approve");
      },
    });
  }

  async whyDenied() {
    try {
      const res = await this.rbac.explain("claims", "approve");
      this.dialog.open(ExplainDialog, { data: res });
    } catch (e: any) {
      this.snack.error(e?.message || "Failed to explain");
    }
  }
}

@Component({
  standalone: true,
  selector: "explain-dialog",
  template: `
    <div class="explain-dialog">
      <h2 mat-dialog-title class="dialog-title">
        <mat-icon>security</mat-icon>
        Permission Check
      </h2>
      <div mat-dialog-content class="dialog-content">
        <div *ngIf="data as d" class="permission-info">
          <div class="evaluation-result">
            <strong>Evaluated:</strong> {{ d?.details?.evaluated }}
          </div>
          <div
            class="access-status"
            [class.granted]="d?.hasPermission"
            [class.denied]="!d?.hasPermission"
          >
            <mat-icon>{{ d?.hasPermission ? "check_circle" : "cancel" }}</mat-icon>
            <span *ngIf="d?.hasPermission">Access granted via roles:</span>
            <span *ngIf="!d?.hasPermission">Access denied. No matching roles found.</span>
          </div>
          <ul *ngIf="d?.details?.matchedRoles?.length" class="roles-list">
            <li *ngFor="let r of d?.details?.matchedRoles" class="role-item">
              <mat-icon>account_circle</mat-icon>
              {{ r.name }}
            </li>
          </ul>
        </div>
      </div>
      <div mat-dialog-actions class="dialog-actions">
        <button mat-raised-button mat-dialog-close color="primary">
          <mat-icon>close</mat-icon>
          Close
        </button>
      </div>
    </div>
  `,
  styles: [
    `
      .explain-dialog {
        min-width: 400px;
      }

      .dialog-title {
        display: flex;
        align-items: center;
        gap: 8px;
        color: #1e293b;
        font-weight: 600;
      }

      .dialog-content {
        padding: 16px 0;
      }

      .permission-info {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      .evaluation-result {
        padding: 12px;
        background-color: #f8fafc;
        border-radius: 8px;
        border-left: 4px solid #6366f1;
      }

      .access-status {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 12px;
        border-radius: 8px;
        font-weight: 500;
      }

      .access-status.granted {
        background-color: #f0fdf4;
        color: #166534;
        border: 1px solid #bbf7d0;
      }

      .access-status.denied {
        background-color: #fef2f2;
        color: #991b1b;
        border: 1px solid #fecaca;
      }

      .roles-list {
        list-style: none;
        padding: 0;
        margin: 0;
      }

      .role-item {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        background-color: #f1f5f9;
        border-radius: 6px;
        margin-bottom: 4px;
        font-weight: 500;
      }

      .dialog-actions {
        justify-content: flex-end;
        padding-top: 16px;
      }
    `,
  ],
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
})
export class ExplainDialog {
  data = inject(MAT_DIALOG_DATA);
}
