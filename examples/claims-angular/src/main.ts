import "zone.js";
// Fragment token bootstrap: if redirected with #token=...&tenant=..., extract token early
import { setToken } from "@saas-framework/auth-client";
(() => {
  try {
    if (typeof window !== "undefined" && window.location.hash.startsWith("#")) {
      const hash = new URLSearchParams(window.location.hash.substring(1));
      const fragToken = hash.get("token");
      if (fragToken) {
        setToken(fragToken);
        // Clean the hash to avoid exposing JWT in later navigations / referrers
        const cleanUrl = window.location.pathname + window.location.search;
        window.history.replaceState({}, document.title, cleanUrl);
        console.log("[claims-angular] Token captured from fragment and stored.");
      }
    }
  } catch (e) {
    console.warn("[claims-angular] Failed to process fragment token", e);
  }
})();
import { bootstrapApplication } from "@angular/platform-browser";
import { provideAnimations } from "@angular/platform-browser/animations";
import { importProvidersFrom } from "@angular/core";
import { provideHttpClient } from "@angular/common/http";
import { MatSnackBarModule } from "@angular/material/snack-bar";
import { MatDialogModule } from "@angular/material/dialog";
import { provideRouter, Routes, CanActivateFn } from "@angular/router";
import { AppComponent } from "./app/app.component";
import { getToken } from "@saas-framework/auth-client";

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

bootstrapApplication(AppComponent, {
  providers: [
    provideAnimations(),
    provideRouter(routes),
    provideHttpClient(),
    importProvidersFrom(MatSnackBarModule, MatDialogModule),
  ],
}).catch(err => console.error(err));
