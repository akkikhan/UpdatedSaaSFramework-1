import { Component, OnInit, ViewChild } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { MatCardModule } from "@angular/material/card";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatButtonModule } from "@angular/material/button";
import { MatSelectModule } from "@angular/material/select";
import { MatIconModule } from "@angular/material/icon";
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
    MatSelectModule,
    MatIconModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
  ],
  template: `
    <div class="logs-header">
      <h1 class="page-title">
        <mat-icon class="page-icon">list_alt</mat-icon>
        System Logs
      </h1>
      <p class="page-subtitle">Monitor application activity and debug issues</p>
    </div>

    <div class="logs-container">
      <div class="logs-config-section">
        <div class="config-group">
          <mat-form-field appearance="outline" class="api-key-field">
            <mat-label>Logging API Key</mat-label>
            <input matInput [(ngModel)]="apiKey" placeholder="logging_..." type="password" />
            <mat-icon matPrefix>vpn_key</mat-icon>
          </mat-form-field>
          <button mat-raised-button color="primary" (click)="saveKey()" class="save-btn">
            <mat-icon>save</mat-icon>
            Save Key
          </button>
        </div>
      </div>

      <div class="log-actions-section">
        <div class="action-group">
          <mat-form-field appearance="outline" class="message-field">
            <mat-label>Log Message</mat-label>
            <input matInput [(ngModel)]="message" placeholder="Enter log message..." />
            <mat-icon matPrefix>message</mat-icon>
          </mat-form-field>

          <mat-form-field appearance="outline" class="level-field">
            <mat-label>Log Level</mat-label>
            <mat-select [(ngModel)]="level">
              <mat-option value="info">
                <mat-icon class="level-icon info">info</mat-icon>
                Info
              </mat-option>
              <mat-option value="warning">
                <mat-icon class="level-icon warning">warning</mat-icon>
                Warning
              </mat-option>
              <mat-option value="error">
                <mat-icon class="level-icon error">error</mat-icon>
                Error
              </mat-option>
            </mat-select>
          </mat-form-field>

          <button mat-raised-button color="accent" (click)="sendLog()" class="send-btn">
            <mat-icon>send</mat-icon>
            Send Log
          </button>

          <button mat-stroked-button (click)="loadLogs()" class="refresh-btn">
            <mat-icon>refresh</mat-icon>
            Refresh
          </button>
        </div>
      </div>

      <div class="table-container">
        <table mat-table [dataSource]="data" matSort class="logs-table">
          <ng-container matColumnDef="createdAt">
            <th mat-header-cell *matHeaderCellDef mat-sort-header>Timestamp</th>
            <td mat-cell *matCellDef="let r" class="timestamp-cell">
              <div class="timestamp">
                <mat-icon class="time-icon">schedule</mat-icon>
                {{ (r.createdAt | date: "MMM d, y, h:mm:ss a") || "Unknown time" }}
              </div>
            </td>
          </ng-container>

          <ng-container matColumnDef="level">
            <th mat-header-cell *matHeaderCellDef mat-sort-header>Level</th>
            <td mat-cell *matCellDef="let r" class="level-cell">
              <div class="level-badge level-{{ r.level || 'unknown' }}">
                <mat-icon class="level-badge-icon">{{ getLevelIcon(r.level || "info") }}</mat-icon>
                {{ r.level || "unknown" | titlecase }}
              </div>
            </td>
          </ng-container>

          <ng-container matColumnDef="eventType">
            <th mat-header-cell *matHeaderCellDef mat-sort-header>Category</th>
            <td mat-cell *matCellDef="let r" class="category-cell">
              <div class="category-tag" *ngIf="r.eventType">
                <mat-icon>category</mat-icon>
                {{ r.eventType }}
              </div>
              <span *ngIf="!r.eventType" class="no-category">—</span>
            </td>
          </ng-container>

          <ng-container matColumnDef="message">
            <th mat-header-cell *matHeaderCellDef>Message</th>
            <td mat-cell *matCellDef="let r" class="message-cell">
              <div class="log-message">{{ r.message || "No message" }}</div>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="cols" class="table-header"></tr>
          <tr
            mat-row
            *matRowDef="let row; columns: cols"
            class="table-row"
            [class.error-row]="row.level === 'error'"
            [class.warning-row]="row.level === 'warning'"
          ></tr>
        </table>

        <mat-paginator
          [pageSize]="10"
          [pageSizeOptions]="[10, 25, 50, 100]"
          showFirstLastButtons
          class="logs-paginator"
        >
        </mat-paginator>

        <div *ngIf="!data.data.length" class="empty-state">
          <mat-icon class="empty-icon">inbox</mat-icon>
          <h3>No logs to display</h3>
          <p>Configure your API key and start logging to see entries here.</p>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .logs-header {
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

      .logs-container {
        background: white;
        border-radius: 16px;
        box-shadow:
          0 1px 3px 0 rgb(0 0 0 / 0.1),
          0 1px 2px -1px rgb(0 0 0 / 0.1);
        overflow: hidden;
      }

      .logs-config-section,
      .log-actions-section {
        padding: 20px 24px;
        border-bottom: 1px solid #e2e8f0;
        background: #f8fafc;
      }

      .config-group,
      .action-group {
        display: flex;
        gap: 16px;
        align-items: flex-end;
        flex-wrap: wrap;
      }

      .api-key-field,
      .message-field {
        min-width: 300px;
        flex: 1;
      }

      .level-field {
        min-width: 180px;
      }

      .save-btn,
      .send-btn {
        border-radius: 8px;
        font-weight: 600;
      }

      .refresh-btn {
        border-radius: 8px;
      }

      .level-icon {
        margin-right: 8px;
        font-size: 18px;
      }

      .level-icon.info {
        color: #2563eb;
      }
      .level-icon.warning {
        color: #d97706;
      }
      .level-icon.error {
        color: #dc2626;
      }

      .table-container {
        overflow-x: auto;
      }

      .logs-table {
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

      .table-row.error-row {
        border-left: 4px solid #dc2626;
      }

      .table-row.warning-row {
        border-left: 4px solid #d97706;
      }

      .timestamp-cell {
        font-family: "Courier New", monospace;
        font-size: 13px;
      }

      .timestamp {
        display: flex;
        align-items: center;
        gap: 6px;
        color: #6b7280;
      }

      .time-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
      }

      .level-badge {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 6px 12px;
        border-radius: 12px;
        font-weight: 600;
        font-size: 12px;
        min-width: 80px;
        justify-content: center;
      }

      .level-badge.level-info {
        background: #dbeafe;
        color: #1d4ed8;
      }

      .level-badge.level-warning {
        background: #fef3c7;
        color: #d97706;
      }

      .level-badge.level-error {
        background: #fee2e2;
        color: #dc2626;
      }

      .level-badge-icon {
        font-size: 14px;
        width: 14px;
        height: 14px;
      }

      .category-tag {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 4px 8px;
        background: #f1f5f9;
        border-radius: 6px;
        font-size: 12px;
        font-weight: 500;
        color: #475569;
      }

      .no-category {
        color: #9ca3af;
        font-style: italic;
      }

      .log-message {
        font-family: "Consolas", "Monaco", "Courier New", monospace;
        font-size: 14px;
        color: #374151;
        line-height: 1.5;
        max-width: 400px;
        word-break: break-word;
      }

      .logs-paginator {
        border-top: 1px solid #e2e8f0;
        background: #f8fafc;
      }

      .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 48px 24px;
        text-align: center;
      }

      .empty-icon {
        font-size: 64px;
        width: 64px;
        height: 64px;
        color: #d1d5db;
        margin-bottom: 16px;
      }

      .empty-state h3 {
        color: #374151;
        margin: 0 0 8px 0;
        font-weight: 600;
      }

      .empty-state p {
        color: #6b7280;
        margin: 0;
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

  getLevelIcon(level: string): string {
    switch (level) {
      case "info":
        return "info";
      case "warning":
        return "warning";
      case "error":
        return "error";
      default:
        return "help";
    }
  }
}
