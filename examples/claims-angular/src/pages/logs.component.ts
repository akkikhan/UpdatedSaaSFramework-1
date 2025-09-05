import { Component, OnInit, ViewChild } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { MatCardModule } from "@angular/material/card";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatButtonModule } from "@angular/material/button";
import { MatTableDataSource, MatTableModule } from "@angular/material/table";
import { MatPaginator, MatPaginatorModule } from "@angular/material/paginator";
import { MatSort, MatSortModule } from "@angular/material/sort";
import { LoggingService } from "../services/logging.service";
import { SnackbarService } from "../services/snackbar.service";

interface LogRow {
  id?: string;
  createdAt?: string;
  level: string;
  eventType?: string;
  message: string;
}

@Component({
  standalone: true,
  selector: "app-logs",
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
  ],
  template: `
    <mat-card>
      <mat-card-title>Logging</mat-card-title>
      <mat-card-content>
        <div style="display:flex;gap:12px;align-items:flex-end;flex-wrap:wrap;margin-bottom:12px">
          <mat-form-field appearance="outline" style="min-width:320px">
            <mat-label>Logging API Key</mat-label>
            <input matInput [(ngModel)]="apiKey" placeholder="logging_..." />
          </mat-form-field>
          <button mat-stroked-button color="primary" (click)="saveKey()">Save</button>
        </div>
        <div style="display:flex;gap:12px;align-items:flex-end;flex-wrap:wrap;margin-bottom:12px">
          <mat-form-field appearance="outline" style="min-width:220px">
            <mat-label>Message</mat-label>
            <input matInput [(ngModel)]="message" />
          </mat-form-field>
          <mat-form-field appearance="outline" style="width:150px">
            <mat-label>Level</mat-label>
            <select matNativeControl [(ngModel)]="level">
              <option value="info">info</option>
              <option value="warning">warning</option>
              <option value="error">error</option>
            </select>
          </mat-form-field>
          <button mat-raised-button color="primary" (click)="sendLog()">Send</button>
          <button mat-stroked-button (click)="loadLogs()">Refresh</button>
        </div>
        <table mat-table [dataSource]="data" matSort>
          <ng-container matColumnDef="createdAt">
            <th mat-header-cell *matHeaderCellDef mat-sort-header>Time</th>
            <td mat-cell *matCellDef="let r">{{ r.createdAt }}</td>
          </ng-container>
          <ng-container matColumnDef="level">
            <th mat-header-cell *matHeaderCellDef mat-sort-header>Level</th>
            <td mat-cell *matCellDef="let r">{{ r.level }}</td>
          </ng-container>
          <ng-container matColumnDef="eventType">
            <th mat-header-cell *matHeaderCellDef mat-sort-header>Category</th>
            <td mat-cell *matCellDef="let r">{{ r.eventType }}</td>
          </ng-container>
          <ng-container matColumnDef="message">
            <th mat-header-cell *matHeaderCellDef>Message</th>
            <td mat-cell *matCellDef="let r">{{ r.message }}</td>
          </ng-container>
          <tr mat-header-row *matHeaderRowDef="cols"></tr>
          <tr mat-row *matRowDef="let row; columns: cols"></tr>
        </table>
        <mat-paginator [pageSize]="10"></mat-paginator>
        <div *ngIf="!data.data.length" class="muted" style="margin-top:12px">
          No logs to display.
        </div>
      </mat-card-content>
    </mat-card>
  `,
})
export class LogsComponent implements OnInit {
  apiKey = localStorage.getItem("claims_logging_key") || "";
  message = "";
  level: "info" | "warning" | "error" = "info";

  data = new MatTableDataSource<LogRow>([]);
  cols = ["createdAt", "level", "eventType", "message"];
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(
    private logging: LoggingService,
    private snack: SnackbarService
  ) {}

  ngOnInit() {
    this.loadLogs();
  }

  saveKey() {
    this.logging.setApiKey(this.apiKey.trim());
  }

  sendLog() {
    if (!this.message.trim()) return;
    this.logging.send(this.level, this.message.trim(), { category: "demo" }).subscribe({
      next: () => {
        this.snack.success("Log sent");
        this.message = "";
        this.loadLogs();
      },
      error: e => this.snack.error(e?.error?.message || "Failed to send log"),
    });
  }

  loadLogs() {
    this.logging.query({ limit: 50 }).subscribe({
      next: (rows: any[]) => {
        const mapped: LogRow[] = (rows || []).map(r => ({
          id: r.id,
          createdAt: r.createdAt,
          level: r.level,
          eventType: r.eventType,
          message: r.message,
        }));
        this.data = new MatTableDataSource<LogRow>(mapped);
        if (this.paginator) this.data.paginator = this.paginator;
        if (this.sort) this.data.sort = this.sort;
      },
      error: e => this.snack.error(e?.error?.message || "Failed to load logs"),
    });
  }
}
