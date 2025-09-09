import "zone.js";
import { bootstrapApplication } from "@angular/platform-browser";
import { provideAnimations } from "@angular/platform-browser/animations";
import { importProvidersFrom } from "@angular/core";
import { provideHttpClient } from "@angular/common/http";
import { MatSnackBarModule } from "@angular/material/snack-bar";
import { MatDialogModule } from "@angular/material/dialog";
import { provideRouter, Routes, CanActivateFn } from "@angular/router";
import { AppComponent } from "./app/app.component";
import { getToken, setToken } from "@saas-framework/auth-client";

const canActivate: CanActivateFn = () => !!getToken();

export const routes: Routes = [
  {
    path: "login",
    loadComponent: () => import("./pages/login.component").then(m => m.LoginComponent),
  },
  {
    path: "dashboard",
    canActivate: [canActivate],
    loadComponent: () => import("./pages/dashboard.component").then(m => m.DashboardComponent),
  },
  {
    path: "claims",
    canActivate: [canActivate],
    loadComponent: () => import("./pages/claims.component").then(m => m.ClaimsComponent),
  },
  {
    path: "logs",
    canActivate: [canActivate],
    loadComponent: () => import("./pages/logs.component").then(m => m.LogsComponent),
  },
  {
    path: "profile",
    canActivate: [canActivate],
    loadComponent: () => import("./pages/profile.component").then(m => m.ProfileComponent),
  },
  { path: "", pathMatch: "full", redirectTo: "dashboard" },
  { path: "**", redirectTo: "dashboard" },
];

// Capture token from URL if Azure callback redirected here
(() => {
  try {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    if (token) {
      setToken(token);
      localStorage.setItem("tenant_token", token);
      // Clean URL params, keep the path
      const clean = window.location.pathname;
      window.history.replaceState({}, document.title, clean);
    }
  } catch {}
})();

bootstrapApplication(AppComponent, {
  providers: [
    provideAnimations(),
    provideRouter(routes),
    provideHttpClient(),
    importProvidersFrom(MatSnackBarModule, MatDialogModule),
  ],
}).catch(err => console.error(err));
