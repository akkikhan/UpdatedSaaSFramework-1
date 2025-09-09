import { Component, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { MatCardModule } from "@angular/material/card";
import { MatIconModule } from "@angular/material/icon";
import { LoggingService } from "../services/logging.service";

@Component({
  standalone: true,
  selector: "app-activity-dashboard",
  imports: [CommonModule, MatCardModule, MatIconModule],
  template: `
    <h1 class="page-title">
      <mat-icon class="page-icon">insights</mat-icon>
      Activity Dashboard
    </h1>
    <div class="stats">
      <mat-card class="stat" *ngFor="let s of stats">
        <h3>{{ s.label }}</h3>
        <p class="count">{{ s.count }}</p>
      </mat-card>
    </div>
  `,
  styles: [
    `
      .page-title {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 24px;
      }
      .stats {
        display: flex;
        gap: 16px;
      }
      .stat {
        flex: 1;
        text-align: center;
      }
      .count {
        font-size: 32px;
        margin: 0;
      }
    `,
  ],
})
export class ActivityDashboardComponent implements OnInit {
  stats = [
    { label: "Info", count: 0 },
    { label: "Warning", count: 0 },
    { label: "Error", count: 0 },
  ];

  constructor(private logging: LoggingService) {}

  ngOnInit() {
    this.load();
  }

  load() {
    this.logging.query({ limit: 100 }).subscribe(rows => {
      const counts: any = { info: 0, warning: 0, error: 0 };
      for (const r of rows || []) {
        if (counts[r.level] !== undefined) counts[r.level]++;
      }
      this.stats = [
        { label: "Info", count: counts.info },
        { label: "Warning", count: counts.warning },
        { label: "Error", count: counts.error },
      ];
    });
  }
}
