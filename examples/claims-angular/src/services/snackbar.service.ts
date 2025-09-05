import { Injectable } from "@angular/core";
import { MatSnackBar } from "@angular/material/snack-bar";

@Injectable({ providedIn: "root" })
export class SnackbarService {
  constructor(private snack: MatSnackBar) {}

  success(message: string) {
    this.snack.open(message, "OK", { duration: 2500, panelClass: ["snackbar-success"] });
  }

  error(message: string) {
    this.snack.open(message, "Dismiss", { duration: 4000, panelClass: ["snackbar-error"] });
  }

  info(message: string) {
    this.snack.open(message, undefined, { duration: 2000 });
  }
}
