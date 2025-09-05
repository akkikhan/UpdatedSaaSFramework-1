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
  ],
  template: `
    <mat-card>
      <mat-card-title>Claims</mat-card-title>
      <mat-card-content>
        <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin-bottom:12px">
          <mat-form-field appearance="outline" style="width:260px">
            <mat-label>Search</mat-label>
            <input matInput [formControl]="search" placeholder="Find by claimant, id..." />
          </mat-form-field>
          <mat-form-field appearance="outline" style="width:180px">
            <mat-label>Status</mat-label>
            <mat-select [formControl]="status">
              <mat-option value="">All</mat-option>
              <mat-option value="open">Open</mat-option>
              <mat-option value="pending">Pending</mat-option>
              <mat-option value="approved">Approved</mat-option>
              <mat-option value="rejected">Rejected</mat-option>
            </mat-select>
          </mat-form-field>
        </div>
        <table mat-table [dataSource]="data" matSort>
          <ng-container matColumnDef="id">
            <th mat-header-cell *matHeaderCellDef mat-sort-header>ID</th>
            <td mat-cell *matCellDef="let c">{{ c.id }}</td>
          </ng-container>
          <ng-container matColumnDef="claimant">
            <th mat-header-cell *matHeaderCellDef mat-sort-header>Claimant</th>
            <td mat-cell *matCellDef="let c">{{ c.claimant }}</td>
          </ng-container>
          <ng-container matColumnDef="amount">
            <th mat-header-cell *matHeaderCellDef mat-sort-header>Amount</th>
            <td mat-cell *matCellDef="let c">{{ c.amount | currency }}</td>
          </ng-container>
          <ng-container matColumnDef="status">
            <th mat-header-cell *matHeaderCellDef mat-sort-header>Status</th>
            <td mat-cell *matCellDef="let c">{{ c.status }}</td>
          </ng-container>
          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef></th>
            <td mat-cell *matCellDef="let c">
              <button
                mat-stroked-button
                color="primary"
                (click)="approve(c)"
                [disabled]="!canApprove || c.status !== 'pending'"
                [matTooltip]="!canApprove ? 'Permission required: claims.approve' : ''"
              >
                <mat-icon>check_circle</mat-icon>
                Approve
              </button>
              <button
                mat-icon-button
                *ngIf="!canApprove"
                (click)="whyDenied()"
                aria-label="Why denied?"
                title="Why denied?"
              >
                <mat-icon>help_outline</mat-icon>
              </button>
            </td>
          </ng-container>
          <tr mat-header-row *matHeaderRowDef="cols"></tr>
          <tr mat-row *matRowDef="let row; columns: cols"></tr>
        </table>
        <mat-paginator [pageSize]="10"></mat-paginator>
      </mat-card-content>
    </mat-card>
  `,
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
    const profile = await this.rbac.profile();
    this.canApprove = await this.rbac.can("claims.approve", profile || undefined);

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
    <h2 mat-dialog-title>Permission Check</h2>
    <div mat-dialog-content>
      <div *ngIf="data as d">
        <p>
          Evaluated: <b>{{ d?.details?.evaluated }}</b>
        </p>
        <p *ngIf="d?.hasPermission">Access granted via roles:</p>
        <p *ngIf="!d?.hasPermission">Access denied. Matching roles: none.</p>
        <ul>
          <li *ngFor="let r of d?.details?.matchedRoles">{{ r.name }}</li>
        </ul>
      </div>
    </div>
    <div mat-dialog-actions>
      <button mat-button mat-dialog-close>Close</button>
    </div>
  `,
  imports: [CommonModule, MatDialogModule, MatButtonModule],
})
export class ExplainDialog {
  data = inject(MAT_DIALOG_DATA);
}
