import { Component, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { MatCardModule } from "@angular/material/card";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatButtonModule } from "@angular/material/button";
import { MatListModule } from "@angular/material/list";
import { MatIconModule } from "@angular/material/icon";
import { RbacService } from "../services/rbac.service";

@Component({
  standalone: true,
  selector: "app-rbac",
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatListModule,
    MatIconModule,
  ],
  template: `
    <h1 class="page-title">
      <mat-icon class="page-icon">security</mat-icon>
      Role Management
    </h1>

    <mat-card class="create-card">
      <h3>Create Role</h3>
      <form (ngSubmit)="create()" class="create-form">
        <mat-form-field appearance="outline">
          <mat-label>Name</mat-label>
          <input matInput [(ngModel)]="name" name="name" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Permissions (comma separated)</mat-label>
          <input matInput [(ngModel)]="perms" name="perms" />
        </mat-form-field>
        <button mat-raised-button color="primary">Create</button>
      </form>
    </mat-card>

    <mat-card>
      <h3>Existing Roles</h3>
      <mat-list>
        <mat-list-item *ngFor="let r of roles">
          <mat-icon matListIcon>verified_user</mat-icon>
          <div matLine>{{ r.name }}</div>
          <div matLine class="secondary">{{ r.permissions.join(', ') }}</div>
        </mat-list-item>
      </mat-list>
    </mat-card>
  `,
  styles: [
    `
      .page-title {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 24px;
      }
      .create-form {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .secondary {
        font-size: 12px;
        color: #64748b;
      }
    `,
  ],
})
export class RbacComponent implements OnInit {
  roles: any[] = [];
  name = "";
  perms = "";

  constructor(private rbac: RbacService) {}

  ngOnInit() {
    this.load();
  }

  load() {
    this.rbac.listRoles().subscribe(rows => (this.roles = rows || []));
  }

  create() {
    const permissions = this.perms
      .split(",")
      .map(p => p.trim())
      .filter(p => p);
    if (!this.name) return;
    this.rbac.createRole(this.name, permissions).subscribe(() => {
      this.name = "";
      this.perms = "";
      this.load();
    });
  }
}
